"""Harmonia – Backend FastAPI para o app de aprendizado de instrumentos.

"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Literal, Optional
import logging
import os
import uuid

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware


# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("harmonia")

app = FastAPI(title="Harmonia API")
api = APIRouter(prefix="/api")


# Models

Role = Literal["aluno", "superadmin"]
Instrument = Literal["violao", "teclado", "piano", "flauta", "bateria"]


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    preferred_instrument: Optional[Instrument] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role
    preferred_instrument: Optional[str] = None
    avatar: Optional[str] = None
    is_banned: bool = False
    created_at: datetime


class PracticeLogIn(BaseModel):
    instrument: Instrument
    duration_minutes: int = Field(gt=0, lt=600)
    notes: Optional[str] = None


class LessonCompleteIn(BaseModel):
    score: Optional[int] = Field(default=None, ge=0, le=100)


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    preferred_instrument: Optional[Instrument] = None
    avatar: Optional[str] = None  # base64
    daily_reminder_enabled: Optional[bool] = None


class AdminUserPatchIn(BaseModel):
    is_banned: Optional[bool] = None
    role: Optional[Role] = None



# Security helpers
def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Token ausente")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user_id = payload.get("sub")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="Conta suspensa")
    return user


def require_role(*roles: str):
    async def guard(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Acesso negado")
        return user

    return guard


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u.get("name"),
        "email": u.get("email"),
        "role": u.get("role"),
        "preferred_instrument": u.get("preferred_instrument"),
        "avatar": u.get("avatar"),
        "is_banned": u.get("is_banned", False),
        "created_at": u.get("created_at"),
        "daily_reminder_enabled": u.get("daily_reminder_enabled", True),
    }


# -----------------------------------------------------------------------------
# Seed data
# -----------------------------------------------------------------------------
INSTRUMENTS_META = [
    {"id": "violao", "name": "Violão", "emoji_label": "Acústico", "color": "#E87A3E",
     "image": "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=900&q=80",
     "description": "Aprenda acordes, ritmos e dedilhados clássicos do violão."},
    {"id": "teclado", "name": "Teclado", "emoji_label": "Eletrônico", "color": "#34D399",
     "image": "https://images.unsplash.com/photo-1513883049090-d0b7439799bf?w=900&q=80",
     "description": "Domine timbres, escalas e acompanhamentos no teclado."},
    {"id": "piano", "name": "Piano", "emoji_label": "Clássico", "color": "#FBBF24",
     "image": "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=900&q=80",
     "description": "Técnica, leitura de partitura e repertório clássico."},
    {"id": "flauta", "name": "Flauta", "emoji_label": "Sopro", "color": "#60A5FA",
     "image": "https://6a3c92405605847e40cc571d.imgix.net/A-person-with-a-flute-in-the-middle-of-a-garden--429151.jpeg",
     "description": "Controle de respiração, dedilhado e expressão musical."},
    {"id": "bateria", "name": "Bateria", "emoji_label": "Percussão", "color": "#F472B6",
     "image": "https://images.unsplash.com/photo-1524230659092-07f99a75c013?w=900&q=80",
     "description": "Coordenação, ritmos e grooves do rock ao samba."},
]


def lessons_seed():
    """Lições com quizzes para cada instrumento."""
    base = [
        ("Fundamentos: postura e empunhadura", "iniciante", 10,
         "Aprenda a posição correta do corpo, das mãos e a relação com o instrumento.",
         [
             {"q": "Por que a postura é importante?",
              "options": ["Evita lesões e melhora som", "Só estética", "Não importa"], "answer": 0},
             {"q": "A mão de apoio deve estar:",
              "options": ["Tensa", "Relaxada e curvada", "Imóvel"], "answer": 1},
         ]),
        ("Primeiras notas e leitura básica", "iniciante", 15,
         "Identifique as notas naturais e treine a leitura no instrumento.",
         [
             {"q": "Quantas notas naturais existem?", "options": ["5", "7", "12"], "answer": 1},
             {"q": "Qual nota vem depois de Sol?", "options": ["Lá", "Fá", "Mi"], "answer": 0},
         ]),
        ("Ritmo: tempo e compasso", "intermediário", 20,
         "Sinta a pulsação, treine com metrônomo e compreenda compassos simples.",
         [
             {"q": "BPM significa:",
              "options": ["Batimentos por minuto", "Bits por música", "Bandas por mês"], "answer": 0},
             {"q": "4/4 indica:",
              "options": ["4 tempos por compasso", "4 instrumentos", "4 acordes"], "answer": 0},
         ]),
        ("Primeira música completa", "intermediário", 25,
         "Junte tudo: postura, notas, ritmo e expressão em uma música real.",
         [
             {"q": "Antes de tocar, devo:",
              "options": ["Aquecer e afinar", "Tocar forte", "Pular o aquecimento"], "answer": 0},
             {"q": "Praticar lento ajuda a:",
              "options": ["Memorizar errado", "Construir precisão", "Atrasar evolução"], "answer": 1},
         ]),
    ]
    docs = []
    for inst in ["violao", "teclado", "piano", "flauta", "bateria"]:
        for order, (title, level, dur, summary, quiz) in enumerate(base, start=1):
            docs.append({
                "id": f"{inst}-{order}",
                "instrument": inst,
                "order": order,
                "title": title,
                "level": level,
                "duration_minutes": dur,
                "summary": summary,
                "quiz": quiz,
            })
    return docs


CHORDS_SEED = [
    # violão
    {"instrument": "violao", "name": "C (Dó Maior)", "diagram": "x32010", "difficulty": "fácil"},
    {"instrument": "violao", "name": "G (Sol Maior)", "diagram": "320003", "difficulty": "fácil"},
    {"instrument": "violao", "name": "D (Ré Maior)", "diagram": "xx0232", "difficulty": "fácil"},
    {"instrument": "violao", "name": "Am (Lá menor)", "diagram": "x02210", "difficulty": "fácil"},
    {"instrument": "violao", "name": "Em (Mi menor)", "diagram": "022000", "difficulty": "fácil"},
    {"instrument": "violao", "name": "F (Fá Maior)", "diagram": "133211", "difficulty": "difícil"},
    {"instrument": "violao", "name": "B7 (Si sétima)", "diagram": "x21202", "difficulty": "médio"},
    # teclado / piano 
    {"instrument": "teclado", "name": "C Maior", "diagram": "C-E-G", "difficulty": "fácil"},
    {"instrument": "teclado", "name": "G Maior", "diagram": "G-B-D", "difficulty": "fácil"},
    {"instrument": "teclado", "name": "F Maior", "diagram": "F-A-C", "difficulty": "fácil"},
    {"instrument": "teclado", "name": "Am", "diagram": "A-C-E", "difficulty": "fácil"},
    {"instrument": "teclado", "name": "Dm", "diagram": "D-F-A", "difficulty": "fácil"},
    {"instrument": "piano", "name": "C Maior", "diagram": "C-E-G", "difficulty": "fácil"},
    {"instrument": "piano", "name": "G Maior", "diagram": "G-B-D", "difficulty": "fácil"},
    {"instrument": "piano", "name": "F Maior", "diagram": "F-A-C", "difficulty": "fácil"},
    {"instrument": "piano", "name": "Am", "diagram": "A-C-E", "difficulty": "fácil"},
    {"instrument": "piano", "name": "Dm7", "diagram": "D-F-A-C", "difficulty": "médio"},
    # flauta 
    {"instrument": "flauta", "name": "Dó", "diagram": "●●●●●●●", "difficulty": "fácil"},
    {"instrument": "flauta", "name": "Ré", "diagram": "●●●●●●○", "difficulty": "fácil"},
    {"instrument": "flauta", "name": "Mi", "diagram": "●●●●●○○", "difficulty": "fácil"},
    {"instrument": "flauta", "name": "Fá", "diagram": "●●●●○○○", "difficulty": "fácil"},
    {"instrument": "flauta", "name": "Sol", "diagram": "●●●○○○○", "difficulty": "fácil"},
    {"instrument": "flauta", "name": "Lá", "diagram": "●●○○○○○", "difficulty": "médio"},
    # bateria 
    {"instrument": "bateria", "name": "Groove básico 4/4", "diagram": "B-C-S-C", "difficulty": "fácil"},
    {"instrument": "bateria", "name": "Rock simples", "diagram": "B-C / S-C", "difficulty": "fácil"},
    {"instrument": "bateria", "name": "Samba", "diagram": "B.B-T.S-B", "difficulty": "médio"},
    {"instrument": "bateria", "name": "Funk shuffle", "diagram": "B-(C)-S-(C)", "difficulty": "difícil"},
]


async def seed_db():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.lessons.create_index([("instrument", 1), ("order", 1)])
    await db.lesson_progress.create_index([("user_id", 1), ("lesson_id", 1)], unique=True)
    await db.practice_sessions.create_index([("user_id", 1), ("created_at", -1)])

    # Seed superadmin 
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "name": "Super Admin",
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "superadmin",
            "preferred_instrument": "violao",
            "avatar": None,
            "is_banned": False,
            "daily_reminder_enabled": False,
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(admin_doc)
        logger.info("Superadmin criado: %s", ADMIN_EMAIL)
    else:
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"role": "superadmin", "is_banned": False}},
        )

    # Seed lições
    await db.lessons.delete_many({})
    await db.lessons.insert_many(lessons_seed())

    # Seed acordes
    await db.chords.delete_many({})
    chords = []
    for c in CHORDS_SEED:
        chords.append({"id": str(uuid.uuid4()), **c})
    await db.chords.insert_many(chords)

    logger.info("Seed concluído: %d lições, %d acordes",
                await db.lessons.count_documents({}),
                await db.chords.count_documents({}))


# Endpoints

@api.get("/")
async def root():
    return {"message": "Harmonia API ativa", "version": "1.0"}


#  Auth 
@api.post("/auth/register", response_model=TokenOut)
async def register(body: RegisterIn):
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(400, "E-mail já cadastrado")
    user_doc = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": "aluno",
        "preferred_instrument": body.preferred_instrument,
        "avatar": None,
        "is_banned": False,
        "daily_reminder_enabled": True,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_doc)
    return {"access_token": token, "token_type": "bearer", "user": public_user(user_doc)}


@api.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "E-mail ou senha incorretos")
    if user.get("is_banned"):
        raise HTTPException(403, "Conta suspensa")
    token = create_token(user)
    return {"access_token": token, "token_type": "bearer", "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.patch("/auth/me")
async def update_me(body: ProfileUpdateIn, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(fresh)


#  Catálogo 
@api.get("/instruments")
async def list_instruments(user: dict = Depends(get_current_user)):
    out = []
    for inst in INSTRUMENTS_META:
        count = await db.lessons.count_documents({"instrument": inst["id"]})
        done = await db.lesson_progress.count_documents(
            {"user_id": user["id"], "instrument": inst["id"], "completed": True}
        )
        out.append({**inst, "lessons_total": count, "lessons_completed": done})
    return out


@api.get("/lessons")
async def list_lessons(instrument: Instrument, user: dict = Depends(get_current_user)):
    lessons = await db.lessons.find({"instrument": instrument}, {"_id": 0}).sort("order", 1).to_list(100)
    progress = await db.lesson_progress.find(
        {"user_id": user["id"], "instrument": instrument}, {"_id": 0}
    ).to_list(500)
    by_lesson = {p["lesson_id"]: p for p in progress}
    for l in lessons:
        p = by_lesson.get(l["id"])
        l["completed"] = bool(p and p.get("completed"))
        l["score"] = p.get("score") if p else None
    return lessons


@api.get("/lessons/{lesson_id}")
async def lesson_detail(lesson_id: str, user: dict = Depends(get_current_user)):
    lesson = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    if not lesson:
        raise HTTPException(404, "Lição não encontrada")
    p = await db.lesson_progress.find_one(
        {"user_id": user["id"], "lesson_id": lesson_id}, {"_id": 0}
    )
    lesson["completed"] = bool(p and p.get("completed"))
    lesson["score"] = p.get("score") if p else None
    return lesson


@api.post("/lessons/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: str, body: LessonCompleteIn, user: dict = Depends(get_current_user)
):
    lesson = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    if not lesson:
        raise HTTPException(404, "Lição não encontrada")
    await db.lesson_progress.update_one(
        {"user_id": user["id"], "lesson_id": lesson_id},
        {"$set": {
            "user_id": user["id"],
            "lesson_id": lesson_id,
            "instrument": lesson["instrument"],
            "completed": True,
            "score": body.score,
            "completed_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    # auto-loga prática de duração da lição
    await db.practice_sessions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "instrument": lesson["instrument"],
        "duration_minutes": lesson["duration_minutes"],
        "notes": f"Lição: {lesson['title']}",
        "created_at": datetime.now(timezone.utc),
    })
    return {"ok": True}


@api.get("/chords")
async def list_chords(
    instrument: Optional[Instrument] = None,
    difficulty: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q: dict = {}
    if instrument:
        q["instrument"] = instrument
    if difficulty:
        q["difficulty"] = difficulty
    items = await db.chords.find(q, {"_id": 0}).to_list(500)
    return items


#  Prática + Estatísticas 
@api.post("/practice")
async def log_practice(body: PracticeLogIn, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "instrument": body.instrument,
        "duration_minutes": body.duration_minutes,
        "notes": body.notes,
        "created_at": datetime.now(timezone.utc),
    }
    await db.practice_sessions.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api.get("/practice")
async def list_practice(user: dict = Depends(get_current_user)):
    items = await db.practice_sessions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    for i in items:
        if isinstance(i.get("created_at"), datetime):
            i["created_at"] = i["created_at"].isoformat()
    return items


def _calc_streak(dates: List[datetime]) -> int:
    """Calcula sequência de dias consecutivos de prática terminando em hoje (ou ontem)."""
    if not dates:
        return 0
    day_set = {d.astimezone(timezone.utc).date() for d in dates}
    today = datetime.now(timezone.utc).date()
    streak = 0
    cursor = today
    if cursor not in day_set:
        cursor = cursor - timedelta(days=1)
        if cursor not in day_set:
            return 0
    while cursor in day_set:
        streak += 1
        cursor = cursor - timedelta(days=1)
    return streak


@api.get("/me/stats")
async def my_stats(user: dict = Depends(get_current_user)):
    sessions = await db.practice_sessions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)

    total_minutes = sum(s["duration_minutes"] for s in sessions)
    total_sessions = len(sessions)
    dates = [s["created_at"] for s in sessions if isinstance(s.get("created_at"), datetime)]
    streak = _calc_streak(dates)

    # Minutos por dia nos últimos 7 dias
    today = datetime.now(timezone.utc).date()
    last7 = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        mins = sum(
            s["duration_minutes"] for s in sessions
            if isinstance(s.get("created_at"), datetime)
            and s["created_at"].astimezone(timezone.utc).date() == day
        )
        last7.append({"date": day.isoformat(), "minutes": mins})

    # Distribuição por instrumento
    by_inst: dict = {}
    for s in sessions:
        by_inst[s["instrument"]] = by_inst.get(s["instrument"], 0) + s["duration_minutes"]

    lessons_done = await db.lesson_progress.count_documents(
        {"user_id": user["id"], "completed": True}
    )
    lessons_total = await db.lessons.count_documents({})

    return {
        "total_minutes": total_minutes,
        "total_sessions": total_sessions,
        "streak_days": streak,
        "last_7_days": last7,
        "by_instrument": [{"instrument": k, "minutes": v} for k, v in by_inst.items()],
        "lessons_done": lessons_done,
        "lessons_total": lessons_total,
    }


#  Admin 
@api.get("/admin/users")
async def admin_users(
    search: Optional[str] = None,
    role: Optional[Role] = None,
    banned: Optional[bool] = None,
    _: dict = Depends(require_role("superadmin")),
):
    q: dict = {}
    if role:
        q["role"] = role
    if banned is not None:
        q["is_banned"] = banned
    if search:
        q["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
        ]
    users = await db.users.find(q, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    for u in users:
        if isinstance(u.get("created_at"), datetime):
            u["created_at"] = u["created_at"].isoformat()
    return users


@api.patch("/admin/users/{user_id}")
async def admin_patch_user(
    user_id: str, body: AdminUserPatchIn, admin: dict = Depends(require_role("superadmin"))
):
    if user_id == admin["id"]:
        raise HTTPException(400, "Não é possível alterar sua própria conta")
    update = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    if not update:
        raise HTTPException(400, "Nada para atualizar")
    res = await db.users.update_one({"id": user_id}, {"$set": update})
    if not res.matched_count:
        raise HTTPException(404, "Usuário não encontrado")
    return {"ok": True}


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_role("superadmin"))):
    if user_id == admin["id"]:
        raise HTTPException(400, "Não é possível deletar sua própria conta")
    res = await db.users.delete_one({"id": user_id})
    if not res.deleted_count:
        raise HTTPException(404, "Usuário não encontrado")
    await db.practice_sessions.delete_many({"user_id": user_id})
    await db.lesson_progress.delete_many({"user_id": user_id})
    return {"ok": True}


@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_role("superadmin"))):
    total_users = await db.users.count_documents({"role": "aluno"})
    banned_users = await db.users.count_documents({"is_banned": True})
    total_sessions = await db.practice_sessions.count_documents({})

    pipe_minutes = [{"$group": {"_id": None, "minutes": {"$sum": "$duration_minutes"}}}]
    agg = await db.practice_sessions.aggregate(pipe_minutes).to_list(1)
    total_minutes = agg[0]["minutes"] if agg else 0

    pipe_inst = [
        {"$group": {"_id": "$instrument", "minutes": {"$sum": "$duration_minutes"}, "sessions": {"$sum": 1}}},
        {"$sort": {"minutes": -1}},
    ]
    by_inst = await db.practice_sessions.aggregate(pipe_inst).to_list(20)
    by_instrument = [{"instrument": x["_id"], "minutes": x["minutes"], "sessions": x["sessions"]} for x in by_inst]

    # Top 5 alunos por minutos
    pipe_top = [
        {"$group": {"_id": "$user_id", "minutes": {"$sum": "$duration_minutes"}}},
        {"$sort": {"minutes": -1}},
        {"$limit": 5},
    ]
    top = await db.practice_sessions.aggregate(pipe_top).to_list(5)
    top_users = []
    for t in top:
        u = await db.users.find_one({"id": t["_id"]}, {"_id": 0, "password_hash": 0})
        if u:
            top_users.append({"id": u["id"], "name": u.get("name"), "email": u.get("email"), "minutes": t["minutes"]})

    # Usuários ativos nos últimos 7 dias
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_pipe = [
        {"$match": {"created_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "n"},
    ]
    active = await db.practice_sessions.aggregate(active_pipe).to_list(1)
    active_7d = active[0]["n"] if active else 0

    # Atividade dos últimos 14 dias
    today = datetime.now(timezone.utc).date()
    last14 = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        c = await db.practice_sessions.count_documents({"created_at": {"$gte": start, "$lt": end}})
        last14.append({"date": day.isoformat(), "sessions": c})

    return {
        "total_users": total_users,
        "banned_users": banned_users,
        "active_users_7d": active_7d,
        "total_sessions": total_sessions,
        "total_minutes": total_minutes,
        "by_instrument": by_instrument,
        "top_users": top_users,
        "activity_14d": last14,
    }


# App lifecycle

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await seed_db()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
