"""Backend tests for team CRUD, availability capacity, portfolio image_paths,
Premium transport, and booking sort order (iteration 5)."""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # Fallback for tests running inside container - read from frontend/.env
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"

ADMIN_USER = "fikabisadimartyansyah@gmail.com"
ADMIN_PASS = "Biyan2026"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ================= TEAM CRUD =================
class TestTeamCRUD:
    created_ids = []

    def test_public_team_list(self):
        r = requests.get(f"{API}/team")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_team_mutation_requires_auth(self):
        r = requests.post(f"{API}/team", json={"name": "TEST_x", "role": "r", "description": "d"})
        assert r.status_code == 401

    def test_create_update_delete_team(self, auth):
        payload = {"name": "TEST_Personel", "role": "TEST_Role",
                   "description": "TEST_desc", "photo_path": "/assets/couple.png", "order": 88}
        r = requests.post(f"{API}/team", json=payload, headers=auth)
        assert r.status_code == 200, r.text
        member = r.json()
        mid = member["id"]
        TestTeamCRUD.created_ids.append(mid)
        assert member["name"] == "TEST_Personel"
        assert member["photo_path"] == "/assets/couple.png"

        # GET verifies persistence
        listing = requests.get(f"{API}/team").json()
        assert any(m["id"] == mid and m["role"] == "TEST_Role" for m in listing)

        # Update
        payload_upd = {**payload, "role": "TEST_Role_Updated"}
        r2 = requests.put(f"{API}/team/{mid}", json=payload_upd, headers=auth)
        assert r2.status_code == 200
        listing2 = requests.get(f"{API}/team").json()
        target = next(m for m in listing2 if m["id"] == mid)
        assert target["role"] == "TEST_Role_Updated"

        # Delete
        r3 = requests.delete(f"{API}/team/{mid}", headers=auth)
        assert r3.status_code == 200
        listing3 = requests.get(f"{API}/team").json()
        assert not any(m["id"] == mid for m in listing3)
        TestTeamCRUD.created_ids.remove(mid)


# ================= AVAILABILITY / CAPACITY =================
class TestAvailabilityCapacity:
    test_date_full = "2026-06-06"
    test_date_limited = "2026-06-07"
    test_date_avail = "2026-06-13"
    test_date_overflow = "2026-06-14"
    extra_ids = []

    @classmethod
    def teardown_class(cls):
        # Cleanup TEST_ team members that may remain and availability dates
        # (best-effort; auth token not readily available at teardown class level)
        pass

    def test_capacity_status_mapping(self, auth):
        # Add one TEST_ member to have capacity>=3 (2 seeded + 1)
        payload = {"name": "TEST_ExtraCap", "role": "TEST", "description": "TEST", "photo_path": "/assets/couple.png", "order": 90}
        r = requests.post(f"{API}/team", json=payload, headers=auth)
        assert r.status_code == 200
        mid = r.json()["id"]
        TestAvailabilityCapacity.extra_ids.append(mid)

        capacity = len(requests.get(f"{API}/team").json())
        assert capacity >= 3

        # remaining_slots = 0 -> full
        r = requests.post(f"{API}/availability", json={"date": self.test_date_full, "remaining_slots": 0}, headers=auth)
        assert r.status_code == 200
        assert r.json()["status"] == "full"

        # remaining_slots = 1 -> limited
        r = requests.post(f"{API}/availability", json={"date": self.test_date_limited, "remaining_slots": 1}, headers=auth)
        assert r.status_code == 200
        assert r.json()["status"] == "limited"

        # remaining_slots = capacity -> available
        r = requests.post(f"{API}/availability", json={"date": self.test_date_avail, "remaining_slots": capacity}, headers=auth)
        assert r.status_code == 200
        assert r.json()["status"] == "available"
        assert r.json()["remaining_slots"] == capacity

        # remaining_slots > capacity -> 422
        r = requests.post(f"{API}/availability", json={"date": self.test_date_overflow, "remaining_slots": capacity + 5}, headers=auth)
        assert r.status_code == 422

    def test_clamp_on_delete(self, auth):
        # Set avail to capacity for a date
        capacity = len(requests.get(f"{API}/team").json())
        date_ = "2026-06-20"
        r = requests.post(f"{API}/availability", json={"date": date_, "remaining_slots": capacity}, headers=auth)
        assert r.status_code == 200

        # Delete the extra TEST_ member -> capacity drops -> clamp
        for mid in list(TestAvailabilityCapacity.extra_ids):
            requests.delete(f"{API}/team/{mid}", headers=auth)
            TestAvailabilityCapacity.extra_ids.remove(mid)

        new_capacity = len(requests.get(f"{API}/team").json())
        assert new_capacity < capacity

        items = requests.get(f"{API}/availability").json()
        for item in items:
            if item["date"] == date_:
                assert item["remaining_slots"] <= new_capacity
                assert item["status"] == ("full" if new_capacity == 0 else ("limited" if new_capacity == 1 else "available"))
                break
        # cleanup date
        requests.delete(f"{API}/availability/{date_}", headers=auth)
        for d in [self.test_date_full, self.test_date_limited, self.test_date_avail]:
            requests.delete(f"{API}/availability/{d}", headers=auth)


