import os
import subprocess
import uuid
from pathlib import Path

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url

from app.main import app
from app.models import T
from app.security import hash_password


@pytest.fixture(scope="session")
def database_url():
    configured = os.environ.get("TEST_DATABASE_URL")
    if not configured:
        raise RuntimeError("TEST_DATABASE_URL is required: tests need a real PostgreSQL/PostGIS server")
    url = make_url(configured)
    name = "wildlife_test_" + uuid.uuid4().hex[:16]
    admin_engine = sa.create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.exec_driver_sql(f'CREATE DATABASE "{name}"')
    target = url.set(database=name).render_as_string(hide_password=False)
    env = os.environ.copy()
    env["DATABASE_URL"] = target
    try:
        # Run upgrade twice: the second call must not duplicate or destroy state.
        for _ in range(2):
            subprocess.run(
                [str(Path(__file__).parents[1] / ".venv/bin/alembic"), "upgrade", "head"],
                cwd=Path(__file__).parents[1],
                env=env,
                check=True,
            )
        yield target
    finally:
        with admin_engine.connect() as conn:
            conn.exec_driver_sql(f'DROP DATABASE "{name}" WITH (FORCE)')
        admin_engine.dispose()


@pytest.fixture
def client(database_url, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("AUTH_SECRET", "test-only-signing-secret-with-over-32-characters")
    engine = sa.create_engine(database_url)
    with engine.begin() as conn:
        conn.exec_driver_sql("TRUNCATE " + ", ".join(T) + " CASCADE")
        conn.execute(
            T["app_user"]
            .insert()
            .values(
                username="admin",
                role="admin",
                regions=[],
                can_view_coordinates=True,
                password_hash=hash_password("test-only-password"),
            )
        )
    engine.dispose()
    with TestClient(app) as value:
        yield value


@pytest.fixture
def auth(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "test-only-password"})
    assert r.status_code == 200
    return {"Authorization": "Bearer " + r.json()["token"]}
