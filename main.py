"""
Orthodontic Photo Analysis API — FastAPI entry point.

Run with:
    uvicorn main:app --reload --port 8000
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from routers import landmarks, analysis

app = FastAPI(
    title="Orthodontic Photo Analysis API",
    description=(
        "AI-assisted soft tissue and facial landmark analysis from standardised "
        "extraoral photographs. For academic and clinical decision support use only."
    ),
    version="0.1.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production, set the FRONTEND_URL environment variable to your Netlify URL,
# e.g. https://your-site.netlify.app
_default_origins = [
    "http://localhost:5173",   # Vite dev server
    "http://localhost:3000",   # CRA fallback
    "http://127.0.0.1:5173",
]
_prod_origin = os.getenv("FRONTEND_URL")
allowed_origins = _default_origins + ([_prod_origin] if _prod_origin else [])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(landmarks.router)
app.include_router(analysis.router)

# ── Serve uploaded images statically ─────────────────────────────────────────
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    """Quick liveness probe."""
    return {
        "status": "ok",
        "service": "orthodontic-analysis-api",
        "version": "0.1.0",
        "phase": "1 — Phase 1 (dummy landmarks, full analysis engine)",
    }


@app.get("/", tags=["system"])
async def root():
    return {
        "message": "Orthodontic Photo Analysis API",
        "docs": "/docs",
        "health": "/health",
    }
