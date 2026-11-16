"""Camera management with scoped reads and transactional, audited corrections."""

import math
import re
import uuid
from datetime import UTC, datetime
from typing import Annotated, Literal

import sqlalchemy as sa
from fastapi import Depends, HTTPException, Query, Response
from pydantic import ConfigDict, create_model

from app.models import T, spec


def install_camera_routes(app, connection, user, admin, audit, build_input):
    DB = Annotated[sa.Connection, Depends(connection)]
    User = Annotated[dict, Depends(user)]
    site, deployment = T["camera_site"], T["camera_deployment"]

    def visible(stmt, actor):
        return stmt if actor["role"] == "admin" else stmt.where(site.c.region.in_(actor["regions"]))

    def redact(row, actor):
        data = dict(row)
        if not actor["can_view_coordinates"]:
            data.update(longitude=None, latitude=None)
        return data

    def conditions(resource, q, region, deployment_type, site_id, batch, status, has_issue):
        table = site if resource == "sites" else deployment
        parts = []
        if region:
            parts.append(site.c.region == region)
        if deployment_type:
            parts.append(site.c.deployment_type == deployment_type)
        if q:
            # Treat %, _ and backslash literally, not as wildcard syntax.
            term = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
            columns = [site.c.site_code, site.c.region]
            if resource == "deployments":
                columns += [table.c.device_code, table.c.device_type, table.c.maintenance_by]
            parts.append(sa.or_(*(c.ilike(term, escape="\\") for c in columns)))
        if resource == "deployments":
            if site_id:
                parts.append(table.c.site_id == site_id)
            if batch:
                parts.append(table.c.data_retrieval_batch == batch)
            if status:
                parts.append(table.c.data_retrieval_status == status)
            if has_issue is not None:
                issue = sa.func.length(sa.func.trim(sa.func.coalesce(table.c.issue_type, ""))) > 0
                parts.append(issue if has_issue else ~issue)
        return parts

    def validate(data, table_name):
        for field in spec[table_name]:
            name, value = field["name"], data.get(field["name"])
            if name in ("id", "created_at"):
                continue
            if value is None:
                if field["required"] == "必填":
                    raise HTTPException(422, f"{name} 不可为空")
                continue
            if isinstance(value, str):
                data[name] = value = value.strip()
                if field["required"] == "必填" and not value:
                    raise HTTPException(422, f"{name} 不可为空白")
                if field["type"].startswith("VARCHAR") and len(value) > T[table_name].c[name].type.length:
                    raise HTTPException(422, f"{name} 长度超限")
            if isinstance(value, datetime) and value.tzinfo is None:
                raise HTTPException(422, f"{name} 需要时区，例如 +08:00")
            if isinstance(value, float) and not math.isfinite(value):
                raise HTTPException(422, f"{name} 必须为有限数值")
        if table_name == "camera_deployment":
            batch = data["data_retrieval_batch"]
            if not re.fullmatch(r"[0-9]{4}(0[1-9]|1[0-2])", batch) or batch.startswith("0000"):
                raise HTTPException(422, "回收批次须为有效年月，例如 202608")
            for field in ("work_start_at", "work_end_at"):
                if data.get(field) and data[field] > datetime.now(UTC):
                    raise HTTPException(422, "工作周期须为已结束周期，工作时间不能在未来")
        return data

    def install(resource, table_name):
        table = T[table_name]
        Input = build_input(table_name)
        Patch = create_model(
            table_name + "Patch",
            __config__=ConfigDict(extra="forbid"),
            **{name: (field.annotation | None, None) for name, field in Input.model_fields.items()},
        )
        source = table if resource == "sites" else table.join(site)

        def listing(
            conn: DB,
            actor: User,
            response: Response,
            limit: int = Query(25, ge=1, le=500),
            offset: int = Query(0, ge=0),
            q: str = Query("", max_length=100),
            region: str | None = None,
            deployment_type: Literal["single", "paired"] | None = None,
            site_id: uuid.UUID | None = None,
            batch: str | None = None,
            status: Literal["retrieved", "not_retrieved"] | None = None,
            has_issue: bool | None = None,
        ):
            filters = conditions(resource, q, region, deployment_type, site_id, batch, status, has_issue)
            stmt = visible(sa.select(table).select_from(source).where(*filters), actor)
            response.headers["X-Total-Count"] = str(
                conn.execute(sa.select(sa.func.count()).select_from(stmt.subquery())).scalar_one()
            )
            order = (
                [site.c.region, site.c.site_code, table.c.id]
                if resource == "sites"
                else [
                    table.c.data_retrieval_batch.desc(),
                    site.c.region,
                    site.c.site_code,
                    table.c.device_code,
                    table.c.id,
                ]
            )
            rows = conn.execute(stmt.order_by(*order).limit(limit).offset(offset)).mappings().all()
            return [redact(row, actor) if resource == "sites" else dict(row) for row in rows]

        def get_row(conn, actor, row_id, lock=False):
            stmt = visible(sa.select(table).select_from(source).where(table.c.id == row_id), actor)
            if lock:
                stmt = stmt.with_for_update(of=table)
            row = conn.execute(stmt).mappings().first()
            if row is None:
                raise HTTPException(404, "记录不存在或无访问权限")
            return row

        def detail(row_id: uuid.UUID, conn: DB, actor: User):
            row = get_row(conn, actor, row_id)
            return redact(row, actor) if resource == "sites" else row

        def creating(body, conn: DB, actor: User):
            admin(actor)
            data = validate(body.model_dump(), table_name)
            row = conn.execute(table.insert().values(**data).returning(table)).mappings().one()
            audit(conn, actor, "create", table_name, row["id"], after=dict(row))
            return redact(row, actor) if resource == "sites" else row

        def updating(row_id: uuid.UUID, body, conn: DB, actor: User):
            admin(actor)
            before = dict(get_row(conn, actor, row_id, lock=True))
            changes = body.model_dump(exclude_unset=True)
            if not changes:
                raise HTTPException(422, "请提供需要修改的字段")
            data = validate({**before, **changes}, table_name)
            # Avoid silently moving linked history to a different site/device/batch or region.
            if resource == "sites":
                linked = conn.execute(
                    sa.select(deployment.c.id).where(deployment.c.site_id == row_id).limit(1)
                ).first()
                if linked and data["region"] != before["region"]:
                    raise HTTPException(409, "位点已有工作周期，不能直接变更所属区域")
            else:
                linked = conn.execute(
                    sa.select(T["media_asset"].c.id)
                    .where(T["media_asset"].c.camera_deployment_id == row_id)
                    .limit(1)
                ).first()
                if linked and any(
                    data[k] != before[k] for k in ("site_id", "device_code", "data_retrieval_batch")
                ):
                    raise HTTPException(409, "周期已有媒体，不能直接变更位点、相机编号或回收批次")
            changes = {key: data[key] for key in changes}
            row = (
                conn.execute(table.update().where(table.c.id == row_id).values(**changes).returning(table))
                .mappings()
                .one()
            )
            audit(conn, actor, "update", table_name, row_id, before=before, after=dict(row))
            return redact(row, actor) if resource == "sites" else row

        creating.__annotations__["body"] = Input
        updating.__annotations__["body"] = Patch
        app.add_api_route(f"/api/{resource}", listing, methods=["GET"], name=f"list_{resource}")
        app.add_api_route(
            f"/api/{resource}", creating, methods=["POST"], status_code=201, name=f"create_{resource}"
        )
        app.add_api_route(f"/api/{resource}/{{row_id}}", detail, methods=["GET"], name=f"get_{resource}")
        app.add_api_route(
            f"/api/{resource}/{{row_id}}", updating, methods=["PATCH"], name=f"update_{resource}"
        )

    for resource, table_name in [("sites", "camera_site"), ("deployments", "camera_deployment")]:
        install(resource, table_name)

    @app.get("/api/cameras/summary")
    def summary(
        conn: DB,
        actor: User,
        q: str = Query("", max_length=100),
        region: str | None = None,
        deployment_type: Literal["single", "paired"] | None = None,
        site_id: uuid.UUID | None = None,
        batch: str | None = None,
        status: Literal["retrieved", "not_retrieved"] | None = None,
        has_issue: bool | None = None,
    ):
        filters = conditions("deployments", q, region, deployment_type, site_id, batch, status, has_issue)
        seconds = sa.extract("epoch", deployment.c.work_end_at - deployment.c.work_start_at)
        rows = visible(
            sa.select(deployment, seconds.label("seconds"))
            .select_from(deployment.join(site))
            .where(*filters),
            actor,
        ).subquery()
        counts = (
            conn.execute(
                sa.select(
                    sa.func.count().label("deployment_count"),
                    sa.func.count()
                    .filter(rows.c.data_retrieval_status == "retrieved")
                    .label("retrieved_count"),
                    sa.func.count()
                    .filter(rows.c.data_retrieval_status == "not_retrieved")
                    .label("not_retrieved_count"),
                    sa.func.count()
                    .filter(sa.func.length(sa.func.trim(sa.func.coalesce(rows.c.issue_type, ""))) > 0)
                    .label("issue_count"),
                    sa.func.count().filter(rows.c.seconds.is_(None)).label("incomplete_time_count"),
                    sa.func.coalesce(sa.func.sum(rows.c.seconds), 0).label("seconds"),
                )
            )
            .mappings()
            .one()
        )
        result = dict(counts)
        result["recorded_interval_days"] = round(float(result.pop("seconds")) / 86400, 3)
        result["note"] = (
            "周期时长按（结束－开始）/24小时累加；缺少起止时间的周期不计入。未扣除停机、未合并重叠区间，不等同于有效相机工作日。"
        )
        return result
