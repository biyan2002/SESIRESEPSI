"""Iteration 6: Test availability behavior (closed vs default available) and Additional.max_quantity."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Read from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")

TEST_DATES = ["2026-10-15", "2026-10-17", "2026-10-19", "2026-10-21"]


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "fikabisadimartyansyah@gmail.com",
        "password": "Biyan2026",
    })
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module", autouse=True)
def cleanup(auth_headers):
    yield
    for d in TEST_DATES:
        requests.delete(f"{BASE_URL}/api/availability/{d}", headers=auth_headers)


# ---------- Availability tests ----------

def test_default_date_no_record_means_available():
    """Dates without record: not in availability list => frontend defaults to available."""
    r = requests.get(f"{BASE_URL}/api/availability")
    assert r.status_code == 200
    dates = {a["date"] for a in r.json()}
    # ensure we start clean
    for d in TEST_DATES:
        if d in dates:
            requests.delete(f"{BASE_URL}/api/availability/{d}")
    r2 = requests.get(f"{BASE_URL}/api/availability")
    dates2 = {a["date"] for a in r2.json()}
    for d in TEST_DATES:
        assert d not in dates2, f"{d} should have no record initially"


def test_set_closed_status(auth_headers):
    r = requests.post(f"{BASE_URL}/api/availability",
                     json={"date": "2026-10-17", "status": "closed"},
                     headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "closed"
    assert data["remaining_slots"] == 0

    # confirm persisted
    r2 = requests.get(f"{BASE_URL}/api/availability")
    entry = next((a for a in r2.json() if a["date"] == "2026-10-17"), None)
    assert entry is not None
    assert entry["status"] == "closed"


def test_set_remaining_slots_0_is_full(auth_headers):
    r = requests.post(f"{BASE_URL}/api/availability",
                     json={"date": "2026-10-19", "remaining_slots": 0},
                     headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "full"
    assert r.json()["remaining_slots"] == 0


def test_set_remaining_slots_1_is_limited(auth_headers):
    r = requests.post(f"{BASE_URL}/api/availability",
                     json={"date": "2026-10-21", "remaining_slots": 1},
                     headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "limited"
    assert r.json()["remaining_slots"] == 1


def test_set_remaining_slots_2_is_available(auth_headers):
    r = requests.post(f"{BASE_URL}/api/availability",
                     json={"date": "2026-10-15", "remaining_slots": 2},
                     headers=auth_headers)
    # capacity depends on team_members; default seed = 2 members => cap=2, so 2 is OK
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "available"
    assert r.json()["remaining_slots"] == 2


# ---------- Additional.max_quantity tests ----------

def test_additional_has_max_quantity_field():
    r = requests.get(f"{BASE_URL}/api/additionals")
    assert r.status_code == 200
    items = r.json()
    assert len(items) > 0
    for a in items:
        assert "max_quantity" in a, f"missing max_quantity in {a}"
        assert isinstance(a["max_quantity"], int)
        assert 1 <= a["max_quantity"] <= 99


def test_update_additional_max_quantity(auth_headers):
    r = requests.get(f"{BASE_URL}/api/additionals")
    items = r.json()
    target = items[0]
    original_max = target["max_quantity"]

    try:
        payload = {**target, "max_quantity": 3}
        r2 = requests.put(f"{BASE_URL}/api/additionals/{target['id']}",
                         json=payload, headers=auth_headers)
        assert r2.status_code == 200, r2.text
        assert r2.json()["max_quantity"] == 3

        # GET to verify persistence
        r3 = requests.get(f"{BASE_URL}/api/additionals")
        updated = next(a for a in r3.json() if a["id"] == target["id"])
        assert updated["max_quantity"] == 3
    finally:
        # restore original value
        restore = {**target, "max_quantity": original_max}
        requests.put(f"{BASE_URL}/api/additionals/{target['id']}",
                    json=restore, headers=auth_headers)
        r4 = requests.get(f"{BASE_URL}/api/additionals")
        restored = next(a for a in r4.json() if a["id"] == target["id"])
        assert restored["max_quantity"] == original_max


def test_max_quantity_validation(auth_headers):
    """max_quantity must be 1..99."""
    r = requests.get(f"{BASE_URL}/api/additionals")
    target = r.json()[0]
    bad = {**target, "max_quantity": 100}
    r2 = requests.put(f"{BASE_URL}/api/additionals/{target['id']}",
                     json=bad, headers=auth_headers)
    assert r2.status_code == 422

    bad2 = {**target, "max_quantity": 0}
    r3 = requests.put(f"{BASE_URL}/api/additionals/{target['id']}",
                     json=bad2, headers=auth_headers)
    assert r3.status_code == 422