# ================= PORTFOLIO image_paths =================
class TestPortfolioImagePaths:
    def test_create_portfolio_with_image_paths(self, auth):
        payload = {
            "title": "TEST_Portfolio",
            "couple_name": "TEST",
            "event_date": "2026-06-01",
            "description": "TEST_desc",
            "media_type": "photo",
            "image_paths": ["sesi-resepsi/portfolio/a.jpg", "sesi-resepsi/portfolio/b.jpg"],
        }
        r = requests.post(f"{API}/portfolio", json=payload, headers=auth)
        assert r.status_code == 200, r.text
        item = r.json()
        pid = item["id"]
        assert item["image_paths"] == payload["image_paths"]
        assert item["media_type"] == "photo"

        listing = requests.get(f"{API}/portfolio").json()
        found = next(p for p in listing if p["id"] == pid)
        assert found["image_paths"] == payload["image_paths"]

        # cleanup
        requests.delete(f"{API}/portfolio/{pid}", headers=auth)


# ================= PREMIUM TRANSPORT SERVER RECALC =================
class TestPremiumTransport:
    def test_premium_25km_free(self, auth):
        pkgs = requests.get(f"{API}/packages").json()
        prem = next(p for p in pkgs if p["name"].lower() == "premium")
        b = {
            "name": "TEST_Prem25", "whatsapp": "0800", "event_type": "Resepsi",
            "event_date": "2026-08-01", "event_time": "10:00",
            "address": "TEST", "maps_link": "", "distance_km": 25,
            "package_id": prem["id"], "package_name": prem["name"], "package_price": prem["price"],
            "additionals": [], "transport_cost": 999999,  # forge
            "total_price": 0, "payment_type": "dp", "payment_amount": 50000,
        }
        r = requests.post(f"{API}/bookings", json=b)
        assert r.status_code == 200
        j = r.json()
        assert j["transport_cost"] == 0
        assert j["total_price"] == prem["price"]
        requests.delete(f"{API}/bookings/{j['id']}", headers=auth)

    def test_premium_31km_5000(self, auth):
        pkgs = requests.get(f"{API}/packages").json()
        prem = next(p for p in pkgs if p["name"].lower() == "premium")
        b = {
            "name": "TEST_Prem31", "whatsapp": "0800", "event_type": "Resepsi",
            "event_date": "2026-08-02", "event_time": "10:00",
            "address": "TEST", "maps_link": "", "distance_km": 31,
            "package_id": prem["id"], "package_name": prem["name"], "package_price": prem["price"],
            "additionals": [], "transport_cost": 999999,
            "total_price": 0, "payment_type": "dp", "payment_amount": 50000,
        }
        r = requests.post(f"{API}/bookings", json=b)
        assert r.status_code == 200
        j = r.json()
        assert j["transport_cost"] == 5000
        assert j["total_price"] == prem["price"] + 5000
        requests.delete(f"{API}/bookings/{j['id']}", headers=auth)


# ================= BOOKING SORT ORDER =================
class TestBookingSort:
    def test_bookings_sorted_by_date_time(self, auth):
        pkgs = requests.get(f"{API}/packages").json()
        basic = next(p for p in pkgs if p["name"].lower() == "basic")
        ids = []
        entries = [
            ("2026-09-12", "10:00"),
            ("2026-09-05", "14:00"),
            ("2026-09-05", "09:00"),
        ]
        for d, t in entries:
            b = {"name": "TEST_Sort", "whatsapp": "0", "event_type": "R",
                 "event_date": d, "event_time": t,
                 "address": "TEST", "maps_link": "", "distance_km": 5,
                 "package_id": basic["id"], "package_name": basic["name"], "package_price": basic["price"],
                 "additionals": [], "transport_cost": 0, "total_price": basic["price"],
                 "payment_type": "dp", "payment_amount": 50000}
            r = requests.post(f"{API}/bookings", json=b)
            assert r.status_code == 200
            ids.append(r.json()["id"])

        listing = requests.get(f"{API}/bookings", headers=auth).json()
        # Filter to TEST_Sort only
        mine = [b for b in listing if b["id"] in ids]
        assert len(mine) == 3
        assert [(b["event_date"], b["event_time"]) for b in mine] == [
            ("2026-09-05", "09:00"),
            ("2026-09-05", "14:00"),
            ("2026-09-12", "10:00"),
        ]

        # cleanup
        for bid in ids:
            requests.delete(f"{API}/bookings/{bid}", headers=auth)
