"""
/upload and /detect-landmarks endpoints.

Phase 1: returns hardcoded dummy landmarks so the frontend canvas can be tested
without a trained model.  The dummy coordinates are expressed as fractions of
(image_width, image_height) and scaled to pixels at response time.

Phase 2 (AI integration): replace _detect_dummy_landmarks() with the HRNet
inference pipeline.
"""

import os
import uuid
import shutil
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse

from models.schemas import (
    LandmarkPoint, LandmarkDetectionResponse, LandmarkCategory, PhotoType
)

router = APIRouter(prefix="/api", tags=["landmarks"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# ── Dummy landmark definitions ────────────────────────────────────────────────
# Coordinates are normalised (0–1) relative to image size.
# They approximate a typical frontal/profile/smile photograph.
# Replace these with HRNet predictions in Phase 2.

DUMMY_FRONTAL: List[dict] = [
    # id, name, norm_x, norm_y, category
    {"id": "Gl",  "name": "Glabella",            "nx": 0.500, "ny": 0.195, "cat": LandmarkCategory.SKELETAL},
    {"id": "N",   "name": "Nasion",               "nx": 0.500, "ny": 0.230, "cat": LandmarkCategory.SKELETAL},
    {"id": "Prn", "name": "Nasal Tip",            "nx": 0.500, "ny": 0.375, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "Sn",  "name": "Subnasale",            "nx": 0.500, "ny": 0.430, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "AlL", "name": "Alar Base Left",       "nx": 0.435, "ny": 0.420, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "AlR", "name": "Alar Base Right",      "nx": 0.565, "ny": 0.420, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "EnL", "name": "Inner Canthus Left",   "nx": 0.430, "ny": 0.250, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "EnR", "name": "Inner Canthus Right",  "nx": 0.570, "ny": 0.250, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "ExL", "name": "Outer Canthus Left",   "nx": 0.340, "ny": 0.255, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "ExR", "name": "Outer Canthus Right",  "nx": 0.660, "ny": 0.255, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "ChL", "name": "Mouth Corner Left",    "nx": 0.430, "ny": 0.540, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "ChR", "name": "Mouth Corner Right",   "nx": 0.570, "ny": 0.540, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "Ls",  "name": "Upper Lip Midpoint",   "nx": 0.500, "ny": 0.510, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "Li",  "name": "Lower Lip Midpoint",   "nx": 0.500, "ny": 0.565, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "Me",  "name": "Soft Tissue Menton",   "nx": 0.500, "ny": 0.720, "cat": LandmarkCategory.SKELETAL},
    {"id": "UDM", "name": "Upper Dental Midline", "nx": 0.500, "ny": 0.525, "cat": LandmarkCategory.DENTAL},
    {"id": "LDM", "name": "Lower Dental Midline", "nx": 0.502, "ny": 0.555, "cat": LandmarkCategory.DENTAL},
]

DUMMY_PROFILE: List[dict] = [
    {"id": "Gl_p",  "name": "Glabella (profile)",       "nx": 0.480, "ny": 0.190, "cat": LandmarkCategory.SKELETAL},
    {"id": "N_p",   "name": "Soft Tissue Nasion",       "nx": 0.455, "ny": 0.225, "cat": LandmarkCategory.SKELETAL},
    {"id": "Prn_p", "name": "Pronasale (Nasal Tip)",    "nx": 0.350, "ny": 0.370, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "Cm",    "name": "Columella",                "nx": 0.380, "ny": 0.405, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "Sn_p",  "name": "Subnasale (profile)",      "nx": 0.395, "ny": 0.430, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "Ls_p",  "name": "Upper Lip (profile)",      "nx": 0.370, "ny": 0.505, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "Sto",   "name": "Stomion",                  "nx": 0.385, "ny": 0.535, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "Li_p",  "name": "Lower Lip (profile)",      "nx": 0.380, "ny": 0.565, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "B_p",   "name": "Soft Tissue B Point",      "nx": 0.405, "ny": 0.620, "cat": LandmarkCategory.SKELETAL},
    {"id": "Pog_p", "name": "Soft Tissue Pogonion",     "nx": 0.390, "ny": 0.660, "cat": LandmarkCategory.SKELETAL},
    {"id": "Me_p",  "name": "Soft Tissue Menton",       "nx": 0.410, "ny": 0.710, "cat": LandmarkCategory.SKELETAL},
    {"id": "T",     "name": "Tragus of Ear",            "nx": 0.760, "ny": 0.340, "cat": LandmarkCategory.SOFT_TISSUE},
]

DUMMY_SMILE: List[dict] = [
    {"id": "ChL_s",  "name": "Mouth Corner Left",            "nx": 0.370, "ny": 0.530, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "ChR_s",  "name": "Mouth Corner Right",           "nx": 0.630, "ny": 0.530, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "UI_L",   "name": "Upper Incisor Edge Left",      "nx": 0.485, "ny": 0.520, "cat": LandmarkCategory.DENTAL},
    {"id": "UI_R",   "name": "Upper Incisor Edge Right",     "nx": 0.515, "ny": 0.520, "cat": LandmarkCategory.DENTAL},
    {"id": "LI_L",   "name": "Lower Incisor Edge Left",      "nx": 0.485, "ny": 0.555, "cat": LandmarkCategory.DENTAL},
    {"id": "LI_R",   "name": "Lower Incisor Edge Right",     "nx": 0.515, "ny": 0.555, "cat": LandmarkCategory.DENTAL},
    {"id": "LL_mid", "name": "Lower Lip Midpoint",           "nx": 0.500, "ny": 0.590, "cat": LandmarkCategory.SOFT_TISSUE},
    {"id": "UDM_s",  "name": "Upper Dental Midline (smile)", "nx": 0.500, "ny": 0.530, "cat": LandmarkCategory.DENTAL},
    {"id": "BCL",    "name": "Buccal Corridor Left",         "nx": 0.305, "ny": 0.540, "cat": LandmarkCategory.DENTAL},
    {"id": "BCR",    "name": "Buccal Corridor Right",        "nx": 0.695, "ny": 0.540, "cat": LandmarkCategory.DENTAL},
]

DUMMY_MAP = {
    PhotoType.FRONTAL: DUMMY_FRONTAL,
    PhotoType.PROFILE: DUMMY_PROFILE,
    PhotoType.SMILE:   DUMMY_SMILE,
}


def _detect_dummy_landmarks(
    photo_type: PhotoType, img_w: int, img_h: int
) -> List[LandmarkPoint]:
    """
    Returns hardcoded landmark predictions scaled to the given image dimensions.
    Replace this function with HRNet inference in Phase 2.
    """
    defs = DUMMY_MAP[photo_type]
    points = []
    for d in defs:
        points.append(LandmarkPoint(
            id=d["id"],
            name=d["name"],
            x=round(d["nx"] * img_w, 1),
            y=round(d["ny"] * img_h, 1),
            confidence=0.85,          # placeholder confidence
            category=d["cat"],
            photo_type=photo_type,
        ))
    return points


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/upload/{photo_type}", response_model=LandmarkDetectionResponse)
async def upload_and_detect(
    photo_type: PhotoType,
    file: UploadFile = File(...),
):
    """
    Accepts a single photo, saves it to disk, runs landmark detection
    (currently dummy), and returns predicted landmark coordinates.

    photo_type: 'frontal' | 'profile' | 'smile'
    """
    # Validate MIME type
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type '{file.content_type}'. Use JPEG or PNG."
        )

    # Save file
    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{photo_type.value}_{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    with dest.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)

    # Read image dimensions with Pillow
    try:
        from PIL import Image as PILImage
        with PILImage.open(dest) as img:
            img_w, img_h = img.size
    except Exception:
        img_w, img_h = 1024, 768   # fallback

    # Run detection (dummy in Phase 1)
    landmarks = _detect_dummy_landmarks(photo_type, img_w, img_h)

    return LandmarkDetectionResponse(
        photo_id=photo_type,
        image_width=img_w,
        image_height=img_h,
        landmarks=landmarks,
        model_version="dummy-v0 (Phase 1 placeholder)",
    )


@router.get("/uploads/{filename}")
async def serve_upload(filename: str):
    """Serve uploaded images back to the frontend canvas."""
    from fastapi.responses import FileResponse
    path = UPLOAD_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)
