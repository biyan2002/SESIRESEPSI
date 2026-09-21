"""Iteration 7 backend tests: Availability, Social, Payments, Invoice, Crew RBAC, Portfolio."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env if not exported
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")

API = f"{BASE_URL}/api"
ADMIN_USER = "fikabisadimartyansyah@gmail.com"
ADMIN_PASS = "Biyan2026"

TEST_DATES = ["2027-05-01", "2027-05-02", "2027-05-03"]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def default_package():
    r = requests.get(f"{API}/packages")
    assert r.status_code == 200
    return r.json()[0]


def _booking_payload(pkg, event_date, name_suffix=""):
    return {
        "name": f"TEST_ {name_suffix or uuid.uuid4().hex[:6]}",
        "whatsapp": "0812340000",
        "event_type": "Resepsi",
        "event_date": event_date,
        "event_time": "10:00",
        "address": "Jakarta test",
        "maps_link": "https://maps.google.com/?q=1,1",
        "distance_km": 5.0,
        "notes": "TEST booking",
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
        "social_username": "@test_user",
        "social_platforms": ["Instagram"],
    }


# ================= AVAILABILITY =================
class TestAvailability:
    def test_empty_date_no_record(self, admin_headers):
        # ensure clean
        requests.delete(f"{API}/availability/{TEST_DATES[0]}", headers=admin_headers)
        r = requests.get(f"{API}/availability")
        dates = [d["date"] for d in r.json()]
        assert TEST_DATES[0] not in dates

    def test_slot_decrement_on_booking(self, admin_headers, default_package):
        date = TEST_DATES[1]
        # cleanup
        requests.delete(f"{API}/availability/{date}", headers=admin_headers)
        # set remaining_slots=2
        r = requests.post(f"{API}/availability", json={"date": date, "remaining_slots": 2}, headers=admin_headers)
        assert r.status_code == 200, r.text
        assert r.json()["remaining_slots"] == 2
        assert r.json()["status"] == "available"

        # create TEST booking
        r = requests.post(f"{API}/bookings", json=_booking_payload(default_package, date, "slot"))
        assert r.status_code == 200, r.text
        booking = r.json()
        booking_id = booking["id"]

        # verify decremented to 1 + limited
        r = requests.get(f"{API}/availability")
        rec = next(d for d in r.json() if d["date"] == date)
        assert rec["remaining_slots"] == 1
        assert rec["status"] == "limited"

        # delete booking → releases slot
        r = requests.delete(f"{API}/bookings/{booking_id}", headers=admin_headers)
        assert r.status_code == 200
        r = requests.get(f"{API}/availability")
        rec = next(d for d in r.json() if d["date"] == date)
        assert rec["remaining_slots"] == 2

        # cleanup
        requests.delete(f"{API}/availability/{date}", headers=admin_headers)

    def test_no_tutup_option_semantics(self, admin_headers):
        # POST with status='closed' but no slots is normalized (legacy) — but 'closed' should not appear as user-facing state
        # The system does not enforce a Tutup path since capacity=2, slots default derived. Confirm we can create/delete without 'closed' being sticky.
        date = TEST_DATES[2]
        requests.delete(f"{API}/availability/{date}", headers=admin_headers)
        r = requests.post(f"{API}/availability", json={"date": date, "remaining_slots": 0}, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "full"
        requests.delete(f"{API}/availability/{date}", headers=admin_headers)


# ================= SOCIAL & PAYMENT PERSISTENCE =================
class TestSocialAndPayment:
    def test_social_persisted_in_booking(self, admin_headers, default_package):
        date = "2027-06-10"
        requests.delete(f"{API}/availability/{date}", headers=admin_headers)
        payload = _booking_payload(default_package, date, "social")
        payload["social_username"] = "@testcouple"
        payload["social_platforms"] = ["Instagram", "TikTok"]
        r = requests.post(f"{API}/bookings", json=payload)
        assert r.status_code == 200
        b = r.json()
        assert b["social_username"] == "@testcouple"
        assert b["social_platforms"] == ["Instagram", "TikTok"]
        # persistence: list
        r2 = requests.get(f"{API}/bookings", headers=admin_headers)
        found = next((x for x in r2.json() if x["id"] == b["id"]), None)
        assert found is not None
        assert found["social_platforms"] == ["Instagram", "TikTok"]
        requests.delete(f"{API}/bookings/{b['id']}", headers=admin_headers)
        requests.delete(f"{API}/availability/{date}", headers=admin_headers)

    def test_payment_settings_defaults(self):
        r = requests.get(f"{API}/payment-settings")
        assert r.status_code == 200
        data = r.json()
        assert "bank_accounts" in data
        assert "ewallet_accounts" in data
        assert "qris_image_path" in data
        assert isinstance(data["bank_accounts"], list)


# ================= INVOICE =================
class TestInvoice:
    def test_unique_invoice_and_pdf_download(self, admin_headers, default_package):
        d1, d2 = "2027-07-01", "2027-07-02"
        for d in (d1, d2):
            requests.delete(f"{API}/availability/{d}", headers=admin_headers)

        r1 = requests.post(f"{API}/bookings", json=_booking_payload(default_package, d1, "inv1"))
        r2 = requests.post(f"{API}/bookings", json=_booking_payload(default_package, d2, "inv2"))
        assert r1.status_code == 200 and r2.status_code == 200
        b1, b2 = r1.json(), r2.json()

        assert b1["invoice_number"].startswith("SR-")
        assert b2["invoice_number"].startswith("SR-")
        assert b1["invoice_number"] != b2["invoice_number"]
        assert b1["invoice_url"].startswith("/api/invoices/")
        assert b2["invoice_url"].startswith("/api/invoices/")

        # public download via token
        r = requests.get(f"{BASE_URL}{b1['invoice_url']}")
        assert r.status_code == 200, r.text
        assert "application/pdf" in r.headers.get("Content-Type", "")
        assert r.content.startswith(b"%PDF")
        assert len(r.content) > 1000

        # bad token → 403
        bad = f"{API}/invoices/{b1['id']}/download?token=invalid"
        r = requests.get(bad)
        assert r.status_code == 403

        # admin without token works
        r = requests.get(f"{API}/invoices/{b1['id']}/download", headers=admin_headers)
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("Content-Type", "")

        # cleanup
        for b in (b1, b2):
            requests.delete(f"{API}/bookings/{b['id']}", headers=admin_headers)
        for d in (d1, d2):
            requests.delete(f"{API}/availability/{d}", headers=admin_headers)


# ================= CREW RBAC =================
class TestCrewRBAC:
    def test_crew_full_flow(self, admin_headers, default_package):
        # get a team member
        r = requests.get(f"{API}/team")
        assert r.status_code == 200
        members = r.json()
        assert len(members) >= 1
        member = members[0]

        # create crew account
        uname = f"test_crew_{uuid.uuid4().hex[:6]}"
        pwd = "TempPass123"
        payload = {"member_id": member["id"], "username": uname, "password": pwd, "active": True}
        r = requests.post(f"{API}/crew-accounts", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        account = r.json()
        account_id = account["id"]

        try:
            # crew login
            r = requests.post(f"{API}/auth/crew/login", json={"username": uname, "password": pwd})
            assert r.status_code == 200, r.text
            crew_token = r.json()["token"]
            crew_headers = {"Authorization": f"Bearer {crew_token}"}

            # crew accessing admin-only endpoint → 403
            r = requests.get(f"{API}/bookings", headers=crew_headers)
            assert r.status_code == 403

            # crew /jobs empty
            r = requests.get(f"{API}/crew/jobs", headers=crew_headers)
            assert r.status_code == 200
            assert r.json() == []

            # admin creates booking + assignment
            date = "2027-08-01"
            requests.delete(f"{API}/availability/{date}", headers=admin_headers)
            r = requests.post(f"{API}/bookings", json=_booking_payload(default_package, date, "crew"))
            assert r.status_code == 200
            booking = r.json()

            r = requests.put(
                f"{API}/bookings/{booking['id']}/assignments",
                json={"assignments": [{"crew_member_id": member["id"], "job_title": "Photographer", "notes": "Bawa lensa 50mm"}]},
                headers=admin_headers,
            )
            assert r.status_code == 200, r.text

            # crew /jobs now returns it
            r = requests.get(f"{API}/crew/jobs", headers=crew_headers)
            assert r.status_code == 200
            jobs = r.json()
            assert len(jobs) == 1
            job = jobs[0]
            assert job["booking"]["id"] == booking["id"]
            assert job["booking"]["event_date"] == date
            assert job["booking"]["address"]
            assert job["assignment"]["job_title"] == "Photographer"
            assert job["assignment"]["notes"] == "Bawa lensa 50mm"

            # admin token cannot access crew endpoint (needs role=crew)
            r = requests.get(f"{API}/crew/jobs", headers=admin_headers)
            assert r.status_code == 403

            # cleanup booking + assignment
            requests.put(
                f"{API}/bookings/{booking['id']}/assignments",
                json={"assignments": []},
                headers=admin_headers,
            )
            requests.delete(f"{API}/bookings/{booking['id']}", headers=admin_headers)
            requests.delete(f"{API}/availability/{date}", headers=admin_headers)
        finally:
            requests.delete(f"{API}/crew-accounts/{account_id}", headers=admin_headers)


# ================= PORTFOLIO =================
class TestPortfolio:
    def test_portfolio_drive_and_photo(self, admin_headers):
        payload = {
            "title": "TEST_ Drive Preview",
            "couple_name": "TEST couple",
            "event_date": "2027-01-01",
            "description": "TEST",
            "media_type": "drive",
            "drive_url": "https://drive.google.com/file/d/TESTFILEID/preview",
            "image_paths": ["sesi-resepsi/test/img1.jpg"],
        }
        r = requests.post(f"{API}/portfolio", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        item = r.json()
        assert item["drive_url"] == payload["drive_url"]
        assert item["image_paths"] == payload["image_paths"]

        r2 = requests.get(f"{API}/portfolio")
        assert r2.status_code == 200
        found = next((x for x in r2.json() if x["id"] == item["id"]), None)
        assert found is not None
        assert found["drive_url"] == payload["drive_url"]

        # cleanup
        requests.delete(f"{API}/portfolio/{item['id']}", headers=admin_headers)
