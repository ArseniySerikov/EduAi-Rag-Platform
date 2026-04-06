import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import get_settings
from app.routers import auth, chats, messages, documents, admin, news, websites

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield

app = FastAPI(
    title="Student AI Platform API",
    version="1.0.0",
    lifespan=lifespan,)

def _cors_origins() -> list[str]:
    raw = settings.CORS_ORIGINS.strip()
    if raw:
        return [x.strip() for x in raw.split(",") if x.strip()]
    return [settings.FRONTEND_URL]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chats.router, prefix="/api/chats", tags=["chats"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(websites.router, prefix="/api/websites", tags=["websites"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
