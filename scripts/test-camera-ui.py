#!/usr/bin/env python3
"""Real-browser camera workflow against a disposable PostGIS database.
Run with a Python that has Playwright installed and Chromium available.
Requires backend/.venv, frontend/node_modules and TEST_DATABASE_URL or --env-file.
Never starts against or truncates the business database.
"""

import argparse
import json
import os
import re
import secrets
import shutil
import socket
import subprocess
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

REPO = Path(__file__).resolve().parents[1]
PYTHON = str(REPO / "backend/.venv/bin/python")
BACKEND = REPO / "backend"
with socket.socket() as test_socket:
    test_socket.bind(("127.0.0.1", 0))
    WEB_PORT = test_socket.getsockname()[1]


def command(code, env):
    return subprocess.run(
        [PYTHON, "-c", code], cwd=BACKEND, env=env, check=True, capture_output=True
    )


def ready(url, process):
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError("Test server exited; see work/camera-ui-*.log")
        try:
            with urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except OSError:
            pass
        time.sleep(0.2)
    raise RuntimeError("Test server did not become ready")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file")
    args = parser.parse_args()
    env = os.environ.copy()
    if args.env_file:
        values = dict(
            line.split("=", 1)
            for line in Path(args.env_file).read_text().splitlines()
            if line and not line.startswith("#")
        )
        env["TEST_DATABASE_URL"] = (
            "postgresql+psycopg://"
            + quote(values["POSTGRES_USER"], safe="")
            + ":"
            + quote(values["POSTGRES_PASSWORD"], safe="")
            + "@127.0.0.1:55432/postgres"
        )
    if not env.get("TEST_DATABASE_URL"):
        raise RuntimeError("TEST_DATABASE_URL or --env-file is required")
    for port in (8000, WEB_PORT):
        with socket.socket() as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(("127.0.0.1", port))
    name = "wildlife_test_ui_" + uuid.uuid4().hex[:16]
    env.update(
        UI_TEST_DATABASE=name,
        ADMIN_USERNAME="ui-admin",
        ADMIN_PASSWORD=secrets.token_urlsafe(24),
        AUTH_SECRET=secrets.token_urlsafe(48),
    )
    code = """
import os
import sqlalchemy as sa
from sqlalchemy.engine import make_url
url = make_url(os.environ['TEST_DATABASE_URL'])
name = os.environ['UI_TEST_DATABASE']
engine = sa.create_engine(url.set(database='postgres'), isolation_level='AUTOCOMMIT')
with engine.connect() as conn:
    conn.exec_driver_sql('CREATE DATABASE "' + name + '"')
print(url.set(database=name).render_as_string(hide_password=False))
engine.dispose()
"""
    env["DATABASE_URL"] = command(code, env).stdout.decode().strip()
    processes = []
    work = REPO / "work"
    work.mkdir(exist_ok=True)
    try:
        subprocess.run(
            [str(BACKEND / ".venv/bin/alembic"), "upgrade", "head"],
            cwd=BACKEND,
            env=env,
            check=True,
            capture_output=True,
        )
        command("from app.cli import main; main()", env)
        with (
            (work / "camera-ui-api.log").open("w") as api_log,
            (work / "camera-ui-web.log").open("w") as web_log,
        ):
            api = subprocess.Popen(
                [
                    PYTHON,
                    "-m",
                    "uvicorn",
                    "app.main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "8000",
                ],
                cwd=BACKEND,
                env=env,
                stdout=api_log,
                stderr=subprocess.STDOUT,
            )
            processes.append(api)
            web = subprocess.Popen(
                [
                    "node",
                    str(REPO / "frontend/node_modules/vite/bin/vite.js"),
                    "--host",
                    "127.0.0.1",
                    "--port",
                    str(WEB_PORT),
                    "--strictPort",
                ],
                cwd=REPO / "frontend",
                env=env,
                stdout=web_log,
                stderr=subprocess.STDOUT,
            )
            processes.append(web)
            ready("http://127.0.0.1:8000/api/health", api)
            ready(f"http://127.0.0.1:{WEB_PORT}", web)
            run_browser(env, work)
    finally:
        for process in reversed(processes):
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        command(
            """
import os
import sqlalchemy as sa
from sqlalchemy.engine import make_url
engine = sa.create_engine(make_url(os.environ['TEST_DATABASE_URL']).set(database='postgres'), isolation_level='AUTOCOMMIT')
with engine.connect() as conn:
    conn.exec_driver_sql('DROP DATABASE "' + os.environ['UI_TEST_DATABASE'] + '" WITH (FORCE)')
engine.dispose()
""",
            env,
        )


