"""Iteration 10 tests: weekday fee, crew assignment/team_fee, finance summary, crew job delete rules,
and validate obsolete admin work upload endpoint is gone."""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://pink-wedding-studio.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN_USER = "fikabisadimartyansyah@gmail.com"
ADMIN_PASS = "Biyan2026"

# Weekday non-holiday (Monday) 2027 — not in NATIONAL_HOLIDAYS_2026 set
WEEKDAY_DATE = "2027-01-18"  # Monday
WEEKEND_DATE = "2027-01-16"  # Saturday


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def package(admin_headers):
    r = requests.get(f"{API}/packages", timeout=30)
    assert r.status_code == 200
    pkgs = r.json()
    assert pkgs
    return pkgs[0]


created_bookings: list = []
created_crew_accounts: list = []
created_team_members: list = []


def make_booking_payload(pkg, event_date, name_prefix="TEST_"):
    return {
        "name": f"{name_prefix}{uuid.uuid4().hex[:6]}",
        "whatsapp": "081234567890",
        "event_type": "Resepsi",
        "event_date": event_date,
        "event_time": "10:00",
        "address": "Jl Test",
        "maps_link": "",
        "distance_km": 5,
        "notes": "TEST",
        "package_id": pkg["id"],
        "package_name": pkg["name"],
        "package_price": pkg["price"],
        "additionals": [{"id": "x", "name": "Extra time", "qty": 1, "price": 50000, "subtotal": 50000}],
        "transport_cost": 0,
        "total_price": pkg["price"] + 50000,
        "payment_type": "dp",
        "payment_amount": 100000,
        "payment_method": "bank",
        "social_username": "@test",
        "social_platforms": ["Instagram"],
    }


