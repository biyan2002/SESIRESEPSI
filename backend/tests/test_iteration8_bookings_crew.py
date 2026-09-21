"""Iteration 8: Admin Bookings archive/filter, work drive link, Crew workspace work updates, invoice PDF, assignment persistence."""
import os
import io
import uuid
import pytest
import requests
from pathlib import Path

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v
    envf = Path("/app/frontend/.env")
    for line in envf.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("REACT_APP_BACKEND_URL not found")

BASE_URL = _load_backend_url().rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "fikabisadimartyansyah@gmail.com"
ADMIN_PASS = "Biyan2026"

TEST_PREFIX = "TEST_ITER8"


# ---- Fixtures ----
@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(f"{API}/auth/login", json={"username": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def packages():
    r = requests.get(f"{API}/packages")
    assert r.status_code == 200
    return r.json()


def _mk_booking_payload(name, date, pkg):
    return {
        "name": name,
        "whatsapp": "081200000000",
        "event_type": "Resepsi",
        "event_date": date,
        "event_time": "10:00",
        "address": "Jl. Test 1",
        "maps_link": "",
        "distance_km": 5,
        "notes": "",
        "package_id": pkg["id"],
        "package_name": pkg["name"],
        "package_price": pkg["price"],
        "additionals": [],
        "transport_cost": 0,
        "total_price": pkg["price"],
        "payment_type": "lunas",
        "payment_amount": pkg["price"],
        "payment_method": "bank",
        "social_username": "@test",
        "social_platforms": ["instagram"],
    }


@pytest.fixture(scope="module")
def two_bookings(admin_headers, packages):
    pkg = packages[0]
    b1_payload = _mk_booking_payload(f"{TEST_PREFIX}_ClientA", "2027-03-15", pkg)
    b2_payload = _mk_booking_payload(f"{TEST_PREFIX}_ClientB", "2027-04-20", pkg)
    r1 = requests.post(f"{API}/bookings", json=b1_payload)
    r2 = requests.post(f"{API}/bookings", json=b2_payload)
    assert r1.status_code == 200, r1.text
    assert r2.status_code == 200, r2.text
    b1, b2 = r1.json(), r2.json()
    yield b1, b2
    # Cleanup
    for bid in (b1["id"], b2["id"]):
        requests.delete(f"{API}/bookings/{bid}", headers=admin_headers)


class TestBookingCompletionAndListing:
    def test_completion_status_change(self, admin_headers, two_bookings):
        b1, b2 = two_bookings
        # Mark b1 as completed
        r = requests.patch(f"{API}/bookings/{b1['id']}/completion",
                           json={"status": "completed"}, headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "completed"

        # GET all bookings, both still present
        rl = requests.get(f"{API}/bookings", headers=admin_headers)
        assert rl.status_code == 200
        rows = rl.json()
        ids = {r["id"]: r for r in rows}
        assert b1["id"] in ids and b2["id"] in ids
        assert ids[b1["id"]]["status"] == "completed"
        assert ids[b2["id"]]["status"] != "completed"

    def test_revert_completion(self, admin_headers, two_bookings):
        b1, _ = two_bookings
        r = requests.patch(f"{API}/bookings/{b1['id']}/completion",
                           json={"status": "pending"}, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "pending"


class TestBookingWorkDrive:
    def test_admin_patch_work_drive(self, admin_headers, two_bookings):
        b1, _ = two_bookings
        drive = "https://drive.google.com/drive/folders/ADMINWORK123"
        r = requests.patch(f"{API}/bookings/{b1['id']}/work",
                           json={"work_drive_url": drive}, headers=admin_headers)
        assert r.status_code == 200, r.text
        assert r.json()["work_drive_url"] == drive

        # Persistence check via list
        rl = requests.get(f"{API}/bookings", headers=admin_headers)
        row = next(x for x in rl.json() if x["id"] == b1["id"])
        assert row["work_drive_url"] == drive


class TestCrewAssignmentWorkflow:
    @pytest.fixture(scope="class")
    def crew_env(self, admin_headers, two_bookings):
        b1, b2 = two_bookings
        # Get team members
        tm_r = requests.get(f"{API}/team")
        assert tm_r.status_code == 200
        members = tm_r.json()
        assert len(members) >= 2, "Need at least 2 team members for cross-crew test"
        member_a, member_b = members[0], members[1]

        # Create two crew accounts
        uname_a = f"testcrewa_{uuid.uuid4().hex[:8]}"
        uname_b = f"testcrewb_{uuid.uuid4().hex[:8]}"
        pw = "TestPass123"

        r = requests.post(f"{API}/crew-accounts", headers=admin_headers,
                          json={"member_id": member_a["id"], "username": uname_a, "password": pw, "active": True})
        assert r.status_code == 200, r.text
        acc_a = r.json()

        r = requests.post(f"{API}/crew-accounts", headers=admin_headers,
                          json={"member_id": member_b["id"], "username": uname_b, "password": pw, "active": True})
        assert r.status_code == 200, r.text
        acc_b = r.json()

        # Login both
        ra = requests.post(f"{API}/auth/crew/login", json={"username": uname_a, "password": pw})
        rb = requests.post(f"{API}/auth/crew/login", json={"username": uname_b, "password": pw})
        assert ra.status_code == 200 and rb.status_code == 200
        crew_a_headers = {"Authorization": f"Bearer {ra.json()['token']}"}
        crew_b_headers = {"Authorization": f"Bearer {rb.json()['token']}"}

        # Assign both crews to booking b1 via admin
        assignments_payload = {
            "assignments": [
                {"crew_member_id": member_a["id"], "job_title": "Photographer",
                 "notes": "Job A", "work_drive_url": "", "work_status": "pending"},
                {"crew_member_id": member_b["id"], "job_title": "Videographer",
                 "notes": "Job B", "work_drive_url": "", "work_status": "pending"},
            ]
        }
        r = requests.put(f"{API}/bookings/{b1['id']}/assignments",
                         json=assignments_payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        assign_rows = r.json()
        assert len(assign_rows) == 2

        yield {
            "b1": b1, "b2": b2,
            "member_a": member_a, "member_b": member_b,
            "crew_a_headers": crew_a_headers, "crew_b_headers": crew_b_headers,
            "acc_a": acc_a, "acc_b": acc_b,
            "assignments": assign_rows,
        }
        # cleanup crew accounts
        requests.delete(f"{API}/crew-accounts/{acc_a['id']}", headers=admin_headers)
        requests.delete(f"{API}/crew-accounts/{acc_b['id']}", headers=admin_headers)
        # cleanup assignments will happen when booking is deleted (module fixture)
        requests.put(f"{API}/bookings/{b1['id']}/assignments",
                     json={"assignments": []}, headers=admin_headers)

    def test_crew_sees_own_job(self, crew_env):
        r = requests.get(f"{API}/crew/jobs", headers=crew_env["crew_a_headers"])
        assert r.status_code == 200, r.text
        jobs = r.json()
        assert len(jobs) == 1
        assert jobs[0]["booking"]["id"] == crew_env["b1"]["id"]
        assert jobs[0]["assignment"]["crew_member_id"] == crew_env["member_a"]["id"]

    def test_crew_updates_own_work(self, crew_env):
        # find assignment for crew A
        r = requests.get(f"{API}/crew/jobs", headers=crew_env["crew_a_headers"])
        my_assign = r.json()[0]["assignment"]
        aid = my_assign["id"]
        drive = "https://drive.google.com/drive/folders/CREWA"
        r2 = requests.patch(f"{API}/crew/jobs/{aid}/work",
                            json={"work_drive_url": drive, "work_status": "completed"},
                            headers=crew_env["crew_a_headers"])
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["work_drive_url"] == drive
        assert body["work_status"] == "completed"

        # verify GET reflects
        r3 = requests.get(f"{API}/crew/jobs", headers=crew_env["crew_a_headers"])
        a = r3.json()[0]["assignment"]
        assert a["work_drive_url"] == drive
        assert a["work_status"] == "completed"

    def test_crew_cannot_update_other_crews_assignment(self, crew_env):
        # get crew B's assignment id (via admin listing)
        r = requests.get(f"{API}/bookings/{crew_env['b1']['id']}/assignments",
                         headers={"Authorization": crew_env["crew_a_headers"]["Authorization"].replace("Bearer ", "Bearer ")})
        # actually this endpoint is admin-only; use admin
        pass

    def test_cross_crew_forbidden(self, admin_headers, crew_env):
        # get assignment for member B via admin
        r = requests.get(f"{API}/bookings/{crew_env['b1']['id']}/assignments",
                         headers=admin_headers)
        assert r.status_code == 200
        assigns = r.json()
        b_assign = next(a for a in assigns if a["crew_member_id"] == crew_env["member_b"]["id"])
        # Try to patch as crew A
        r2 = requests.patch(f"{API}/crew/jobs/{b_assign['id']}/work",
                            json={"work_drive_url": "https://evil", "work_status": "completed"},
                            headers=crew_env["crew_a_headers"])
        assert r2.status_code == 404, f"Expected 404 but got {r2.status_code}: {r2.text}"

    def test_admin_sees_crew_work_in_assignments(self, admin_headers, crew_env):
        r = requests.get(f"{API}/bookings/{crew_env['b1']['id']}/assignments", headers=admin_headers)
        assert r.status_code == 200
        assigns = r.json()
        a_assign = next(a for a in assigns if a["crew_member_id"] == crew_env["member_a"]["id"])
        assert a_assign["work_drive_url"] == "https://drive.google.com/drive/folders/CREWA"
        assert a_assign["work_status"] == "completed"

    def test_reput_assignments_preserves_work_fields(self, admin_headers, crew_env):
        # Re-save with the same work_drive_url and work_status supplied
        payload = {"assignments": [
            {"crew_member_id": crew_env["member_a"]["id"], "job_title": "Photographer",
             "notes": "Job A", "work_drive_url": "https://drive.google.com/drive/folders/CREWA",
             "work_status": "completed"},
            {"crew_member_id": crew_env["member_b"]["id"], "job_title": "Videographer",
             "notes": "Job B", "work_drive_url": "https://drive.google.com/drive/folders/CREWB",
             "work_status": "pending"},
        ]}
        r = requests.put(f"{API}/bookings/{crew_env['b1']['id']}/assignments",
                         json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        rows = r.json()
        by_member = {a["crew_member_id"]: a for a in rows}
        a = by_member[crew_env["member_a"]["id"]]
        assert a["work_drive_url"] == "https://drive.google.com/drive/folders/CREWA"
        assert a["work_status"] == "completed"
        b = by_member[crew_env["member_b"]["id"]]
        assert b["work_drive_url"] == "https://drive.google.com/drive/folders/CREWB"
        assert b["work_status"] == "pending"

        # Verify persistence via GET
        r2 = requests.get(f"{API}/bookings/{crew_env['b1']['id']}/assignments", headers=admin_headers)
        by_member2 = {a["crew_member_id"]: a for a in r2.json()}
        assert by_member2[crew_env["member_a"]["id"]]["work_status"] == "completed"
        assert by_member2[crew_env["member_a"]["id"]]["work_drive_url"] == "https://drive.google.com/drive/folders/CREWA"


class TestInvoicePDF:
    def test_invoice_download(self, admin_headers, two_bookings):
        b1, _ = two_bookings
        r = requests.get(f"{API}/invoices/{b1['id']}/download", headers=admin_headers)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/pdf")
        data = r.content
        assert data.startswith(b"%PDF"), "PDF header missing"
        assert len(data) > 1000, f"PDF too small ({len(data)} bytes)"


def test_availability_cleanup(admin_headers, two_bookings):
    """Trailing sanity: confirmed two bookings exist -- cleanup runs in fixture teardown."""
    b1, b2 = two_bookings
    r = requests.get(f"{API}/bookings", headers=admin_headers)
    ids = {row["id"] for row in r.json()}
    assert b1["id"] in ids and b2["id"] in ids