def run_browser(env, work):
    with sync_playwright() as p:
        executable = os.environ.get("CHROMIUM_PATH") or shutil.which("chromium")
        browser = p.chromium.launch(
            executable_path=executable, headless=True, args=["--no-sandbox"]
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 1000}, timezone_id="Asia/Shanghai"
        )
        page = context.new_page()
        page.set_default_timeout(10000)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"http://127.0.0.1:{WEB_PORT}")
        page.get_by_label("用户名").fill("ui-admin")
        page.get_by_label("密码", exact=True).fill(env["ADMIN_PASSWORD"])
        page.get_by_role("button", name="登录平台").click()
        expect(page.get_by_role("heading", name="监测概览", exact=True)).to_be_visible()
        page.get_by_role("button", name="相机位点", exact=True).click()
        page.get_by_role("button", name="新增位点", exact=True).click()
        form = page.get_by_role("region", name="记录编辑表单")
        form.get_by_label("位点编号 *", exact=True).fill("UI701")
        form.get_by_label("所属区域 *", exact=True).fill("测试北区")
        form.get_by_label("布设类型 *", exact=True).select_option("paired")
        form.get_by_label("经度（WGS84）（可选）", exact=True).fill("112.5")
        form.get_by_label("纬度（WGS84）（可选）", exact=True).fill("37.5")
        form.get_by_label("首次布设时间（可选）", exact=True).fill("2026-01-01T08:00")
        form.get_by_label("海拔（米）（可选）", exact=True).fill("1200.5")
        form.get_by_label("地形（可选）", exact=True).fill("山脊")
        form.get_by_label("植被（可选）", exact=True).fill("灌丛")
        form.get_by_label("环境属性（可选）", exact=True).fill("兽径")
        form.get_by_role("button", name="保存记录", exact=True).click()
        expect(page.get_by_role("cell", name="UI701", exact=True)).to_be_visible()
        expect(page.get_by_role("img", name="当前页位点经纬度分布")).to_be_visible()
        page.get_by_role("button", name="编辑", exact=True).click()
        form.get_by_label("备注（可选）", exact=True).fill("巡检确认")
        form.get_by_role("button", name="保存记录", exact=True).click()
        expect(page.get_by_role("status").filter(has_text="记录已保存")).to_be_visible()
        page.get_by_label("搜索", exact=True).fill("不存在")
        page.get_by_role("button", name="查询", exact=True).click()
        expect(page.get_by_text("没有符合条件的记录。", exact=True)).to_be_visible()
        page.get_by_role("button", name="重置", exact=True).click()
        expect(page.get_by_role("cell", name="UI701", exact=True)).to_be_visible()
        page.get_by_role("button", name="查看周期", exact=True).click()
        page.get_by_role("button", name="新增工作周期", exact=True).click()
        form = page.get_by_role("region", name="记录编辑表单")
        expect(form.get_by_label("位点 *", exact=True)).not_to_have_value("")
        form.get_by_label("相机编号（如 701A / 701B） *", exact=True).fill("UI701A")
        form.get_by_label("相机型号（可选）", exact=True).fill("Test model")
        form.get_by_label("回收批次（YYYYMM，如 202608） *", exact=True).fill("202608")
        form.get_by_label("数据回收状态 *", exact=True).select_option("not_retrieved")
        form.get_by_label("工作开始时间（可选）", exact=True).fill("2026-06-01T08:00")
        form.get_by_label("工作结束时间（可选）", exact=True).fill("2026-06-03T08:00")
        form.get_by_label("维护时间（可选）", exact=True).fill("2026-08-01T08:00")
        form.get_by_label("维护人员（可选）", exact=True).fill("测试员")
        form.get_by_label("异常类型（正常留空）（可选）", exact=True).fill("存储卡故障")
        form.get_by_role("button", name="保存记录", exact=True).click()
        expect(page.get_by_role("cell", name="UI701A", exact=True)).to_be_visible()
        expect(
            page.get_by_role("cell", name="UI701 · 测试北区", exact=True)
        ).to_be_visible()
        page.get_by_role("button", name="详情", exact=True).click()
        expect(
            page.get_by_role("definition").filter(
                has_text=re.compile(r"2026/6/1.*8:00:00")
            )
        ).to_be_visible()
        page.get_by_role("button", name="编辑", exact=True).click()
        expect(form.get_by_label("工作开始时间（可选）", exact=True)).to_have_value(
            "2026-06-01T08:00"
        )
        form.get_by_label("工作结束时间（可选）", exact=True).fill("2026-05-01T08:00")
        form.get_by_role("button", name="保存记录", exact=True).click()
        expect(page.get_by_role("alert")).to_have_text("工作结束时间不能早于开始时间")
        form.get_by_label("工作结束时间（可选）", exact=True).fill("2026-06-04T08:00")
        form.get_by_label("数据回收状态 *", exact=True).select_option("retrieved")
        form.get_by_label("数据回收时间（可选）", exact=True).fill("2026-08-01T08:00")
        form.get_by_label("异常类型（正常留空）（可选）", exact=True).fill("")
        form.get_by_role("button", name="保存记录", exact=True).click()
        expect(page.get_by_role("cell", name="已回收", exact=True)).to_be_visible()
        page.get_by_label("回收状态", exact=True).select_option("not_retrieved")
        page.get_by_role("button", name="查询", exact=True).click()
        expect(page.get_by_text("没有符合条件的记录。", exact=True)).to_be_visible()
        page.get_by_role("button", name="重置", exact=True).click()
        expect(page.get_by_role("cell", name="UI701A", exact=True)).to_be_visible()
        page.screenshot(path=str(work / "camera-cycles-desktop.png"), full_page=True)
        page.set_viewport_size({"width": 390, "height": 844})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (
            "Mobile page overflows horizontally"
        )
        page.screenshot(path=str(work / "camera-cycles-mobile.png"), full_page=True)
        # Check persisted data and seed additional rows for browser pagination with scoped viewers.
        login = context.request.post(
            "http://127.0.0.1:8000/api/auth/login",
            data={
                "username": "ui-admin",
                "password": env["ADMIN_PASSWORD"],
            },
        ).json()
        headers = {"Authorization": "Bearer " + login["token"]}
        sites = context.request.get(
            "http://127.0.0.1:8000/api/sites", headers=headers
        ).json()
        assert sites[0]["notes"] == "巡检确认"
        cycles = context.request.get(
            "http://127.0.0.1:8000/api/deployments", headers=headers
        ).json()
        assert datetime.fromisoformat(cycles[0]["work_start_at"]) == datetime(
            2026, 6, 1, tzinfo=UTC
        )
        stats = context.request.get(
            "http://127.0.0.1:8000/api/cameras/summary", headers=headers
        ).json()
        assert stats["recorded_interval_days"] == 3 and stats["issue_count"] == 0
        for index in range(11):
            response = context.request.post(
                "http://127.0.0.1:8000/api/sites",
                headers=headers,
                data={
                    "site_code": f"UI{index:03}",
                    "region": "测试北区",
                    "deployment_type": "single",
                },
            )
            assert response.status == 201
        response = context.request.post(
            "http://127.0.0.1:8000/api/sites",
            headers=headers,
            data={
                "site_code": "HIDDEN-SOUTH",
                "region": "测试南区",
                "deployment_type": "single",
            },
        )
        assert response.status == 201
        response = context.request.post(
            "http://127.0.0.1:8000/api/users",
            headers=headers,
            data={
                "username": "ui-viewer",
                "password": "ui-viewer-test-password",
                "regions": ["测试北区"],
            },
        )
        assert response.status == 201
        page.get_by_role("button", name="退出登录", exact=True).click()
        page.get_by_label("用户名").fill("ui-viewer")
        page.get_by_label("密码", exact=True).fill("ui-viewer-test-password")
        page.get_by_role("button", name="登录平台").click()
        page.get_by_role("button", name="相机位点", exact=True).click()
        expect(page.get_by_role("button", name="新增位点", exact=True)).to_have_count(0)
        expect(
            page.get_by_text("当前账号未获精确坐标查看权限。", exact=True)
        ).to_be_visible()
        expect(page.get_by_role("cell", name="HIDDEN-SOUTH", exact=True)).to_have_count(
            0
        )
        page.get_by_label("每页条数", exact=True).select_option("10")
        expect(page.get_by_text(re.compile("共 12 条 · 第 1 / 2 页"))).to_be_visible()
        page.get_by_role("button", name="下一页", exact=True).click()
        expect(page.get_by_text(re.compile("共 12 条 · 第 2 / 2 页"))).to_be_visible()
        expect(page.get_by_role("button", name="编辑", exact=True)).to_have_count(0)
        page.get_by_role("button", name="详情", exact=True).first.click()
        expect(page.get_by_text("记录详情", exact=True)).to_be_visible()
        expect(page.get_by_text("经度（WGS84）", exact=True)).to_have_count(0)
        assert not errors, errors
        browser.close()
        print(
            json.dumps(
                {
                    "result": "passed",
                    "checks": [
                        "site create/edit/map",
                        "cycle create/edit/detail",
                        "Asia/Shanghai time roundtrip",
                        "invalid interval feedback",
                        "filters/reset",
                        "summary totals",
                        "pagination",
                        "viewer controls and coordinate masking",
                        "mobile width",
                        "no browser exceptions",
                    ],
                },
                ensure_ascii=False,
            )
        )


if __name__ == "__main__":
    main()
