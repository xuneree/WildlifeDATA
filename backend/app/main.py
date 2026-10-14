import uuid
from datetime import date, datetime
from typing import Annotated, Literal

import sqlalchemy as sa
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, create_model
from sqlalchemy.exc import IntegrityError

from app.db import get_engine
from app.models import T, spec
from app.security import hash_password, issue_token, read_token, verify_password

app = FastAPI(title="红外相机数据管理平台", version="0.1.0")
bearer = HTTPBearer(auto_error=False)


def connection():
    engine = get_engine()
    try:
        with engine.begin() as conn:
            yield conn
    except IntegrityError:
        raise HTTPException(409, "唯一性、外键或业务约束冲突；本次操作已回滚")
    finally:
        engine.dispose()


DB = Annotated[sa.Connection, Depends(connection)]


def user(conn: DB, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    user_id = read_token(credentials.credentials) if credentials else None
    try:
        user_id = uuid.UUID(user_id) if user_id else None
    except (ValueError, TypeError):
        user_id = None
    result = (
        conn.execute(
            sa.select(T["app_user"]).where(T["app_user"].c.id == user_id, T["app_user"].c.is_active.is_(True))
        )
        .mappings()
        .first()
    )
    if not result:
        raise HTTPException(401, "请先登录")
    return result


User = Annotated[dict, Depends(user)]


def admin(actor):
    if actor["role"] != "admin":
        raise HTTPException(403, "需要管理员权限")


def safe_user(actor):
    return {
        key: actor[key]
        for key in ("id", "username", "display_name", "role", "regions", "can_view_coordinates")
    }


class Login(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=1024)


@app.post("/api/auth/login")
def login(body: Login, conn: DB):
    account = (
        conn.execute(
            sa.select(T["app_user"]).where(
                T["app_user"].c.username == body.username, T["app_user"].c.is_active.is_(True)
            )
        )
        .mappings()
        .first()
    )
    # Constant-cost password verification for unknown usernames as well.
    dummy = "scrypt$00000000000000000000000000000000$" + "0" * 128
    valid = verify_password(body.password, account["password_hash"] if account else dummy)
    if not account or not valid:
        raise HTTPException(401, "用户名或密码错误")
    return {"token": issue_token(str(account["id"])), "user": safe_user(account)}


@app.get("/api/auth/me")
def me(actor: User):
    return safe_user(actor)


@app.get("/api/health")
def health(conn: DB):
    conn.execute(sa.select(T["app_user"].c.id).limit(1))
    version = conn.execute(sa.text("SELECT postgis_version()")).scalar_one()
    return {"status": "ok", "postgis": version}


def scope(stmt, actor):
    if actor["role"] != "admin":
        stmt = stmt.where(T["camera_site"].c.region.in_(actor["regions"]))
    return stmt


@app.get("/api/dashboard")
def dashboard(conn: DB, actor: User):
    site, deploy, media = (T[x] for x in ("camera_site", "camera_deployment", "media_asset"))
    sites = (
        conn.execute(scope(sa.select(site).order_by(site.c.region, site.c.site_code), actor)).mappings().all()
    )
    if not actor["can_view_coordinates"]:
        sites = [dict(x, longitude=None, latitude=None) for x in sites]
    deployments = conn.execute(
        scope(sa.select(sa.func.count()).select_from(deploy.join(site)), actor)
    ).scalar_one()
    media_count = conn.execute(
        scope(sa.select(sa.func.count()).select_from(media.join(deploy).join(site)), actor)
    ).scalar_one()
    return {
        "site_count": len(sites),
        "deployment_count": deployments,
        "media_count": media_count,
        "sites": sites,
        "note": "媒体文件数不等同于独立探测事件数；点位不代表连续轨迹。",
    }


# Only baseline resource endpoints are exposed; import and evidence tables are not writable via generic APIs.
RESOURCES = {
    "sites": "camera_site",
    "deployments": "camera_deployment",
    "species": "species",
    "individuals": "individual",
}


def build_input(table_name):
    fields = {}
    for column in spec[table_name]:
        name, typ = column["name"], column["type"]
        if name in ("id", "created_at", "profile_id"):
            continue
        base = (
            uuid.UUID
            if typ == "UUID"
            else datetime
            if typ == "TIMESTAMPTZ"
            else date
            if typ == "DATE"
            else int
            if typ in ("INTEGER", "BIGINT")
            else float
            if typ.startswith("NUMERIC") or typ == "DOUBLE PRECISION"
            else str
        )
        nullable = column["required"] != "必填"
        default = column["default"]
        if default != "—":
            value = default
        else:
            value = None if nullable else ...
        fields[name] = (base | None if nullable else base, value)
    return create_model(table_name + "Input", __config__=ConfigDict(extra="forbid"), **fields)


def audit(conn, actor, action, entity, row_id, before=None, after=None):
    conn.execute(
        T["audit_log"]
        .insert()
        .values(
            actor_id=actor["id"],
            action=action,
            entity_type=entity,
            entity_id=row_id,
            before_data=jsonable_encoder(before),
            after_data=jsonable_encoder(after),
        )
    )


def install_resource(resource, table_name):
    table = T[table_name]
    input_model = build_input(table_name)

    def listing(conn: DB, actor: User, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
        stmt = sa.select(table)
        if resource == "sites":
            stmt = scope(stmt, actor)
        elif resource == "deployments":
            stmt = scope(stmt.select_from(table.join(T["camera_site"])), actor)
        elif resource == "individuals":
            admin(actor)  # No cross-region identity data without an explicit sharing policy.
        rows = conn.execute(stmt.order_by(table.c.id).limit(limit).offset(offset)).mappings().all()
        if resource == "sites" and not actor["can_view_coordinates"]:
            rows = [dict(x, longitude=None, latitude=None) for x in rows]
        return rows

    def creating(body, conn: DB, actor: User):
        admin(actor)
        data = body.model_dump()
        for key, value in data.items():
            if isinstance(value, datetime) and value.tzinfo is None:
                raise HTTPException(422, f"{key} 需要时区，例如 +08:00")
        for field in spec[table_name]:
            value = data.get(field["name"])
            if (
                field["type"].startswith("VARCHAR")
                and value is not None
                and len(value) > table.c[field["name"]].type.length
            ):
                raise HTTPException(422, f"{field['name']} 长度超限")
        row = conn.execute(table.insert().values(**data).returning(table)).mappings().one()
        audit(conn, actor, "create", table_name, row["id"], after=dict(row))
        return row

    creating.__annotations__["body"] = input_model
    app.add_api_route(f"/api/{resource}", listing, methods=["GET"], name=f"list_{resource}")
    app.add_api_route(
        f"/api/{resource}", creating, methods=["POST"], status_code=201, name=f"create_{resource}"
    )


for resource, table_name in RESOURCES.items():
    install_resource(resource, table_name)


class NewUser(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=12, max_length=1024)
    display_name: str | None = Field(default=None, max_length=100)
    regions: list[str] = []
    can_view_coordinates: bool = False
    role: Literal["admin", "viewer"] = "viewer"


@app.post("/api/users", status_code=201)
def create_user(body: NewUser, conn: DB, actor: User):
    admin(actor)
    data = body.model_dump(exclude={"password"})
    row = (
        conn.execute(
            T["app_user"]
            .insert()
            .values(**data, password_hash=hash_password(body.password))
            .returning(T["app_user"])
        )
        .mappings()
        .one()
    )
    audit(conn, actor, "create_user", "app_user", row["id"], after=safe_user(row))
    return safe_user(row)


@app.get("/api/audit")
def audits(conn: DB, actor: User, limit: int = Query(100, ge=1, le=500)):
    admin(actor)
    return (
        conn.execute(sa.select(T["audit_log"]).order_by(T["audit_log"].c.created_at.desc()).limit(limit))
        .mappings()
        .all()
    )
