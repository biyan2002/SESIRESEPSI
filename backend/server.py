from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Query, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
import uuid
import jwt
import requests
import bcrypt
from io import BytesIO
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Literal, Optional
from datetime import datetime, timezone, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "sesi-resepsi"
LOGO_PATH = ROOT_DIR.parent / "frontend" / "public" / "assets" / "logo.webp"

storage_key = None

def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logging.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage unavailable")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def make_token(username: str, role: str = "admin", crew_member_id: str = "") -> str:
    payload = {
        "sub": username,
        "role": role,
        "crew_member_id": crew_member_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_admin(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    if not creds:
        raise HTTPException(status_code=401, detail="Login dulu ya kak")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
        if payload.get("role", "admin") != "admin":
            raise HTTPException(status_code=403, detail="Akses khusus admin")
        return payload["sub"]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Session expired, login lagi ya")


async def verify_crew(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Login Crew dulu ya")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
        if payload.get("role") != "crew" or not payload.get("crew_member_id"):
            raise HTTPException(status_code=403, detail="Akses khusus Crew")
        account = await db.crew_accounts.find_one(
            {"member_id": payload["crew_member_id"], "active": True},
            {"_id": 0, "password_hash": 0},
        )
        if not account:
            raise HTTPException(status_code=401, detail="Akun Crew tidak aktif")
        return account
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Session expired, login lagi ya")


# ================= MODELS =================
class LoginReq(BaseModel):
    username: str
    password: str


class Package(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: int
    features: List[str]
    highlight: bool = False
    order: int = 0


class Additional(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: int
    unit: str = "item"
    max_quantity: int = Field(default=10, ge=1, le=99)


class PortfolioItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    couple_name: str = ""
    event_date: str = ""
    description: str = ""
    media_type: str = "youtube"  # youtube | upload
    youtube_url: str = ""
    drive_url: str = ""
    file_path: str = ""
    image_paths: List[str] = []
    thumbnail: str = ""
    created_at: str = Field(default_factory=now_iso)


class Testimonial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    message: str
    rating: int = 5
    media_paths: List[str] = []
    approved: bool = True
    created_at: str = Field(default_factory=now_iso)


class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    whatsapp: str
    event_type: str
    event_date: str
    event_time: str
    address: str
    maps_link: str = ""
    distance_km: float = Field(ge=0, le=1000)
    notes: str = ""
    package_id: str
    package_name: str
    package_price: int
    additionals: List[dict] = []
    transport_cost: int = 0
    total_price: int
    payment_type: str  # lunas | dp
    payment_amount: int
    payment_proof_path: str = ""
    status: str = "pending"
    payment_method: str = "bank"
    social_username: str = ""
    social_platforms: List[str] = []
    work_drive_url: str = ""
    invoice_number: str = ""
    invoice_token: str = ""
    created_at: str = Field(default_factory=now_iso)


class BookingCompletionUpdate(BaseModel):
    status: Literal["pending", "completed"]


class BookingWorkUpdate(BaseModel):
    work_drive_url: str = ""


class Availability(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    status: Optional[str] = None
    remaining_slots: Optional[int] = None


class TeamMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: str
    description: str
    photo_path: str = ""
    order: int = 0


class CrewAccountCreate(BaseModel):
    member_id: str
    username: str
    password: str = Field(min_length=6)
    active: bool = True


class CrewAccountUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6)
    active: Optional[bool] = None
    member_id: Optional[str] = None


class CrewAssignmentInput(BaseModel):
    crew_member_id: str
    job_title: str = "Crew Acara"
    notes: str = ""
    work_drive_url: Optional[str] = None
    work_status: Optional[Literal["pending", "completed"]] = None


class CrewAssignment(CrewAssignmentInput):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    work_drive_url: str = ""
    work_status: Literal["pending", "completed"] = "pending"
    created_at: str = Field(default_factory=now_iso)


class CrewAssignmentBatch(BaseModel):
    assignments: List[CrewAssignmentInput] = []


class CrewWorkUpdate(BaseModel):
    work_drive_url: str = ""
    work_status: Literal["pending", "completed"]


class PaymentAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    holder: str
    number: str


class PaymentSettings(BaseModel):
    bank_accounts: List[PaymentAccount] = []
    ewallet_accounts: List[PaymentAccount] = []
    qris_image_path: str = ""


# ================= AUTH =================
ADMINS = {
    os.environ["ADMIN_BIYAN_USERNAME"].strip().lower(): (
        "Biyan",
        os.environ["ADMIN_BIYAN_PASSWORD"],
    ),
    os.environ["ADMIN_BIYAN_EMAIL"].strip().lower(): (
        "Biyan",
        os.environ["ADMIN_BIYAN_PASSWORD"],
    ),
    os.environ["ADMIN_ASTY_USERNAME"].strip().lower(): (
        "Asty",
        os.environ["ADMIN_ASTY_PASSWORD"],
    ),
}


@api_router.post("/auth/login")
async def login(req: LoginReq):
    account = ADMINS.get(req.username.strip().lower())
    if not account or req.password != account[1]:
        raise HTTPException(status_code=401, detail="Username atau password salah nih kak")
    display_name = account[0]
    token = make_token(display_name)
    return {"token": token, "username": display_name}


@api_router.get("/auth/me")
async def me(username: str = Depends(verify_admin)):
    return {"username": username}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def password_matches(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


@api_router.post("/auth/crew/login")
async def crew_login(req: LoginReq):
    username = req.username.strip().lower()
    account = await db.crew_accounts.find_one({"username": username, "active": True})

    if not account or not password_matches(req.password, account.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Username atau password Crew salah")

    member = await db.team_members.find_one({"id": account["member_id"]}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=401, detail="Data Crew tidak ditemukan")

    token = make_token(member["name"], role="crew", crew_member_id=member["id"])
    return {
        "token": token,
        "username": account["username"],
        "member": member,
    }


@api_router.get("/auth/crew/me")
async def crew_me(account: dict = Depends(verify_crew)):
    member = await db.team_members.find_one({"id": account["member_id"]}, {"_id": 0})
    return {"username": account["username"], "member": member}


# ================= PACKAGES =================
DEFAULT_PACKAGES = [
    {"name": "Basic", "price": 150000, "features": ["Stand by 1 jam", "2 Instagram stories (sameday edit)", "1 video recap/highlight (max H+2)", "50+ Footage on drive"], "highlight": False, "order": 1},
    {"name": "Classic", "price": 250000, "features": ["Stand by 2 jam", "3 Instagram stories (sameday edit)", "2 video recap/highlight (max H+2)", "75+ Footage on drive"], "highlight": False, "order": 2},
    {"name": "Special", "price": 350000, "features": ["Stand by 4 jam", "5 Instagram stories (sameday edit)", "2 video recap/highlight (max H+2)", "Live streaming (device dan akun dari client)", "100+ Footage on drive"], "highlight": True, "order": 3},
    {"name": "Premium", "price": 650000, "features": ["Stand by 8 jam", "8 Instagram stories (sameday edit)", "3 video recap/highlight (max H+2)", "Live streaming (device dan akun dari client)", "250+ Footage on drive"], "highlight": False, "order": 4},
]

DEFAULT_ADDITIONALS = [
    {"name": "Extra time", "price": 50000, "unit": "jam"},
    {"name": "Cinematic video", "price": 50000, "unit": "jam"},
    {"name": "Instagram story", "price": 10000, "unit": "jam"},
]

NATIONAL_HOLIDAYS_2026 = {
    "2026-01-01", "2026-02-17", "2026-03-19", "2026-03-20", "2026-04-03",
    "2026-04-04", "2026-05-01", "2026-05-14", "2026-05-25", "2026-05-27",
    "2026-06-01", "2026-06-16", "2026-06-17", "2026-08-17", "2026-08-25",
    "2026-11-04", "2026-12-25",
}

DEFAULT_TEAM_MEMBERS = [
    {
        "name": "FIKABI SA'DI MARTYANSYAH (Biyan)",
        "role": "Owner & Orang di Balik Kamera",
        "description": "Yang bakal ngabadiin setiap detik lucu, romantis, & baper kamu jadi frame cinematic.",
        "photo_path": "/assets/fikabi-portrait.png",
        "order": 1,
    },
    {
        "name": "CASTI RAHAYU (Asty)",
        "role": "Manager & Admin",
        "description": "Bakal nemenin kamu dari chat pertama sampe hari H, biar semua smooth & seru.",
        "photo_path": "/assets/couple.png",
        "order": 2,
    },
]

DEFAULT_PAYMENT_SETTINGS = {
    "bank_accounts": [
        {
            "label": "BSI",
            "holder": "FIKABI SA'DI MARTYANSYAH",
            "number": "7310404173",
        },
        {
            "label": "Seabank",
            "holder": "CASTI RAHAYU",
            "number": "901820850811",
        },
    ],
    "ewallet_accounts": [],
    "qris_image_path": "",
}


async def seed_data():
    if await db.packages.count_documents({}) == 0:
        for p in DEFAULT_PACKAGES:
            pkg = Package(**p)
            await db.packages.insert_one(pkg.model_dump())
    if await db.additionals.count_documents({}) == 0:
        for a in DEFAULT_ADDITIONALS:
            add = Additional(**a)
            await db.additionals.insert_one(add.model_dump())
    await db.additionals.update_many(
        {"max_quantity": {"$exists": False}},
        {"$set": {"max_quantity": 10}},
    )
    if await db.team_members.count_documents({}) == 0:
        for member_data in DEFAULT_TEAM_MEMBERS:
            member = TeamMember(**member_data)
            await db.team_members.insert_one(member.model_dump())


@api_router.get("/packages")
async def list_packages():
    docs = await db.packages.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return docs


@api_router.post("/packages")
async def create_package(pkg: Package, username: str = Depends(verify_admin)):
    await db.packages.insert_one(pkg.model_dump())
    return pkg


@api_router.put("/packages/{pkg_id}")
async def update_package(pkg_id: str, pkg: Package, username: str = Depends(verify_admin)):
    data = pkg.model_dump()
    data["id"] = pkg_id
    await db.packages.update_one({"id": pkg_id}, {"$set": data})
    return data


@api_router.delete("/packages/{pkg_id}")
async def delete_package(pkg_id: str, username: str = Depends(verify_admin)):
    await db.packages.delete_one({"id": pkg_id})
    return {"ok": True}


# ================= ADDITIONALS =================
@api_router.get("/additionals")
async def list_additionals():
    docs = await db.additionals.find({}, {"_id": 0}).to_list(100)
    return [Additional(**doc).model_dump() for doc in docs]


@api_router.post("/additionals")
async def create_additional(add: Additional, username: str = Depends(verify_admin)):
    await db.additionals.insert_one(add.model_dump())
    return add


@api_router.put("/additionals/{add_id}")
async def update_additional(add_id: str, add: Additional, username: str = Depends(verify_admin)):
    data = add.model_dump()
    data["id"] = add_id
    await db.additionals.update_one({"id": add_id}, {"$set": data})
    return data


@api_router.delete("/additionals/{add_id}")
async def delete_additional(add_id: str, username: str = Depends(verify_admin)):
    await db.additionals.delete_one({"id": add_id})
    return {"ok": True}


# ================= TEAM MEMBERS =================
async def team_capacity() -> int:
    return await db.team_members.count_documents({})


def availability_status(remaining_slots: int) -> str:
    if remaining_slots <= 0:
        return "full"
    if remaining_slots == 1:
        return "limited"
    return "available"


async def clamp_availability_to_team_capacity() -> None:
    capacity = await team_capacity()
    await db.availability.update_many(
        {"remaining_slots": {"$gt": capacity}},
        {
            "$set": {
                "remaining_slots": capacity,
                "status": availability_status(capacity),
            }
        },
    )


@api_router.get("/team")
async def list_team_members():
    return await db.team_members.find({}, {"_id": 0}).sort("order", 1).to_list(100)


@api_router.post("/team")
async def create_team_member(member: TeamMember, username: str = Depends(verify_admin)):
    await db.team_members.insert_one(member.model_dump())
    return member


@api_router.put("/team/{member_id}")
async def update_team_member(
    member_id: str,
    member: TeamMember,
    username: str = Depends(verify_admin),
):
    data = member.model_dump()
    data["id"] = member_id
    await db.team_members.update_one({"id": member_id}, {"$set": data})
    return data


@api_router.delete("/team/{member_id}")
async def delete_team_member(member_id: str, username: str = Depends(verify_admin)):
    await db.team_members.delete_one({"id": member_id})
    await db.crew_accounts.delete_many({"member_id": member_id})
    await db.crew_assignments.delete_many({"crew_member_id": member_id})
    await clamp_availability_to_team_capacity()
    return {"ok": True}


# ================= CREW ACCOUNTS & ASSIGNMENTS =================
@api_router.get("/crew-accounts")
async def list_crew_accounts(username: str = Depends(verify_admin)):
    return await db.crew_accounts.find(
        {},
        {"_id": 0, "password_hash": 0},
    ).sort("username", 1).to_list(100)


@api_router.post("/crew-accounts")
async def create_crew_account(
    account: CrewAccountCreate,
    username: str = Depends(verify_admin),
):
    member = await db.team_members.find_one({"id": account.member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Personel tim tidak ditemukan")

    normalized_username = account.username.strip().lower()
    exists = await db.crew_accounts.find_one({"username": normalized_username})
    if exists:
        raise HTTPException(status_code=409, detail="Username Crew sudah dipakai")

    data = {
        "id": str(uuid.uuid4()),
        "member_id": account.member_id,
        "username": normalized_username,
        "password_hash": hash_password(account.password),
        "active": account.active,
        "created_at": now_iso(),
    }
    await db.crew_accounts.insert_one(data)
    return {key: value for key, value in data.items() if key not in ("password_hash", "_id")}


@api_router.put("/crew-accounts/{account_id}")
async def update_crew_account(
    account_id: str,
    update: CrewAccountUpdate,
    username: str = Depends(verify_admin),
):
    data = update.model_dump(exclude_none=True)
    if "username" in data:
        data["username"] = data["username"].strip().lower()
        conflict = await db.crew_accounts.find_one(
            {"username": data["username"], "id": {"$ne": account_id}},
        )
        if conflict:
            raise HTTPException(status_code=409, detail="Username Crew sudah dipakai")
    if "password" in data:
        data["password_hash"] = hash_password(data.pop("password"))
    if "member_id" in data:
        member = await db.team_members.find_one({"id": data["member_id"]})
        if not member:
            raise HTTPException(status_code=404, detail="Personel tim tidak ditemukan")

    result = await db.crew_accounts.update_one({"id": account_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Akun Crew tidak ditemukan")

    updated = await db.crew_accounts.find_one(
        {"id": account_id},
        {"_id": 0, "password_hash": 0},
    )
    return updated


@api_router.delete("/crew-accounts/{account_id}")
async def delete_crew_account(account_id: str, username: str = Depends(verify_admin)):
    await db.crew_accounts.delete_one({"id": account_id})
    return {"ok": True}


@api_router.get("/bookings/{booking_id}/assignments")
async def list_booking_assignments(
    booking_id: str,
    username: str = Depends(verify_admin),
):
    return await db.crew_assignments.find(
        {"booking_id": booking_id},
        {"_id": 0},
    ).to_list(100)


@api_router.put("/bookings/{booking_id}/assignments")
async def replace_booking_assignments(
    booking_id: str,
    batch: CrewAssignmentBatch,
    username: str = Depends(verify_admin),
):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking tidak ditemukan")

    member_ids = [item.crew_member_id for item in batch.assignments]
    member_count = await db.team_members.count_documents({"id": {"$in": member_ids}})
    if member_count != len(set(member_ids)):
        raise HTTPException(status_code=422, detail="Ada personel tim yang tidak valid")

    existing_assignments = await db.crew_assignments.find(
        {"booking_id": booking_id},
        {"_id": 0},
    ).to_list(100)
    existing_by_member = {
        assignment["crew_member_id"]: assignment
        for assignment in existing_assignments
    }

    await db.crew_assignments.delete_many({"booking_id": booking_id})
    records = []
    for item in batch.assignments:
        data = item.model_dump(exclude_none=True)
        existing = existing_by_member.get(item.crew_member_id, {})
        data.setdefault("work_drive_url", existing.get("work_drive_url", ""))
        data.setdefault("work_status", existing.get("work_status", "pending"))
        records.append(CrewAssignment(booking_id=booking_id, **data).model_dump())
    response_records = [record.copy() for record in records]
    if records:
        await db.crew_assignments.insert_many(records)
    return response_records


@api_router.get("/crew/jobs")
async def list_crew_jobs(account: dict = Depends(verify_crew)):
    assignments = await db.crew_assignments.find(
        {"crew_member_id": account["member_id"]},
        {"_id": 0},
    ).to_list(200)
    jobs = []
    for assignment in assignments:
        booking = await db.bookings.find_one(
            {"id": assignment["booking_id"]},
            {
                "_id": 0,
                "id": 1,
                "name": 1,
                "whatsapp": 1,
                "event_type": 1,
                "event_date": 1,
                "event_time": 1,
                "address": 1,
                "maps_link": 1,
                "notes": 1,
                "work_drive_url": 1,
                "status": 1,
            },
        )
        if booking:
            jobs.append({"assignment": assignment, "booking": booking})

    return sorted(
        jobs,
        key=lambda job: (job["booking"]["event_date"], job["booking"]["event_time"]),
    )


@api_router.patch("/crew/jobs/{assignment_id}/work")
async def update_crew_work(
    assignment_id: str,
    update: CrewWorkUpdate,
    account: dict = Depends(verify_crew),
):
    result = await db.crew_assignments.update_one(
        {"id": assignment_id, "crew_member_id": account["member_id"]},
        {
            "$set": {
                "work_drive_url": update.work_drive_url.strip(),
                "work_status": update.work_status,
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job Crew tidak ditemukan")

    assignment = await db.crew_assignments.find_one({"id": assignment_id}, {"_id": 0})
    return assignment


# ================= PORTFOLIO =================
@api_router.get("/portfolio")
async def list_portfolio():
    docs = await db.portfolio.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


@api_router.post("/portfolio")
async def create_portfolio(item: PortfolioItem, username: str = Depends(verify_admin)):
    await db.portfolio.insert_one(item.model_dump())
    return item


@api_router.put("/portfolio/{item_id}")
async def update_portfolio(item_id: str, item: PortfolioItem, username: str = Depends(verify_admin)):
    data = item.model_dump()
    data["id"] = item_id
    await db.portfolio.update_one({"id": item_id}, {"$set": data})
    return data


@api_router.delete("/portfolio/{item_id}")
async def delete_portfolio(item_id: str, username: str = Depends(verify_admin)):
    await db.portfolio.delete_one({"id": item_id})
    return {"ok": True}


# ================= TESTIMONIALS =================
@api_router.get("/testimonials")
async def list_testimonials():
    docs = await db.testimonials.find({"approved": True}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


@api_router.get("/testimonials/all")
async def list_all_testimonials(username: str = Depends(verify_admin)):
    docs = await db.testimonials.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api_router.post("/testimonials")
async def create_testimonial(t: Testimonial):
    await db.testimonials.insert_one(t.model_dump())
    return t


@api_router.delete("/testimonials/{t_id}")
async def delete_testimonial(t_id: str, username: str = Depends(verify_admin)):
    await db.testimonials.delete_one({"id": t_id})
    return {"ok": True}


# ================= BOOKINGS =================
def calculate_transport_cost(distance_km: float, package_name: str) -> int:
    free_radius = 30 if package_name.strip().lower() == "premium" else 10
    if distance_km <= free_radius:
        return 0
    return math.ceil(distance_km - free_radius) * 5000


async def reserve_booking_slot(event_date: str) -> dict:
    capacity = await team_capacity()
    current = await db.availability.find_one({"date": event_date}, {"_id": 0})
    remaining_slots = current.get("remaining_slots", capacity) if current else capacity

    if remaining_slots <= 0:
        raise HTTPException(status_code=409, detail="Tanggal yang dipilih sudah penuh")

    updated_slots = remaining_slots - 1
    data = {
        "date": event_date,
        "remaining_slots": updated_slots,
        "status": availability_status(updated_slots),
    }
    await db.availability.update_one({"date": event_date}, {"$set": data}, upsert=True)
    return data


async def release_booking_slot(event_date: str) -> None:
    capacity = await team_capacity()
    current = await db.availability.find_one({"date": event_date}, {"_id": 0})
    if not current:
        return
    remaining_slots = min(current.get("remaining_slots", 0) + 1, capacity)
    await db.availability.update_one(
        {"date": event_date},
        {
            "$set": {
                "remaining_slots": remaining_slots,
                "status": availability_status(remaining_slots),
            }
        },
    )


@api_router.get("/bookings")
async def list_bookings(username: str = Depends(verify_admin)):
    docs = await db.bookings.find({}, {"_id": 0}).sort(
        [("event_date", 1), ("event_time", 1), ("created_at", 1)]
    ).to_list(500)
    return docs


@api_router.post("/bookings")
async def create_booking(b: Booking):
    booking_data = b.model_dump()
    transport_cost = calculate_transport_cost(b.distance_km, b.package_name)
    additionals_cost = sum(
        int(item.get("subtotal", 0))
        for item in b.additionals
        if isinstance(item, dict)
    )
    booking_data["transport_cost"] = transport_cost
    booking_data["total_price"] = b.package_price + additionals_cost + transport_cost
    booking_data["invoice_number"] = make_invoice_number(b.event_date)
    booking_data["invoice_token"] = uuid.uuid4().hex
    await reserve_booking_slot(b.event_date)
    await db.bookings.insert_one(booking_data)
    response_data = Booking(**booking_data).model_dump()
    response_data["invoice_url"] = (
        f"/api/invoices/{booking_data['id']}/download?token={booking_data['invoice_token']}"
    )
    return response_data


@api_router.delete("/bookings/{b_id}")
async def delete_booking(b_id: str, username: str = Depends(verify_admin)):
    booking = await db.bookings.find_one({"id": b_id}, {"_id": 0})
    if booking:
        await db.bookings.delete_one({"id": b_id})
        await release_booking_slot(booking["event_date"])
    return {"ok": True}


@api_router.patch("/bookings/{b_id}/completion")
async def update_booking_completion(
    b_id: str,
    update: BookingCompletionUpdate,
    username: str = Depends(verify_admin),
):
    result = await db.bookings.update_one(
        {"id": b_id},
        {"$set": {"status": update.status}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking tidak ditemukan")

    return {"id": b_id, "status": update.status}


@api_router.patch("/bookings/{b_id}/work")
async def update_booking_work(
    b_id: str,
    update: BookingWorkUpdate,
    username: str = Depends(verify_admin),
):
    result = await db.bookings.update_one(
        {"id": b_id},
        {"$set": {"work_drive_url": update.work_drive_url.strip()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking tidak ditemukan")
    return {"id": b_id, "work_drive_url": update.work_drive_url.strip()}


def make_invoice_number(event_date: str) -> str:
    date_part = event_date.replace("-", "") or datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"SR-{date_part}-{uuid.uuid4().hex[:6].upper()}"


async def get_invoice_booking(booking_id: str) -> dict:
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking tidak ditemukan")

    missing = {}
    if not booking.get("invoice_number"):
        missing["invoice_number"] = make_invoice_number(booking.get("event_date", ""))
    if not booking.get("invoice_token"):
        missing["invoice_token"] = uuid.uuid4().hex
    if missing:
        await db.bookings.update_one({"id": booking_id}, {"$set": missing})
        booking.update(missing)
    return booking


def draw_flower(pdf: canvas.Canvas, x: float, y: float, size: float) -> None:
    pdf.setFillColor(colors.HexColor("#fda4af"))
    for dx, dy in [(0, size), (size, 0), (0, -size), (-size, 0)]:
        pdf.circle(x + dx, y + dy, size * 0.72, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#e11d48"))
    pdf.circle(x, y, size * 0.52, fill=1, stroke=0)


def build_invoice_pdf(booking: dict) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    page_width, page_height = A4

    pdf.setFillColor(colors.HexColor("#fff1f2"))
    pdf.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    draw_flower(pdf, 28 * mm, page_height - 24 * mm, 7 * mm)
    draw_flower(pdf, page_width - 30 * mm, 32 * mm, 8 * mm)
    if LOGO_PATH.exists():
        pdf.setFillColor(colors.HexColor("#4c0519"))
        pdf.roundRect(20 * mm, page_height - 47 * mm, 25 * mm, 25 * mm, 4 * mm, fill=1, stroke=0)
        pdf.drawImage(
            ImageReader(str(LOGO_PATH)),
            21.5 * mm,
            page_height - 45.5 * mm,
            width=22 * mm,
            height=22 * mm,
            mask="auto",
        )

    pdf.setFillColor(colors.HexColor("#881337"))
    pdf.setFont("Helvetica-Bold", 21)
    pdf.drawString(46 * mm, page_height - 30 * mm, "SESI RESEPSI")
    pdf.setFont("Helvetica", 9)
    pdf.drawString(46 * mm, page_height - 36 * mm, "Wedding Content Creator & Photographer JABODETABEK")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawRightString(page_width - 22 * mm, page_height - 30 * mm, "INVOICE")
    pdf.setFont("Helvetica", 9)
    pdf.drawRightString(page_width - 22 * mm, page_height - 36 * mm, booking["invoice_number"])

    y = page_height - 62 * mm
    pdf.setStrokeColor(colors.HexColor("#fda4af"))
    pdf.line(22 * mm, y, page_width - 22 * mm, y)
    y -= 12 * mm
    details = [
        ("Pasangan", booking.get("name", "-")),
        ("Acara", booking.get("event_type", "-")),
        ("Jadwal", f"{booking.get('event_date', '-')} • {booking.get('event_time', '-')}"),
        ("Lokasi", booking.get("address", "-")),
        ("Sosial Media", booking.get("social_username", "-")),
    ]
    for label, value in details:
        pdf.setFont("Helvetica-Bold", 9)
        pdf.setFillColor(colors.HexColor("#9f1239"))
        pdf.drawString(24 * mm, y, f"{label}:")
        pdf.setFont("Helvetica", 9)
        pdf.setFillColor(colors.HexColor("#4c0519"))
        pdf.drawString(58 * mm, y, str(value)[:82])
        y -= 6 * mm

    y -= 4 * mm
    pdf.setFillColor(colors.HexColor("#e11d48"))
    pdf.roundRect(22 * mm, y - 8 * mm, page_width - 44 * mm, 9 * mm, 3 * mm, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(26 * mm, y - 2 * mm, "RINCIAN BOOKING")
    y -= 18 * mm

    lines = [(booking.get("package_name", "Paket"), booking.get("package_price", 0))]
    lines.extend(
        (f"{item.get('name', 'Additional')} x{item.get('qty', 1)}", item.get("subtotal", 0))
        for item in booking.get("additionals", [])
    )
    lines.append(("Transport", booking.get("transport_cost", 0)))
    for label, amount in lines:
        pdf.setFont("Helvetica", 10)
        pdf.setFillColor(colors.HexColor("#4c0519"))
        pdf.drawString(24 * mm, y, label)
        pdf.drawRightString(page_width - 24 * mm, y, f"Rp {int(amount):,}".replace(",", "."))
        y -= 7 * mm

    pdf.setStrokeColor(colors.HexColor("#fda4af"))
    pdf.line(22 * mm, y, page_width - 22 * mm, y)
    y -= 9 * mm
    pdf.setFillColor(colors.HexColor("#881337"))
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(24 * mm, y, "TOTAL")
    pdf.drawRightString(
        page_width - 24 * mm,
        y,
        f"Rp {int(booking.get('total_price', 0)):,}".replace(",", "."),
    )
    y -= 11 * mm
    pdf.setFont("Helvetica", 10)
    pdf.drawString(24 * mm, y, f"Pembayaran: {booking.get('payment_type', '-').upper()}")
    pdf.drawRightString(
        page_width - 24 * mm,
        y,
        f"Dibayar: Rp {int(booking.get('payment_amount', 0)):,}".replace(",", "."),
    )
    y -= 7 * mm
    pdf.drawString(24 * mm, y, f"Metode: {booking.get('payment_method', 'bank').upper()}")
    pdf.setFont("Helvetica-Oblique", 8)
    pdf.setFillColor(colors.HexColor("#9f1239"))
    pdf.drawCentredString(page_width / 2, 18 * mm, "Terima kasih telah mempercayakan momenmu pada SESI RESEPSI")
    pdf.save()
    return buffer.getvalue()


@api_router.get("/invoices/{booking_id}/download")
async def download_invoice(
    booking_id: str,
    token: str = Query(default=""),
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    booking = await get_invoice_booking(booking_id)
    is_admin = False
    if creds:
        try:
            payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
            is_admin = payload.get("role", "admin") == "admin"
        except Exception:
            is_admin = False
    if not is_admin and token != booking["invoice_token"]:
        raise HTTPException(status_code=403, detail="Akses invoice tidak valid")

    pdf_data = build_invoice_pdf(booking)
    filename = f"Invoice-{booking['invoice_number']}.pdf"
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ================= AVAILABILITY =================
@api_router.get("/availability")
async def list_availability():
    docs = await db.availability.find({}, {"_id": 0}).to_list(1000)
    return docs


@api_router.post("/availability")
async def set_availability(a: Availability, username: str = Depends(verify_admin)):
    capacity = await team_capacity()
    slots = a.remaining_slots

    if slots is None:
        legacy_status = a.status or "available"
        slots = {
            "available": capacity,
            "limited": min(1, capacity),
            "full": 0,
            "closed": capacity,
        }.get(legacy_status)

    if slots is None or slots < 0 or slots > capacity:
        raise HTTPException(
            status_code=422,
            detail=f"Sisa slot harus di antara 0 dan {capacity}.",
        )

    data = {
        "date": a.date,
        "status": availability_status(slots),
        "remaining_slots": slots,
    }

    await db.availability.update_one({"date": a.date}, {"$set": data}, upsert=True)
    return data


@api_router.delete("/availability/{date}")
async def delete_availability(date: str, username: str = Depends(verify_admin)):
    await db.availability.delete_one({"date": date})
    return {"ok": True}


# ================= UPLOAD =================
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), folder: str = "general"):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    path = f"{APP_NAME}/{folder}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    ct = file.content_type or "application/octet-stream"
    result = put_object(path, data, ct)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": ct,
        "size": result.get("size", len(data)),
        "folder": folder,
        "is_deleted": False,
        "created_at": now_iso()
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


@api_router.get("/files/{path:path}")
async def download_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))


# ================= SITE SETTINGS =================
@api_router.get("/payment-settings")
async def get_payment_settings():
    settings = await db.settings.find_one({"key": "payments"}, {"_id": 0})
    if settings:
        settings.pop("key", None)
        return PaymentSettings(**settings).model_dump()

    defaults = PaymentSettings(**DEFAULT_PAYMENT_SETTINGS).model_dump()
    await db.settings.insert_one({"key": "payments", **defaults})
    return defaults


@api_router.put("/payment-settings")
async def update_payment_settings(
    settings: PaymentSettings,
    username: str = Depends(verify_admin),
):
    data = settings.model_dump()
    await db.settings.update_one({"key": "payments"}, {"$set": data}, upsert=True)
    return data


class SiteSettings(BaseModel):
    hero_title: str = "SESI RESEPSI"
    hero_subtitle: str = "Wedding Content Creator Jakarta-Bekasi"
    tagline: str = "Momen romantismu, kami abadikan estetik"
    wa_biyan: str = "085185130765"
    wa_asty: str = "085862937103"
    bank_bsi: str = "7310404173"
    bank_bsi_name: str = "FIKABI SA'DI MARTYANSYAH"
    bank_seabank: str = "901820850811"
    bank_seabank_name: str = "CASTI RAHAYU"


@api_router.get("/settings")
async def get_settings():
    doc = await db.settings.find_one({"key": "main"}, {"_id": 0})
    if not doc:
        s = SiteSettings()
        d = s.model_dump()
        d["key"] = "main"
        await db.settings.insert_one(d)
        return s.model_dump()
    doc.pop("key", None)
    return doc


@api_router.put("/settings")
async def update_settings(settings: SiteSettings, username: str = Depends(verify_admin)):
    d = settings.model_dump()
    await db.settings.update_one({"key": "main"}, {"$set": d}, upsert=True)
    return d


@api_router.get("/")
async def root():
    return {"message": "SESI RESEPSI API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await seed_data()
    await db.crew_accounts.create_index("username", unique=True)
    init_storage()
    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
