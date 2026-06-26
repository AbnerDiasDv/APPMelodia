"""Harmonia API end-to-end tests.

Cobre: auth (register/login/me), instruments, lessons (list/complete),
chords, practice, my/stats e endpoints de admin (com guard de role).
"""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://music-learn-16.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@appharmonia.app"
ADMIN_PASSWORD = "Admin@123"


# ----- Fixtures --------------------------------------------------------------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(http):
    r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def student(http):
    """Cria um aluno único para a sessão de testes."""
    unique = uuid.uuid4().hex[:8]
    payload = {
        "name": f"TEST Aluno {unique}",
        "email": f"TEST_aluno_{unique}@harmonia.app",
        "password": "Senha@123",
        "preferred_instrument": "violao",
    }
    r = http.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    return {
        "token": data["access_token"],
        "user": data["user"],
        "password": payload["password"],
        "email": payload["email"],
    }


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ----- Auth ------------------------------------------------------------------
class TestAuth:
    def test_root(self, http):
        r = http.get(f"{API}/")
        assert r.status_code == 200
        assert "Harmonia" in r.json().get("message", "")

    def test_register_returns_token_user(self, student):
        assert student["token"]
        assert student["user"]["role"] == "aluno"
        assert student["user"]["email"].lower() == student["email"].lower()
        assert student["user"]["preferred_instrument"] == "violao"

    def test_register_duplicate_email_fails(self, http, student):
        r = http.post(f"{API}/auth/register", json={
            "name": "dup", "email": student["email"], "password": "Senha@123",
        })
        assert r.status_code == 400

    def test_login_admin_success(self, admin_token):
        assert admin_token

    def test_login_invalid_returns_401(self, http):
        r = http.post(f"{API}/auth/login", json={
            "email": ADMIN_EMAIL, "password": "wrongpassword!",
        })
        assert r.status_code == 401

    def test_me_with_token(self, http, student):
        r = http.get(f"{API}/auth/me", headers=auth(student["token"]))
        assert r.status_code == 200
        body = r.json()
        assert body["email"].lower() == student["email"].lower()
        assert body["role"] == "aluno"

    def test_me_without_token_returns_401(self, http):
        r = http.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_admin_me_role_superadmin(self, http, admin_token):
        r = http.get(f"{API}/auth/me", headers=auth(admin_token))
        assert r.status_code == 200
        assert r.json()["role"] == "superadmin"


# ----- Catálogo --------------------------------------------------------------
class TestCatalog:
    def test_instruments_returns_five(self, http, student):
        r = http.get(f"{API}/instruments", headers=auth(student["token"]))
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 5
        ids = {i["id"] for i in data}
        assert ids == {"violao", "teclado", "piano", "flauta", "bateria"}
        for inst in data:
            assert "lessons_total" in inst and "lessons_completed" in inst
            assert inst["lessons_total"] == 4

    def test_lessons_violao_ordered(self, http, student):
        r = http.get(f"{API}/lessons", params={"instrument": "violao"},
                     headers=auth(student["token"]))
        assert r.status_code == 200
        lessons = r.json()
        assert len(lessons) == 4
        orders = [l["order"] for l in lessons]
        assert orders == sorted(orders)

    def test_chords_filtered(self, http, student):
        r = http.get(f"{API}/chords", params={"instrument": "violao"},
                     headers=auth(student["token"]))
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert all(c["instrument"] == "violao" for c in items)

        r2 = http.get(f"{API}/chords",
                      params={"instrument": "violao", "difficulty": "fácil"},
                      headers=auth(student["token"]))
        assert r2.status_code == 200
        items2 = r2.json()
        assert all(c["difficulty"] == "fácil" for c in items2)
        assert len(items2) <= len(items)


