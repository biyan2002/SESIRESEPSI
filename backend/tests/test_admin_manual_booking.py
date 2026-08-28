"""Iteration 4 regression tests for admin manual booking flow.

Covers:
- POST /api/bookings accepts maps_link and empty payment_proof_path.
- Booking persists status field chosen by admin (confirmed/pending/completed).
- Backend does not enforce weekend-only on API level (allows weekday for historic bookings).
- Server recalculates transport_cost & total_price with additionals.
- Admin GET /bookings returns booking with maps_link visible.
- Cleanup TEST_ bookings.
"""

import os
import uuid
import pytest
import requests
from pathlib import Path


def _load_frontend_url():
    env_path = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("REACT_APP_BACKEND_URL not found")


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", _load_frontend_url()).rstrip("/")
ADMIN_USER = "fikabisadimartyansyah@gmail.com"
ADMIN_PASS = "Biyan2026"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(api_client):
    r = api_client.post(f"{BASE_URL}/api/auth/login",
                        json={"username": ADMIN_USER, "password": ADMIN_PASS})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code}")
    return r.json()["token"]


def _payload(pkg, **overrides):
    p = {
        "name": f"TEST_{uuid.uuid4().hex[:6]}",
        "whatsapp": "081234567890",
        "event_type": "Resepsi",
        "event_date": "2025-11-19",  # Wednesday - historic weekday
        "event_time": "10:00",
        "address": "Jl. Test No.1 Bekasi",
        "maps_link": "https://maps.app.goo.gl/AbCdEfGhIjK",
        "distance_km": 19,
        "notes": "manual admin test",
        "package_id": pkg["id"],
        "package_name": pkg["name"],
        "package_price": pkg["price"],
        "additionals": [],
        "transport_cost": 45000,
        "total_price": pkg["price"] + 45000,
        "payment_type": "lunas",
        "payment_amount": pkg["price"] + 45000,
        "payment_proof_path": "",
        "status": "confirmed",
    }
    p.update(overrides)
    return p


class TestManualBookingCreation:
    def test_create_with_maps_link_no_proof(self, api_client):
        pkgs = api_client.get(f"{BASE_URL}/api/packages").json()
        basic = next(p for p in pkgs if p["name"].lower() == "basic")
        r = api_client.post(f"{BASE_URL}/api/bookings", json=_payload(basic))
        assert r.status_code == 200, r.text[:300]
        b = r.json()
        assert b["maps_link"] == "https://maps.app.goo.gl/AbCdEfGhIjK"
        assert b["payment_proof_path"] == ""
        assert b["transport_cost"] == 45000
        assert b["total_price"] == basic["price"] + 45000
        assert b["distance_km"] == 19

    def test_status_persists_completed(self, api_client, admin_token):
        pkgs = api_client.get(f"{BASE_URL}/api/packages").json()
        basic = next(p for p in pkgs if p["name"].lower() == "basic")
        r = api_client.post(f"{BASE_URL}/api/bookings",
                            json=_payload(basic, status="completed"))
        assert r.status_code == 200
        bid = r.json()["id"]
        # Verify via admin list
        listing = api_client.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
        ).json()
        found = next((x for x in listing if x["id"] == bid), None)
        assert found is not None
        assert found["status"] == "completed"
        assert found["maps_link"].startswith("https://maps.app.goo.gl/")

    def test_weekday_allowed_backend(self, api_client):
        """Backend must NOT enforce weekend-only for admin manual booking of historic data."""
        pkgs = api_client.get(f"{BASE_URL}/api/packages").json()
        basic = next(p for p in pkgs if p["name"].lower() == "basic")
        # Tuesday date
        r = api_client.post(f"{BASE_URL}/api/bookings",
                            json=_payload(basic, event_date="2025-11-18"))
        assert r.status_code == 200, r.text[:300]

    def test_recalc_transport_with_additionals(self, api_client):
        pkgs = api_client.get(f"{BASE_URL}/api/packages").json()
        basic = next(p for p in pkgs if p["name"].lower() == "basic")
        payload = _payload(basic, distance_km=25, transport_cost=0, total_price=0)
        payload["additionals"] = [{
            "id": "x1", "name": "Extra time", "price": 50000,
            "unit": "jam", "qty": 1, "subtotal": 50000,
        }]
        r = api_client.post(f"{BASE_URL}/api/bookings", json=payload)
        assert r.status_code == 200
        b = r.json()
        assert b["transport_cost"] == 75000  # ceil(25-10)*5000
        assert b["total_price"] == basic["price"] + 50000 + 75000


class TestZZCleanup:
    def test_cleanup(self, api_client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = api_client.get(f"{BASE_URL}/api/bookings", headers=headers)
        assert r.status_code == 200
        for b in r.json():
            if str(b.get("name", "")).startswith("TEST_"):
                api_client.delete(f"{BASE_URL}/api/bookings/{b['id']}", headers=headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
