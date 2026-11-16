import uuid

import pytest
import sqlalchemy as sa
from test_api import create, site

from app.models import T


def cycle(client, auth, site_id, **changes):
    return create(
        client,
        auth,
        "deployments",
        {
            "site_id": site_id,
            "device_code": "701A",
            "data_retrieval_batch": "202608",
            "data_retrieval_status": "not_retrieved",
            "work_start_at": "2026-06-01T08:00:00+08:00",
            "work_end_at": "2026-06-03T08:00:00+08:00",
            **changes,
        },
    )


def test_site_correction_and_audit_snapshots(client, auth):
    original = site(client, auth, terrain_type="山脊", notes="旧备注")
    response = client.patch(
        f"/api/sites/{original['id']}",
        headers=auth,
        json={
            "site_code": "702",
            "notes": None,
            "first_deployed_at": "2026-01-01T08:30:45+08:00",
            "elevation_m": 1200.25,
            "vegetation_type": "灌丛",
            "environment_type": "兽径",
        },
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["id"] == original["id"] and result["site_code"] == "702"
    assert result["notes"] is None and result["longitude"] == original["longitude"]
    assert result["terrain_type"] == "山脊"
    assert client.get(f"/api/sites/{original['id']}", headers=auth).json() == result
    logs = client.get("/api/audit", headers=auth).json()
    update = next(row for row in logs if row["action"] == "update")
    assert update["before_data"]["site_code"] == "701"
    assert update["after_data"]["site_code"] == "702"
    assert update["before_data"]["notes"] == "旧备注" and update["after_data"]["notes"] is None


def test_failed_correction_rolls_back_business_and_audit(client, auth):
    original = site(client, auth)
    site(client, auth, site_code="702")
    for body in [{"site_code": "702"}, {"longitude": 200}, {"latitude": None}]:
        r = client.patch(f"/api/sites/{original['id']}", headers=auth, json=body)
        assert r.status_code == 409, r.text
    assert client.get(f"/api/sites/{original['id']}", headers=auth).json() == original
    assert len(client.get("/api/audit", headers=auth).json()) == 2


def test_filters_pagination_and_literal_search(client, auth):
    site(client, auth)
    site(client, auth, region="南区", deployment_type="single")
    special = site(client, auth, site_code="70_%")
    response = client.get("/api/sites?limit=1&offset=1&region=北区&deployment_type=paired", headers=auth)
    assert response.status_code == 200
    assert response.headers["X-Total-Count"] == "2" and len(response.json()) == 1
    response = client.get("/api/sites", params={"q": "_%"}, headers=auth)
    assert [row["id"] for row in response.json()] == [special["id"]]
    assert client.get("/api/sites?offset=100", headers=auth).headers["X-Total-Count"] == "3"


def test_complete_maintenance_and_filtered_summary(client, auth):
    north = site(client, auth)
    south = site(client, auth, region="南区")
    one = cycle(client, auth, north["id"])
    cycle(client, auth, north["id"], device_code="701B", issue_type="电池故障", work_end_at=None)
    cycle(client, auth, south["id"], data_retrieval_status="retrieved")
    response = client.patch(
        f"/api/deployments/{one['id']}",
        headers=auth,
        json={
            "device_type": "测试型号",
            "maintenance_at": "2026-08-01T08:00:00+08:00",
            "maintenance_by": "张三、李四",
            "data_retrieval_at": "2026-08-01T08:30:00+08:00",
            "data_retrieval_status": "retrieved",
            "notes": "更换电池及存储卡",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["maintenance_by"] == "张三、李四"
    stats = client.get("/api/cameras/summary?region=北区&batch=202608", headers=auth).json()
    assert stats["deployment_count"] == 2 and stats["recorded_interval_days"] == 2
    assert stats["retrieved_count"] == 1 and stats["not_retrieved_count"] == 1
    assert stats["issue_count"] == 1 and stats["incomplete_time_count"] == 1
    response = client.get(
        "/api/deployments",
        headers=auth,
        params={
            "site_id": north["id"],
            "has_issue": "true",
            "status": "not_retrieved",
            "q": "701B",
        },
    )
    assert response.headers["X-Total-Count"] == "1"
    assert response.json()[0]["device_code"] == "701B"
    stats = client.get("/api/cameras/summary?region=不存在", headers=auth).json()
    assert stats["deployment_count"] == stats["recorded_interval_days"] == 0


@pytest.mark.parametrize(
    "body",
    [
        {"data_retrieval_batch": "202613"},
        {"data_retrieval_batch": "000001"},
        {"data_retrieval_batch": "20268"},
        {"device_code": "   "},
        {"site_id": None},
        {"work_end_at": "2026-05-01T08:00:00+08:00"},
        {"work_end_at": "2026-08-01T08:00:00"},
        {"work_end_at": "2099-08-01T08:00:00+08:00"},
        {"unexpected": 1},
        {},
    ],
)
def test_invalid_cycle_correction_is_atomic(client, auth, body):
    s = site(client, auth)
    original = cycle(client, auth, s["id"])
    response = client.patch(f"/api/deployments/{original['id']}", headers=auth, json=body)
    assert response.status_code in (409, 422), response.text
    assert client.get(f"/api/deployments/{original['id']}", headers=auth).json() == original
    assert len(client.get("/api/audit", headers=auth).json()) == 2


def test_scoped_camera_reads_counts_details_and_write_denial(client, auth):
    north = site(client, auth)
    south = site(client, auth, region="南区")
    north_cycle = cycle(client, auth, north["id"])
    south_cycle = cycle(client, auth, south["id"])
    create(
        client,
        auth,
        "users",
        {
            "username": "viewer",
            "password": "viewer-test-password",
            "regions": ["北区"],
        },
    )
    token = client.post(
        "/api/auth/login",
        json={
            "username": "viewer",
            "password": "viewer-test-password",
        },
    ).json()["token"]
    view = {"Authorization": "Bearer " + token}
    response = client.get("/api/sites", headers=view)
    assert response.headers["X-Total-Count"] == "1"
    assert response.json()[0]["longitude"] is None
    detail = client.get(f"/api/sites/{north['id']}", headers=view).json()
    assert detail["longitude"] is None and detail["latitude"] is None
    for resource, row in [("sites", south), ("deployments", south_cycle)]:
        assert client.get(f"/api/{resource}/{row['id']}", headers=view).status_code == 404
    for resource, row in [("sites", north), ("deployments", north_cycle)]:
        assert (
            client.patch(f"/api/{resource}/{row['id']}", headers=view, json={"notes": "越权"}).status_code
            == 403
        )
        assert client.post(f"/api/{resource}", headers=view, json=row).status_code in (403, 422)
    assert client.get("/api/cameras/summary", headers=view).json()["deployment_count"] == 1
    assert client.get("/api/cameras/summary?region=南区", headers=view).json()["deployment_count"] == 0
    assert client.get("/api/deployments?region=南区", headers=view).headers["X-Total-Count"] == "0"


def test_linked_history_cannot_be_moved_silently(client, auth, database_url):
    s = site(client, auth)
    d = cycle(client, auth, s["id"])
    assert client.patch(f"/api/sites/{s['id']}", headers=auth, json={"region": "南区"}).status_code == 409
    engine = sa.create_engine(database_url)
    with engine.begin() as conn:
        conn.execute(
            T["media_asset"]
            .insert()
            .values(
                camera_deployment_id=uuid.UUID(d["id"]),
                filename="test.mp4",
                storage_path="test/test.mp4",
                media_type="video",
            )
        )
    engine.dispose()
    response = client.patch(f"/api/deployments/{d['id']}", headers=auth, json={"device_code": "701B"})
    assert response.status_code == 409
    response = client.patch(f"/api/deployments/{d['id']}", headers=auth, json={"notes": "允许维护纠错"})
    assert response.status_code == 200


def test_missing_record_and_coordinate_clearing(client, auth):
    assert client.get(f"/api/sites/{uuid.uuid4()}", headers=auth).status_code == 404
    s = site(client, auth)
    response = client.patch(f"/api/sites/{s['id']}", headers=auth, json={"longitude": None, "latitude": None})
    assert response.status_code == 200
    assert response.json()["longitude"] is None and response.json()["latitude"] is None
