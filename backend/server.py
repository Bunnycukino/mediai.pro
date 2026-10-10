"""MediAI Medical Helper — main FastAPI application."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os  # noqa: E402
import logging  # noqa: E402
from datetime import datetime, timezone  # noqa: E402
from contextlib import asynccontextmanager  # noqa: E402
from fastapi import FastAPI, APIRouter  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from auth_utils import hash_password, verify_password  # noqa: E402
from models import AdminSettings  # noqa: E402

# MongoDB connection (must be available before route imports use it)
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Import routers AFTER db is set up
from auth_routes import router as auth_router  # noqa: E402
from profile_routes import router as profile_router  # noqa: E402
from chat_routes import router as chat_router  # noqa: E402
from voice_routes import router as voice_router  # noqa: E402
from admin_routes import router as admin_router  # noqa: E402
from library_routes import router as library_router  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def initialize_settings():
    # Preserve existing user credentials during application restarts.
    settings = await db.settings.find_one({"_id": "global"})
    if not settings:
        await db.settings.insert_one({"_id": "global", **AdminSettings().model_dump()})


async def setup_indexes():
    await db.users.create_index("email", unique=True)
    await db.conversations.create_index([("user_id", 1), ("updated_at", -1)])
    await db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
    await db.messages.create_index("user_id")
    await db.login_attempts.create_index("identifier")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await setup_indexes()
    await initialize_settings()
    yield
    client.close()


app = FastAPI(title="MediAI Medical Helper", lifespan=lifespan)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "MediAI Medical Helper", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat()}


api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(chat_router)
api_router.include_router(voice_router)
api_router.include_router(admin_router)
api_router.include_router(library_router)

app.include_router(api_router)

# CORS — needs explicit origin when cookies are used (allow_credentials=True)
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
allowed_origins = ["https://mediai.pro", "https://www.mediai.pro", frontend_url, "http://localhost:3000", "https://susstyle.com", "https://www.susstyle.com", "https://susstyle.vercel.app"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
