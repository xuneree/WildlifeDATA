import uuid

import pytest
import sqlalchemy as sa
from sqlalchemy.exc import IntegrityError

from app.models import T


def create(client, auth, resource, body):
    r = client.post("/api/" + resource, headers=auth, json=body)
    assert r.status_code == 201, r.text
    return r.json()


def site(client, auth, **kwargs):
    return create(
        client,
        auth,
        "sites",
        {
            "site_code": "701",
            "region": "北区",
            "deployment_type": "paired",
            "longitude": 112.5,
            "latitude": 37.5,
            **kwargs,
        },
    )


def test_health_and_auth(client):
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.get("/api/sites").status_code == 401
    assert client.post("/api/auth/login", json={"username": "admin", "password": "bad"}).status_code == 401
    assert client.get("/api/sites", headers={"Authorization": "Bearer forged"}).status_code == 401


def test_monitoring_workflow(client, auth):
    s = site(client, auth)
    create(
        client,
        auth,
        "deployments",
        {
            "site_id": s["id"],
            "device_code": "701A",
            "data_retrieval_batch": "202608",
            "data_retrieval_status": "not_retrieved",
            "work_start_at": "2026-06-01T08:00:00+08:00",
            "work_end_at": "2026-08-01T08:00:00+08:00",
        },
    )
    stats = client.get("/api/dashboard", headers=auth).json()
    assert (stats["site_count"], stats["deployment_count"], stats["media_count"]) == (1, 1, 0)
    assert len(client.get("/api/audit", headers=auth).json()) == 2


@pytest.mark.parametrize(
    "data",
    [
        {"longitude": 200},
        {"latitude": None},
        {"deployment_type": "bad"},
    ],
)
def test_site_constraints(client, auth, data):
    r = client.post(
        "/api/sites",
        headers=auth,
        json={
            "site_code": "701",
            "region": "北区",
            "deployment_type": "paired",
            "longitude": 112,
            "latitude": 37,
            **data,
        },
    )
    assert r.status_code == 409
    assert client.get("/api/sites", headers=auth).json() == []
    assert client.get("/api/audit", headers=auth).json() == []


def test_same_site_code_allowed_across_regions(client, auth):
    site(client, auth)
    site(client, auth, region="南区")
    r = client.post(
        "/api/sites", headers=auth, json={"site_code": "701", "region": "北区", "deployment_type": "single"}
    )
    assert r.status_code == 409


def test_region_and_sensitive_coordinate_permissions(client, auth):
    north = site(client, auth)
    site(client, auth, region="南区")
    create(
        client,
        auth,
        "deployments",
        {
            "site_id": north["id"],
            "device_code": "701A",
            "data_retrieval_batch": "202608",
            "data_retrieval_status": "retrieved",
        },
    )
    create(
        client,
        auth,
        "users",
        {"username": "north-viewer", "password": "viewer-test-password", "regions": ["北区"]},
    )
    r = client.post("/api/auth/login", json={"username": "north-viewer", "password": "viewer-test-password"})
    view = {"Authorization": "Bearer " + r.json()["token"]}
    rows = client.get("/api/sites", headers=view).json()
    assert len(rows) == 1 and rows[0]["region"] == "北区"
    assert rows[0]["longitude"] is None and rows[0]["latitude"] is None
    assert len(client.get("/api/deployments", headers=view).json()) == 1
    stats = client.get("/api/dashboard", headers=view).json()
    assert stats["site_count"] == 1 and stats["deployment_count"] == 1
    assert stats["sites"][0]["longitude"] is None
    assert client.get("/api/individuals", headers=view).status_code == 403
    assert client.get("/api/audit", headers=view).status_code == 403
    assert (
        client.post("/api/species", headers=view, json={"species_code": "x", "common_name": "x"}).status_code
        == 403
    )


def test_individual_profile_and_unknown_constraints(client, auth, database_url):
    species = create(client, auth, "species", {"species_code": "leopard", "common_name": "华北豹"})
    one = create(client, auth, "individuals", {"individual_code": "L001", "species_id": species["id"]})
    two = create(client, auth, "individuals", {"individual_code": "L002", "species_id": species["id"]})
    r = client.post(
        "/api/individuals",
        headers=auth,
        json={"individual_code": "unknown_individual", "species_id": species["id"]},
    )
    assert r.status_code == 409
    engine = sa.create_engine(database_url)
    profile_id = uuid.uuid4()
    with engine.begin() as conn:
        conn.execute(
            T["individual_profile"]
            .insert()
            .values(
                id=profile_id,
                individual_id=uuid.UUID(one["id"]),
                filename="profile.jpg",
                storage_path="profiles/profile.jpg",
            )
        )
        conn.execute(
            T["individual"]
            .update()
            .where(T["individual"].c.id == uuid.UUID(one["id"]))
            .values(profile_id=profile_id)
        )
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(
            T["individual"]
            .update()
            .where(T["individual"].c.id == uuid.UUID(two["id"]))
            .values(profile_id=profile_id)
        )
    engine.dispose()


def test_cycle_time_and_timezone(client, auth):
    s = site(client, auth)
    body = {
        "site_id": s["id"],
        "device_code": "701A",
        "data_retrieval_batch": "202608",
        "data_retrieval_status": "retrieved",
        "work_start_at": "2026-08-02T00:00:00+08:00",
        "work_end_at": "2026-08-01T00:00:00+08:00",
    }
    assert client.post("/api/deployments", headers=auth, json=body).status_code == 409
    body["work_start_at"] = "2026-07-01T00:00:00"
    assert client.post("/api/deployments", headers=auth, json=body).status_code == 422


def test_foreign_key_and_input_validation(client, auth):
    body = {"individual_code": "L001", "species_id": str(uuid.uuid4())}
    assert client.post("/api/individuals", headers=auth, json=body).status_code == 409
    body["species_id"] = "not-a-uuid"
    assert client.post("/api/individuals", headers=auth, json=body).status_code == 422
    assert client.get("/api/sites?limit=100000", headers=auth).status_code == 422
    assert (
        client.post(
            "/api/sites",
            headers=auth,
            json={"site_code": "701", "region": "北区", "deployment_type": "single", "unexpected": True},
        ).status_code
        == 422
    )


def test_password_never_returned_or_audited(client, auth):
    account = create(client, auth, "users", {"username": "user", "password": "viewer-test-password"})
    assert "password_hash" not in account and "password" not in account
    audit = client.get("/api/audit", headers=auth).text
    assert "password" not in audit and "scrypt$" not in audit


def test_unassigned_viewer_cannot_see_sites(client, auth):
    site(client, auth)
    create(client, auth, "users", {"username": "isolated", "password": "viewer-test-password"})
    token = client.post(
        "/api/auth/login", json={"username": "isolated", "password": "viewer-test-password"}
    ).json()["token"]
    stats = client.get("/api/dashboard", headers={"Authorization": "Bearer " + token}).json()
    assert stats["sites"] == [] and stats["site_count"] == 0
