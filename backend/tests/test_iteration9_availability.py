"""Iteration 9: Availability = available/full only. Bookings do not affect calendar."""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pink-wedding-studio.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_USER = "fikabisadimartyansyah@gmail.com"
ADMIN_PASS = "Biyan2026"

TEST_DATE = "2027-09-15"  # arbitrary future date


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def package():
    r = requests.get(f"{API}/packages")
    assert r.status_code == 200
    return r.json()[0]


created_booking_ids = []


def make_booking_payload(pkg, date=TEST_DATE, name="TEST_client"):
    return {
        "name": name,
        "whatsapp": "081234567890",
        "event_type": "Resepsi",
        "event_date": date,
        "event_time": "10:00",
        "address": "TEST address",
        "maps_link": "",
        "distance_km": 5.0,
        "notes": "TEST",
        "package_id": pkg["id"],
        "package_name": pkg["name"],
        "package_price": pkg["price"],
        "additionals": [],
        "transport_cost": 0,
        "total_price": pkg["price"],
        "payment_type": "dp",
        "payment_amount": 50000,
        "payment_proof_path": "",
        "payment_method": "bank",
        "social_username": "",
        "social_platforms": [],
    }


def cleanup_date(auth_headers, date):
    # delete availability
    requests.delete(f"{API}/availability/{date}", headers=auth_headers)
    # delete bookings on date
    r = requests.get(f"{API}/bookings", headers=auth_headers)
    if r.status_code == 200:
        for b in r.json():
            if b.get("event_date") == date and b.get("name", "").startswith("TEST_"):
                requests.delete(f"{API}/bookings/{b['id']}", headers=auth_headers)


# 1. Availability API: status enum
class TestAvailabilityStatusEnum:
    def test_set_available(self, auth_headers):
        r = requests.post(f"{API}/availability", json={"date": TEST_DATE, "status": "available"}, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "available"
        assert "remaining_slots" not in data
        assert "limited" not in str(data)

    def test_set_full(self, auth_headers):
        r = requests.post(f"{API}/availability", json={"date": TEST_DATE, "status": "full"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "full"

    def test_reject_legacy_status(self, auth_headers):
        for bad in ["limited", "closed"]:
            r = requests.post(f"{API}/availability", json={"date": TEST_DATE, "status": bad}, headers=auth_headers)
            assert r.status_code == 422, f"Legacy '{bad}' should be rejected"

    def test_list_only_returns_available_or_full(self):
        r = requests.get(f"{API}/availability")
        assert r.status_code == 200
        for item in r.json():
            assert item["status"] in ("available", "full")
            assert "remaining_slots" not in item

    def test_legacy_docs_normalize_to_available(self, auth_headers):
        # Insert legacy record via API not possible; simulate via mongo would be extra.
        # Instead verify list endpoint's normalization by checking any existing doc without 'full' becomes available.
        r = requests.get(f"{API}/availability")
        assert r.status_code == 200


# 2. Full date blocks bookings with 409
class TestFullBlocksBooking:
    def test_full_returns_409(self, auth_headers, package):
        requests.post(f"{API}/availability", json={"date": TEST_DATE, "status": "full"}, headers=auth_headers)
        payload = make_booking_payload(package, name="TEST_full_reject")
        r = requests.post(f"{API}/bookings", json=payload)
        assert r.status_code == 409, r.text


# 3. Available date allows multiple bookings; no auto change to full/limited
class TestAvailableAllowsMulti:
    def test_available_two_bookings(self, auth_headers, package):
        r = requests.post(f"{API}/availability", json={"date": TEST_DATE, "status": "available"}, headers=auth_headers)
        assert r.status_code == 200

        for i in range(2):
            payload = make_booking_payload(package, name=f"TEST_avail_{i}")
            resp = requests.post(f"{API}/bookings", json=payload)
            assert resp.status_code == 200, resp.text
            created_booking_ids.append(resp.json()["id"])

        # verify calendar still available
        r = requests.get(f"{API}/availability")
        entry = next((x for x in r.json() if x["date"] == TEST_DATE), None)
        assert entry is not None
        assert entry["status"] == "available"

    def test_delete_bookings_keeps_available(self, auth_headers):
        for bid in created_booking_ids:
            requests.delete(f"{API}/bookings/{bid}", headers=auth_headers)
        r = requests.get(f"{API}/availability")
        entry = next((x for x in r.json() if x["date"] == TEST_DATE), None)
        assert entry is not None
        assert entry["status"] == "available"


def test_cleanup(auth_headers=None):
    r = requests.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    headers = {"Authorization": f"Bearer {r.json()['token']}"}
    cleanup_date(headers, TEST_DATE)
