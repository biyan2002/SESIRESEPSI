"""Auth login tests for SESI RESEPSI admin login (Biyan/Asty/Owner email)."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pink-wedding-studio.preview.emergentagent.com').rstrip('/')
LOGIN = f"{BASE_URL}/api/auth/login"
ME = f"{BASE_URL}/api/auth/me"


@pytest.fixture
def s():
    return requests.Session()


@pytest.mark.parametrize("username,password,display", [
    ("Biyan", "Biyan2026", "Biyan"),
    ("Asty", "Asty2026", "Asty"),
    ("fikabisadimartyansyah@gmail.com", "Biyan2026", "Biyan"),
    ("FIKABISADIMARTYANSYAH@GMAIL.COM", "Biyan2026", "Biyan"),  # case-insensitive
    ("biyan", "Biyan2026", "Biyan"),
])
def test_login_success(s, username, password, display):
    r = s.post(LOGIN, json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["username"] == display
    assert isinstance(data["token"], str) and len(data["token"]) > 20
    # Protected endpoint must accept token
    me = s.get(ME, headers={"Authorization": f"Bearer {data['token']}"})
    assert me.status_code == 200
    assert me.json()["username"] == display


@pytest.mark.parametrize("username,password", [
    ("Biyan", "wrongpass"),
    ("unknown@example.com", "Biyan2026"),
    ("fikabisadimartyansyah@gmail.com", "Asty2026"),
    ("", ""),
])
def test_login_failure(s, username, password):
    r = s.post(LOGIN, json={"username": username, "password": password})
    assert r.status_code == 401
    detail = r.json().get("detail", "")
    # Safe message, no info leak
    assert "salah" in detail.lower() or "login" in detail.lower()


def test_me_without_token(s):
    r = s.get(ME)
    assert r.status_code == 401


def test_me_with_bad_token(s):
    r = s.get(ME, headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


def test_protected_bookings_requires_auth(s):
    r = s.get(f"{BASE_URL}/api/bookings")
    assert r.status_code == 401


def test_protected_bookings_with_owner_token(s):
    r = s.post(LOGIN, json={"username": "fikabisadimartyansyah@gmail.com", "password": "Biyan2026"})
    assert r.status_code == 200
    token = r.json()["token"]
    r2 = s.get(f"{BASE_URL}/api/bookings", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200
    assert isinstance(r2.json(), list)