class TestWeekdayFee:
    def test_weekday_booking_has_50k_fee(self, admin_headers, package):
        payload = make_booking_payload(package, WEEKDAY_DATE)
        r = requests.post(f"{API}/admin/bookings", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        created_bookings.append(b["id"])
        assert b["weekday_fee"] == 50000
        expected_total = package["price"] + 50000 + 0 + 50000  # pkg + additional + transport(0) + weekday
        assert b["total_price"] == expected_total, f"expected {expected_total}, got {b['total_price']}"

    def test_weekend_booking_has_no_fee(self, admin_headers, package):
        payload = make_booking_payload(package, WEEKEND_DATE)
        r = requests.post(f"{API}/admin/bookings", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        created_bookings.append(b["id"])
        assert b["weekday_fee"] == 0
        assert b["total_price"] == package["price"] + 50000  # pkg + additional only

    def test_invoice_pdf_contains_weekday_line(self, admin_headers, package):
        # use first weekday booking id
        assert created_bookings
        bid = created_bookings[0]
        r = requests.get(f"{API}/invoices/{bid}/download", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/pdf")
        from io import BytesIO
        from pypdf import PdfReader
        reader = PdfReader(BytesIO(r.content))
        text = "\n".join((p.extract_text() or "") for p in reader.pages)
        assert "Tambahan hari kerja" in text, f"invoice missing weekday line. text={text[:500]}"
        assert "50.000" in text


@pytest.fixture(scope="session")
def temp_team_member(admin_headers):
    payload = {
        "name": f"TEST_Crew_{uuid.uuid4().hex[:6]}",
        "role": "Crew",
        "description": "test",
        "photo_path": "",
        "order": 99,
    }
    r = requests.post(f"{API}/team", headers=admin_headers, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    m = r.json()
    created_team_members.append(m["id"])
    return m


@pytest.fixture(scope="session")
def temp_crew_account(admin_headers, temp_team_member):
    uname = f"test_crew_{uuid.uuid4().hex[:6]}"
    pwd = "TestPass123"
    r = requests.post(f"{API}/crew-accounts", headers=admin_headers, json={
        "member_id": temp_team_member["id"], "username": uname, "password": pwd, "active": True
    }, timeout=30)
    assert r.status_code == 200, r.text
    acct = r.json()
    created_crew_accounts.append(acct["id"])
    # Login to get token
    lr = requests.post(f"{API}/auth/crew/login", json={"username": uname, "password": pwd}, timeout=30)
    assert lr.status_code == 200, lr.text
    return {"account": acct, "token": lr.json()["token"], "member": temp_team_member, "username": uname, "password": pwd}


class TestCrewAssignmentAndFee:
    def test_assign_crew_to_weekday_booking(self, admin_headers, temp_crew_account):
        booking_id = created_bookings[0]
        payload = {"assignments": [{"crew_member_id": temp_crew_account["member"]["id"], "job_title": "Videografer", "notes": "TEST"}]}
        r = requests.put(f"{API}/bookings/{booking_id}/assignments", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data) == 1
        assert data[0]["crew_member_id"] == temp_crew_account["member"]["id"]

    def test_list_bookings_returns_assigned_crew_with_team_fee(self, admin_headers, temp_crew_account, package):
        r = requests.get(f"{API}/bookings", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        target = [b for b in r.json() if b["id"] == created_bookings[0]]
        assert target, "weekday booking missing"
        b = target[0]
        assert "assigned_crew" in b and len(b["assigned_crew"]) == 1
        crew = b["assigned_crew"][0]
        assert crew["name"] == temp_crew_account["member"]["name"]
        assert crew["job_title"] == "Videografer"
        expected_fee = max(b["total_price"] - 50000, 0)
        assert crew["team_fee"] == expected_fee


class TestCrewJobsFlow:
    def test_crew_jobs_returns_team_fee(self, temp_crew_account):
        headers = {"Authorization": f"Bearer {temp_crew_account['token']}"}
        r = requests.get(f"{API}/crew/jobs", headers=headers, timeout=30)
        assert r.status_code == 200
        jobs = r.json()
        assert jobs, "crew job list empty"
        assert jobs[0]["team_fee"] > 0

    def test_crew_cannot_delete_pending_own_job(self, temp_crew_account):
        headers = {"Authorization": f"Bearer {temp_crew_account['token']}"}
        r = requests.get(f"{API}/crew/jobs", headers=headers, timeout=30)
        assignment_id = r.json()[0]["assignment"]["id"]
        d = requests.delete(f"{API}/crew/jobs/{assignment_id}", headers=headers, timeout=30)
        assert d.status_code == 422, d.text

    def test_crew_can_update_drive_and_status(self, temp_crew_account):
        headers = {"Authorization": f"Bearer {temp_crew_account['token']}"}
        r = requests.get(f"{API}/crew/jobs", headers=headers, timeout=30)
        assignment_id = r.json()[0]["assignment"]["id"]
        p = requests.patch(f"{API}/crew/jobs/{assignment_id}/work", headers=headers, json={
            "work_drive_url": "https://drive.google.com/testlink",
            "work_status": "completed",
        }, timeout=30)
        assert p.status_code == 200, p.text
        assert p.json()["work_status"] == "completed"

    def test_admin_bookings_shows_crew_work_drive(self, admin_headers):
        r = requests.get(f"{API}/bookings", headers=admin_headers, timeout=30)
        b = next(x for x in r.json() if x["id"] == created_bookings[0])
        assert b["assigned_crew"][0]["work_drive_url"] == "https://drive.google.com/testlink"

    def test_obsolete_admin_work_endpoint_removed(self, admin_headers):
        r = requests.patch(f"{API}/bookings/{created_bookings[0]}/work", headers=admin_headers, json={
            "work_drive_url": "https://x", "work_status": "completed"}, timeout=30)
        # Should not exist -> 404 or 405
        assert r.status_code in (404, 405), f"unexpected {r.status_code}: {r.text}"

    def test_other_crew_cannot_delete(self, admin_headers, temp_team_member):
        # Create a 2nd crew account and try to delete first crew's job
        member_payload = {"name": f"TEST_CrewB_{uuid.uuid4().hex[:6]}", "role": "Crew", "description": "", "photo_path": "", "order": 99}
        m = requests.post(f"{API}/team", headers=admin_headers, json=member_payload, timeout=30).json()
        created_team_members.append(m["id"])
        uname = f"test_crewb_{uuid.uuid4().hex[:6]}"
        acct = requests.post(f"{API}/crew-accounts", headers=admin_headers, json={
            "member_id": m["id"], "username": uname, "password": "TestPass123", "active": True}, timeout=30).json()
        created_crew_accounts.append(acct["id"])
        lr = requests.post(f"{API}/auth/crew/login", json={"username": uname, "password": "TestPass123"}, timeout=30)
        tok = lr.json()["token"]

        # Find first crew's assignment id
        first_headers = {"Authorization": f"Bearer {tok}"}
        # Assignment is on first crew - fetch via admin
        assignments = requests.get(f"{API}/bookings/{created_bookings[0]}/assignments", headers=admin_headers, timeout=30).json()
        first_assign_id = assignments[0]["id"]
        r = requests.delete(f"{API}/crew/jobs/{first_assign_id}", headers=first_headers, timeout=30)
        assert r.status_code == 404, r.text

    def test_crew_can_delete_completed_own_job(self, temp_crew_account):
        headers = {"Authorization": f"Bearer {temp_crew_account['token']}"}
        r = requests.get(f"{API}/crew/jobs", headers=headers, timeout=30)
        assert r.json(), "job disappeared"
        assignment_id = r.json()[0]["assignment"]["id"]
        d = requests.delete(f"{API}/crew/jobs/{assignment_id}", headers=headers, timeout=30)
        assert d.status_code == 200, d.text


class TestFinanceSummary:
    def test_finance_requires_admin(self):
        r = requests.get(f"{API}/finance/summary", timeout=30)
        assert r.status_code == 401

    def test_finance_contains_weekday_booking(self, admin_headers, package):
        r = requests.get(f"{API}/finance/summary", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "overall" in data and "daily" in data and "weekly" in data and "monthly" in data
        # Overall counts >= our created bookings
        assert data["overall"]["booking_count"] >= len(created_bookings)
        # Today's daily should have entry (created_at is today)
        today = datetime.now(timezone.utc).date().isoformat()
        daily_today = [d for d in data["daily"] if d["label"] == today]
        assert daily_today, f"no daily bucket for {today}"
        # incoming for today should be at least our payment_amounts (2 x 100000)
        assert daily_today[0]["incoming"] >= 200000


class TestCleanup:
    def test_cleanup(self, admin_headers):
        # delete bookings
        for bid in created_bookings:
            requests.delete(f"{API}/bookings/{bid}", headers=admin_headers, timeout=30)
        # delete crew accounts
        for aid in created_crew_accounts:
            requests.delete(f"{API}/crew-accounts/{aid}", headers=admin_headers, timeout=30)
        # delete team members (cascade deletes accounts & assignments too)
        for mid in created_team_members:
            requests.delete(f"{API}/team/{mid}", headers=admin_headers, timeout=30)
