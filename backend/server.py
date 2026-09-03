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
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta

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


def make_token(username: str) -> str:
    payload = {"sub": username, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_admin(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    if not creds:
        raise HTTPException(status_code=401, detail="Login dulu ya kak")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload["sub"]
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
    unit: str = "item"  # per jam, per km


class PortfolioItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    couple_name: str = ""
    event_date: str = ""
    description: str = ""
    media_type: str = "youtube"  # youtube | upload
    youtube_url: str = ""
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
    created_at: str = Field(default_factory=now_iso)


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


async def seed_data():
    if await db.packages.count_documents({}) == 0:
        for p in DEFAULT_PACKAGES:
            pkg = Package(**p)
            await db.packages.insert_one(pkg.model_dump())
    if await db.additionals.count_documents({}) == 0:
        for a in DEFAULT_ADDITIONALS:
            add = Additional(**a)
            await db.additionals.insert_one(add.model_dump())
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
    return docs


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
    await clamp_availability_to_team_capacity()
    return {"ok": True}


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
    await db.bookings.insert_one(booking_data)
    return Booking(**booking_data)


@api_router.delete("/bookings/{b_id}")
async def delete_booking(b_id: str, username: str = Depends(verify_admin)):
    await db.bookings.delete_one({"id": b_id})
    return {"ok": True}


# ================= AVAILABILITY =================
@api_router.get("/availability")
async def list_availability():
    docs = await db.availability.find({}, {"_id": 0}).to_list(1000)
    return docs


@api_router.post("/availability")
async def set_availability(a: Availability, username: str = Depends(verify_admin)):
    capacity = await team_capacity()

    if a.status == "closed" and a.remaining_slots is None:
        data = {"date": a.date, "status": "closed", "remaining_slots": 0}
    else:
        slots = a.remaining_slots

        if slots is None:
            legacy_status = a.status or "available"
            slots = {
                "available": capacity,
                "limited": min(1, capacity),
                "full": 0,
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
    init_storage()
    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
