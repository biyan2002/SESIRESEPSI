"""Iteration 3 regression tests for booking distance flow.

Coverage:
- Favicon /favicon.jpg reachable & document title (indirect via HTML fetch).
- Legacy POST /api/distance is removed.
- /api/packages and /api/additionals listable (no _id leak).
- Manual distance transport formula (0/10/11/19/25).
- Server-side recalculation: forged transport_cost/total_price get overwritten.
- Backend Pydantic validation: distance_km < 0 and > 1000 rejected (422).
- Cleanup: deletes all TEST_-prefixed bookings using admin login.
"""

import os
import math
import uuid
import pytest
import requests
from pathlib import Path


def _load_frontend_url():
    env_path = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("REACT_APP_BACKEND_URL not found in frontend/.env")


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
    r = api_client.post(f"{BASE_URL}/api/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    return r.json()["token"]


def _transport_cost(km: float) -> int:
    if km <= 10:
        return 0
    return math.ceil(km - 10) * 5000


# ---- Legacy endpoint removed
class TestDistanceEndpointRemoval:
    def test_post_distance_removed(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/distance", json={"maps_link": "x"})
        assert r.status_code in (404, 405)

    def test_get_distance_removed(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/distance")
        assert r.status_code in (404, 405)


# ---- Static assets & title
class TestStaticAssets:
    def test_favicon_reachable(self, api_client):
        r = api_client.get(f"{BASE_URL}/favicon.jpg", timeout=30)
        assert r.status_code == 200
        assert "image" in r.headers.get("content-type", "").lower()

    def test_index_title_sesi_resepsi(self, api_client):
        r = api_client.get(f"{BASE_URL}/", timeout=30)
        assert r.status_code == 200
        assert "<title>SESI RESEPSI</title>" in r.text


# ---- Packages / additionals
class TestPackagesAndAdditionals:
    def test_list_packages(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/packages")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        assert all("_id" not in p for p in data)

    def test_list_additionals(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/additionals")
        assert r.status_code == 200


# ---- Booking creation with correct transport
class TestBookingCreation:
    @pytest.mark.parametrize("distance_km,expected_transport", [
        (0, 0), (10, 0), (11, 5000), (19, 45000), (25, 75000),
    ])
    def test_create_booking_with_manual_distance(self, api_client, distance_km, expected_transport):
        pkgs = api_client.get(f"{BASE_URL}/api/packages").json()
        pkg = pkgs[0]
        assert _transport_cost(distance_km) == expected_transport
        total = pkg["price"] + expected_transport
        payload = _booking_payload(pkg, distance_km, expected_transport, total)
        r = api_client.post(f"{BASE_URL}/api/bookings", json=payload)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body["distance_km"] == distance_km
        assert body["transport_cost"] == expected_transport
        assert body["total_price"] == total


# ---- Server-side recalculation of transport & total
class TestServerRecalculation:
    def test_forged_transport_gets_recalculated(self, api_client):
        pkgs = api_client.get(f"{BASE_URL}/api/packages").json()
        pkg = pkgs[0]
        # Client sends 19 km but forged transport_cost=0 and wrong total
        payload = _booking_payload(pkg, distance_km=19, transport_cost=0, total_price=pkg["price"])
        r = api_client.post(f"{BASE_URL}/api/bookings", json=payload)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body["transport_cost"] == 45000, body
        assert body["total_price"] == pkg["price"] + 45000, body

    def test_recalc_with_additionals(self, api_client):
        pkgs = api_client.get(f"{BASE_URL}/api/packages").json()
        pkg = pkgs[0]
        adds = [{"id": "a1", "name": "Extra", "price": 50000, "unit": "jam", "qty": 2, "subtotal": 100000}]
        payload = _booking_payload(pkg, distance_km=12, transport_cost=999999, total_price=1)
        payload["additionals"] = adds
        r = api_client.post(f"{BASE_URL}/api/bookings", json=payload)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body["transport_cost"] == 10000  # ceil(12-10)*5000
        assert body["total_price"] == pkg["price"] + 100000 + 10000


# ---- Validation
class TestBookingValidation:
    def test_negative_distance_rejected(self, api_client):
        pkgs = api_client.get(f"{BASE_URL}/api/packages").json()
        pkg = pkgs[0]
        payload = _booking_payload(pkg, distance_km=-1, transport_cost=0, total_price=pkg["price"])
        r = api_client.post(f"{BASE_URL}/api/bookings", json=payload)
        assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text[:200]}"

    def test_over_1000_km_rejected(self, api_client):
        pkgs = api_client.get(f"{BASE_URL}/api/packages").json()
        pkg = pkgs[0]
        payload = _booking_payload(pkg, distance_km=1500, transport_cost=0, total_price=pkg["price"])
        r = api_client.post(f"{BASE_URL}/api/bookings", json=payload)
        assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text[:200]}"


def _booking_payload(pkg, distance_km, transport_cost, total_price):
    return {
        "name": f"TEST_{uuid.uuid4().hex[:6]}",
        "whatsapp": "081234567890",
        "event_type": "Resepsi",
        "event_date": "2026-03-14",
        "event_time": "10:00",
        "address": "Test address",
        "distance_km": distance_km,
        "notes": "auto test",
        "package_id": pkg["id"],
        "package_name": pkg["name"],
        "package_price": pkg["price"],
        "additionals": [],
        "transport_cost": transport_cost,
        "total_price": total_price,
        "payment_type": "dp",
        "payment_amount": 50000,
        "payment_proof_path": "test/fake.jpg",
    }


# ---- Cleanup (runs last alphabetically? Force with zzz name)
class TestZZCleanup:
    def test_cleanup_test_bookings(self, api_client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = api_client.get(f"{BASE_URL}/api/bookings", headers=headers)
        assert r.status_code == 200
        removed = 0
        for b in r.json():
            if str(b.get("name", "")).startswith("TEST_"):
                d = api_client.delete(f"{BASE_URL}/api/bookings/{b['id']}", headers=headers)
                if d.status_code == 200:
                    removed += 1
        print(f"Cleaned up {removed} TEST_ bookings")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