# ----- Lessons complete + Practice ------------------------------------------
class TestLessonsAndPractice:
    def test_complete_lesson_creates_session(self, http, student):
        token = student["token"]
        # baseline sessions
        r0 = http.get(f"{API}/practice", headers=auth(token))
        assert r0.status_code == 200
        before = len(r0.json())

        # pega 1ª lição de violao
        r = http.get(f"{API}/lessons", params={"instrument": "violao"},
                     headers=auth(token))
        first = r.json()[0]

        r2 = http.post(f"{API}/lessons/{first['id']}/complete",
                       json={"score": 90}, headers=auth(token))
        assert r2.status_code == 200
        assert r2.json().get("ok") is True

        # GET lessons confirma completed
        r3 = http.get(f"{API}/lessons", params={"instrument": "violao"},
                      headers=auth(token))
        lessons = r3.json()
        target = next(l for l in lessons if l["id"] == first["id"])
        assert target["completed"] is True
        assert target["score"] == 90

        # nova practice session foi criada
        r4 = http.get(f"{API}/practice", headers=auth(token))
        after = len(r4.json())
        assert after == before + 1

    def test_log_practice_and_list(self, http, student):
        token = student["token"]
        payload = {"instrument": "teclado", "duration_minutes": 12,
                   "notes": "TEST sessão manual"}
        r = http.post(f"{API}/practice", json=payload, headers=auth(token))
        assert r.status_code == 200
        assert r.json().get("ok") is True
        assert r.json().get("id")

        r2 = http.get(f"{API}/practice", headers=auth(token))
        assert r2.status_code == 200
        items = r2.json()
        assert any(i.get("notes") == "TEST sessão manual" and i["instrument"] == "teclado"
                   for i in items)

    def test_my_stats_shape(self, http, student):
        r = http.get(f"{API}/me/stats", headers=auth(student["token"]))
        assert r.status_code == 200
        data = r.json()
        for k in ("streak_days", "total_minutes", "last_7_days",
                  "by_instrument", "lessons_done"):
            assert k in data, f"missing key {k} in stats"
        assert isinstance(data["last_7_days"], list)
        assert len(data["last_7_days"]) == 7
        assert data["total_minutes"] > 0  # já logamos prática + lição
        assert data["lessons_done"] >= 1


# ----- Admin guards ----------------------------------------------------------
class TestAdmin:
    def test_admin_users_requires_superadmin(self, http, student):
        r = http.get(f"{API}/admin/users", headers=auth(student["token"]))
        assert r.status_code == 403

    def test_admin_stats_requires_superadmin(self, http, student):
        r = http.get(f"{API}/admin/stats", headers=auth(student["token"]))
        assert r.status_code == 403

    def test_admin_users_ok(self, http, admin_token, student):
        r = http.get(f"{API}/admin/users", headers=auth(admin_token))
        assert r.status_code == 200
        emails = [u["email"].lower() for u in r.json()]
        assert student["email"].lower() in emails
        # password_hash não deve ser exposto
        assert all("password_hash" not in u for u in r.json())

    def test_admin_stats_ok(self, http, admin_token):
        r = http.get(f"{API}/admin/stats", headers=auth(admin_token))
        assert r.status_code == 200
        data = r.json()
        for k in ("total_users", "total_sessions", "total_minutes",
                  "by_instrument", "top_users", "activity_14d"):
            assert k in data
        assert len(data["activity_14d"]) == 14

    def test_admin_cannot_modify_self(self, http, admin_token):
        # pega id do admin
        me = http.get(f"{API}/auth/me", headers=auth(admin_token)).json()
        r = http.patch(f"{API}/admin/users/{me['id']}",
                       json={"is_banned": True}, headers=auth(admin_token))
        assert r.status_code == 400

    def test_admin_cannot_delete_self(self, http, admin_token):
        me = http.get(f"{API}/auth/me", headers=auth(admin_token)).json()
        r = http.delete(f"{API}/admin/users/{me['id']}", headers=auth(admin_token))
        assert r.status_code == 400

    def test_admin_patch_student_then_delete(self, http, admin_token):
        # cria aluno descartável
        unique = uuid.uuid4().hex[:8]
        reg = http.post(f"{API}/auth/register", json={
            "name": f"TEST DEL {unique}",
            "email": f"TEST_del_{unique}@harmonia.app",
            "password": "Senha@123",
        })
        assert reg.status_code == 200
        uid = reg.json()["user"]["id"]

        # patch: ban
        rp = http.patch(f"{API}/admin/users/{uid}", json={"is_banned": True},
                        headers=auth(admin_token))
        assert rp.status_code == 200

        # banned user cannot use /me
        banned_token = reg.json()["access_token"]
        rm = http.get(f"{API}/auth/me", headers=auth(banned_token))
        assert rm.status_code == 403

        # delete
        rd = http.delete(f"{API}/admin/users/{uid}", headers=auth(admin_token))
        assert rd.status_code == 200

        # confirm 404 on second delete
        rd2 = http.delete(f"{API}/admin/users/{uid}", headers=auth(admin_token))
        assert rd2.status_code == 404
