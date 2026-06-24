"""
Pydantic schemas for the Orthodontic Photo Analysis API.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum


class LandmarkCategory(str, Enum):
    SKELETAL = "skeletal"
    DENTAL = "dental"
    SOFT_TISSUE = "soft_tissue"


class PhotoType(str, Enum):
    FRONTAL = "frontal"
    PROFILE = "profile"
    SMILE = "smile"


class LandmarkPoint(BaseModel):
    id: str
    name: str
    x: float                           # pixel x on the uploaded image
    y: float                           # pixel y on the uploaded image
    confidence: Optional[float] = None # 0–1, from AI model
    category: LandmarkCategory
    photo_type: PhotoType


class LandmarkDetectionResponse(BaseModel):
    photo_id: PhotoType
    image_width: int
    image_height: int
    landmarks: List[LandmarkPoint]
    model_version: str = "dummy-v0"    # updated when real model is integrated


class ConfirmedLandmarks(BaseModel):
    """
    Sent by the frontend after the doctor has confirmed / corrected all points.
    The analysis engine only runs on confirmed landmarks.
    """
    patient_id: str
    frontal: List[LandmarkPoint]
    profile: List[LandmarkPoint]
    smile: List[LandmarkPoint]
    # Calibration: interpupillary distance in mm entered by clinician
    # (used to convert pixels → mm).  Default 63 mm (population mean).
    ipd_mm: float = 63.0


# ── Analysis result schemas ───────────────────────────────────────────────────

class FlagValue(str, Enum):
    NORMAL = "within_normal_limits"
    BORDERLINE = "borderline"
    ABNORMAL = "abnormal"
    MISSING_DATA = "missing_data"


class FacialSymmetry(BaseModel):
    midline_deviation_chin_mm: Optional[float]
    midline_deviation_nose_mm: Optional[float]
    alar_base_asymmetry_mm: Optional[float]
    mouth_corner_asymmetry_mm: Optional[float]
    canthus_asymmetry_mm: Optional[float]
    overall_flag: FlagValue


class FacialThirds(BaseModel):
    upper_pct: Optional[float]    # hairline → Gl  (not always detectable)
    middle_pct: Optional[float]   # Gl → Sn
    lower_pct: Optional[float]    # Sn → Me'
    flag: FlagValue
    note: str = ""


class SkeletalClass(BaseModel):
    estimated_class: str           # "Class I" | "Class II" | "Class III"
    nasolabial_angle_deg: Optional[float]
    upper_lip_to_eplane_mm: Optional[float]
    lower_lip_to_eplane_mm: Optional[float]
    pog_to_sn_vertical_mm: Optional[float]
    confidence_note: str = "Photographic soft-tissue estimate only. Confirm with lateral cephalogram."


class LipCompetence(BaseModel):
    upper_lip_length_mm: Optional[float]       # Sn → Sto  (norm: 19–22 F, 20–24 M)
    lower_lip_length_mm: Optional[float]       # Sto → Me' (norm: 38–44)
    interlabial_gap_mm: Optional[float]        # norm: 0–3 mm
    nasolabial_angle_deg: Optional[float]      # Cm–Sn–Ls  (norm: 90–110°)
    mentolabial_fold_deg: Optional[float]      # norm: 120–135°
    upper_lip_to_eplane_mm: Optional[float]   # norm: −4 mm (Caucasian)
    lower_lip_to_eplane_mm: Optional[float]   # norm: −2 mm (Caucasian)
    flag: FlagValue
    ethnicity_note: str = "Norms shown are for Caucasian population (Ricketts). Adjust for other ethnicities."


class SmileArc(BaseModel):
    arc_classification: str        # "consonant" | "flat" | "reverse"
    buccal_corridor_left_pct: Optional[float]   # norm: 10–15%
    buccal_corridor_right_pct: Optional[float]
    flag: FlagValue


class DentalMidline(BaseModel):
    udm_deviation_from_facial_mm: Optional[float]   # norm: < 1 mm
    ldm_deviation_from_facial_mm: Optional[float]   # norm: < 2 mm
    udm_ldm_shift_mm: Optional[float]
    flag: FlagValue


class OverjetOverbite(BaseModel):
    overjet_estimate_mm: Optional[float]   # norm: 2–4 mm
    overbite_estimate_mm: Optional[float]  # norm: 2–4 mm
    overjet_class: str    # "normal" | "increased" | "reduced" | "edge_to_edge" | "reverse"
    overbite_class: str   # "normal" | "increased" | "open_bite" | "edge_to_edge"
    note: str = "Photographic estimate — confirm clinically with study models or CBCT."


class AnalysisResponse(BaseModel):
    patient_id: str
    analyses: Dict[str, Any]   # keyed by analysis name, value is one of the above models
    key_findings: List[str]
    disclaimer: str = (
        "This analysis is a clinical decision support tool produced by an AI system. "
        "It does not replace the professional judgment of a qualified orthodontist. "
        "All measurements should be verified clinically before treatment planning."
    )
