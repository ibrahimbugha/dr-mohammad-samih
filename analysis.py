"""
/analyse endpoint.

Phase 1: returns placeholder analysis JSON so the frontend dashboard can be
tested end-to-end.

Phase 3: replace each _analyse_* stub with the real geometry engine
(numpy + scipy).  Each measurement is documented with:
  - landmarks used
  - formula
  - normal range + source
"""

import math
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException

from models.schemas import (
    ConfirmedLandmarks, AnalysisResponse, LandmarkPoint,
    FacialSymmetry, FacialThirds, SkeletalClass, LipCompetence,
    SmileArc, DentalMidline, OverjetOverbite, FlagValue
)

router = APIRouter(prefix="/api", tags=["analysis"])


# ── Geometry helpers ──────────────────────────────────────────────────────────

def _get(lms: List[LandmarkPoint], landmark_id: str) -> Optional[LandmarkPoint]:
    """Return landmark by id, or None if not present."""
    for lm in lms:
        if lm.id == landmark_id:
            return lm
    return None


def _dist(a: LandmarkPoint, b: LandmarkPoint) -> float:
    return math.hypot(a.x - b.x, a.y - b.y)


def _px_to_mm(pixels: float, scale: float) -> float:
    """scale = mm per pixel, derived from IPD calibration."""
    return pixels * scale


def _calibration_scale(frontal: List[LandmarkPoint], ipd_mm: float) -> Optional[float]:
    """
    Derives mm-per-pixel scale from inter-pupillary distance.

    We use the outer canthi distance as a more reliably detectable proxy:
        IPD_px ≈ 0.70 × distance(ExL, ExR)   (Farkas 1994 proportions)

    Source: Farkas LG. Anthropometry of the Head and Face. 1994.
    """
    exL = _get(frontal, "ExL")
    exR = _get(frontal, "ExR")
    if exL and exR:
        outer_canthus_px = _dist(exL, exR)
        ipd_px = outer_canthus_px * 0.70
        if ipd_px > 0:
            return ipd_mm / ipd_px
    # Fallback: use alar base width as proxy (norm ~ 35 mm)
    alL = _get(frontal, "AlL")
    alR = _get(frontal, "AlR")
    if alL and alR:
        alar_px = _dist(alL, alR)
        if alar_px > 0:
            return 35.0 / alar_px
    return None


def _angle_deg(a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint) -> float:
    """Angle at vertex B formed by rays B→A and B→C. Returns degrees."""
    ax, ay = a.x - b.x, a.y - b.y
    cx, cy = c.x - b.x, c.y - b.y
    dot = ax * cx + ay * cy
    mag_a = math.hypot(ax, ay)
    mag_c = math.hypot(cx, cy)
    if mag_a == 0 or mag_c == 0:
        return 0.0
    cos_theta = max(-1.0, min(1.0, dot / (mag_a * mag_c)))
    return math.degrees(math.acos(cos_theta))


def _point_to_line_signed(
    px: float, py: float,
    ax: float, ay: float, bx: float, by: float
) -> float:
    """Signed distance from point P to line AB."""
    dx, dy = bx - ax, by - ay
    length = math.hypot(dx, dy)
    if length == 0:
        return 0.0
    return ((py - ay) * dx - (px - ax) * dy) / length


# ── Analysis 1: Facial Symmetry ───────────────────────────────────────────────
# Source: Arnett & Bergman (1993); flag threshold > 2 mm

def _analyse_symmetry(frontal: List[LandmarkPoint], scale: Optional[float]) -> Dict:
    gl  = _get(frontal, "Gl");  sn  = _get(frontal, "Sn");  me  = _get(frontal, "Me")
    alL = _get(frontal, "AlL"); alR = _get(frontal, "AlR")
    chL = _get(frontal, "ChL"); chR = _get(frontal, "ChR")
    enL = _get(frontal, "EnL"); enR = _get(frontal, "EnR")

    def _sym(lmA, lmB, midline_x):
        if lmA and lmB:
            dev_px = abs((lmA.x + lmB.x) / 2 - midline_x)
            return round(_px_to_mm(dev_px, scale), 2) if scale else round(dev_px, 2)
        return None

    midline_x = gl.x if gl else (sn.x if sn else None)
    if midline_x is None:
        return FacialSymmetry(midline_deviation_chin_mm=None, midline_deviation_nose_mm=None,
                              alar_base_asymmetry_mm=None, mouth_corner_asymmetry_mm=None,
                              canthus_asymmetry_mm=None, overall_flag=FlagValue.MISSING_DATA).model_dump()

    chin_dev = round(abs(me.x - midline_x) * scale, 2) if me and scale else None
    prn = _get(frontal, "Prn")
    nose_dev = round(abs(prn.x - midline_x) * scale, 2) if prn and scale else None
    alar_asym   = _sym(alL, alR, midline_x)
    mouth_asym  = _sym(chL, chR, midline_x)
    canthus_asym = _sym(enL, enR, midline_x)

    devs = [d for d in [chin_dev, nose_dev, alar_asym, mouth_asym, canthus_asym] if d is not None]
    if not devs:               flag = FlagValue.MISSING_DATA
    elif any(d > 2.0 for d in devs): flag = FlagValue.ABNORMAL
    elif any(d > 1.5 for d in devs): flag = FlagValue.BORDERLINE
    else:                             flag = FlagValue.NORMAL

    return FacialSymmetry(midline_deviation_chin_mm=chin_dev, midline_deviation_nose_mm=nose_dev,
                          alar_base_asymmetry_mm=alar_asym, mouth_corner_asymmetry_mm=mouth_asym,
                          canthus_asymmetry_mm=canthus_asym, overall_flag=flag).model_dump()


# ── Analysis 2: Facial Thirds ─────────────────────────────────────────────────
# Source: Farkas 1994; Arnett & Bergman 1993. Flag if deviation from 33.3% > 5%.

def _analyse_thirds(frontal: List[LandmarkPoint], profile: List[LandmarkPoint], scale: Optional[float]) -> Dict:
    gl = _get(frontal, "Gl"); sn = _get(frontal, "Sn"); me = _get(frontal, "Me")
    if not (gl and sn and me):
        return FacialThirds(upper_pct=None, middle_pct=None, lower_pct=None,
                            flag=FlagValue.MISSING_DATA, note="Gl, Sn or Me not detected.").model_dump()
    total_px = me.y - gl.y
    if total_px <= 0:
        return FacialThirds(upper_pct=None, middle_pct=None, lower_pct=None,
                            flag=FlagValue.MISSING_DATA, note="Invalid y-ordering.").model_dump()
    middle_pct = round(100 * (sn.y - gl.y) / total_px, 1)
    lower_pct  = round(100 * (me.y - sn.y) / total_px, 1)
    upper_pct  = round(100 - middle_pct - lower_pct, 1)
    max_dev = max(abs(middle_pct - 33.3), abs(lower_pct - 33.3))
    flag = FlagValue.ABNORMAL if max_dev > 5.0 else (FlagValue.BORDERLINE if max_dev > 3.0 else FlagValue.NORMAL)
    return FacialThirds(upper_pct=upper_pct, middle_pct=middle_pct, lower_pct=lower_pct, flag=flag,
                        note="Upper third inferred (hairline not detected).").model_dump()


# ── Analysis 3: Skeletal Class Estimate ──────────────────────────────────────
# E-plane (Ricketts): Prn_p → Pog_p. Source: Ricketts 1968; Arnett & Bergman 1993.

def _analyse_skeletal(profile: List[LandmarkPoint], scale: Optional[float]) -> Dict:
    prn=_get(profile,"Prn_p"); sn=_get(profile,"Sn_p"); ls=_get(profile,"Ls_p")
    li=_get(profile,"Li_p");   pog=_get(profile,"Pog_p"); cm=_get(profile,"Cm")
    nasolabial = round(_angle_deg(cm, sn, ls), 1) if cm and sn and ls else None
    upper_eplane = lower_eplane = None
    if prn and pog and ls and li and scale:
        upper_eplane = round(_point_to_line_signed(ls.x, ls.y, prn.x, prn.y, pog.x, pog.y) * scale, 2)
        lower_eplane = round(_point_to_line_signed(li.x, li.y, prn.x, prn.y, pog.x, pog.y) * scale, 2)
    est_class = "Class I"
    if lower_eplane is not None:
        if lower_eplane > 1.0:   est_class = "Class III tendency"
        elif lower_eplane < -4.0: est_class = "Class II tendency"
    pog_sn = round((pog.x - sn.x) * scale, 2) if pog and sn and scale else None
    return SkeletalClass(estimated_class=est_class, nasolabial_angle_deg=nasolabial,
                         upper_lip_to_eplane_mm=upper_eplane, lower_lip_to_eplane_mm=lower_eplane,
                         pog_to_sn_vertical_mm=pog_sn).model_dump()


# ── Analysis 4: Lip Competence ────────────────────────────────────────────────
# Source: Arnett & Bergman 1993; Subtelny 1961.

def _analyse_lip(profile: List[LandmarkPoint], scale: Optional[float]) -> Dict:
    sn=_get(profile,"Sn_p"); sto=_get(profile,"Sto"); li=_get(profile,"Li_p")
    me=_get(profile,"Me_p"); cm=_get(profile,"Cm");   ls=_get(profile,"Ls_p")
    b=_get(profile,"B_p");   pog=_get(profile,"Pog_p"); prn=_get(profile,"Prn_p")
    ul_len = round(_dist(sn, sto) * scale, 2) if sn and sto and scale else None
    ll_len = round(_dist(sto, me) * scale, 2) if sto and me and scale else None
    interlabial = round(max(0.0, (li.y - ls.y)) * scale, 2) if ls and li and scale else None
    nasolabial  = round(_angle_deg(cm, sn, ls), 1) if cm and sn and ls else None
    mentolabial = round(_angle_deg(li, b, pog), 1) if li and b and pog else None
    upper_eplane = lower_eplane = None
    if prn and pog and ls and li and scale:
        upper_eplane = round(_point_to_line_signed(ls.x, ls.y, prn.x, prn.y, pog.x, pog.y) * scale, 2)
        lower_eplane = round(_point_to_line_signed(li.x, li.y, prn.x, prn.y, pog.x, pog.y) * scale, 2)
    flags = []
    if ul_len is not None and (ul_len < 19 or ul_len > 24): flags.append(1)
    if interlabial is not None and interlabial > 3.0:        flags.append(1)
    if nasolabial is not None and (nasolabial < 90 or nasolabial > 110): flags.append(1)
    flag = FlagValue.ABNORMAL if len(flags) >= 2 else (FlagValue.BORDERLINE if flags else FlagValue.NORMAL)
    return LipCompetence(upper_lip_length_mm=ul_len, lower_lip_length_mm=ll_len,
                         interlabial_gap_mm=interlabial, nasolabial_angle_deg=nasolabial,
                         mentolabial_fold_deg=mentolabial, upper_lip_to_eplane_mm=upper_eplane,
                         lower_lip_to_eplane_mm=lower_eplane, flag=flag).model_dump()


# ── Analysis 5: Smile Arc & Buccal Corridor ───────────────────────────────────
# Source: Sarver & Ackerman 2001; Hulsey 1970. Buccal corridor norm: 10–15% each side.

def _analyse_smile(smile: List[LandmarkPoint], scale: Optional[float]) -> Dict:
    ui_l=_get(smile,"UI_L"); ui_r=_get(smile,"UI_R"); ll=_get(smile,"LL_mid")
    chL=_get(smile,"ChL_s"); chR=_get(smile,"ChR_s"); bcL=_get(smile,"BCL"); bcR=_get(smile,"BCR")
    arc = "indeterminate"
    if ui_l and ui_r and ll and chL and chR:
        diff = (ui_l.y + ui_r.y) / 2 - (chL.y + chR.y) / 2
        arc = "consonant" if diff > 3 else ("flat" if diff > -3 else "reverse")
    bc_left = bc_right = None
    if chL and chR and bcL and bcR:
        sw = chR.x - chL.x
        if sw > 0:
            bc_left  = round(100 * (chL.x - bcL.x) / sw, 1)
            bc_right = round(100 * (bcR.x - chR.x) / sw, 1)
    bc_flags = sum(1 for v in [bc_left, bc_right] if v is not None and (v < 10 or v > 15))
    flag = FlagValue.ABNORMAL if arc == "reverse" or bc_flags == 2 else (
           FlagValue.BORDERLINE if arc == "flat" or bc_flags > 0 else FlagValue.NORMAL)
    return SmileArc(arc_classification=arc, buccal_corridor_left_pct=bc_left,
                    buccal_corridor_right_pct=bc_right, flag=flag).model_dump()


# ── Analysis 6: Dental Midline ────────────────────────────────────────────────
# Source: Peck & Peck 1995; Proffit & Fields 2013.

def _analyse_midline(frontal: List[LandmarkPoint], smile: List[LandmarkPoint], scale: Optional[float]) -> Dict:
    gl=_get(frontal,"Gl"); udm=_get(frontal,"UDM") or _get(smile,"UDM_s"); ldm=_get(frontal,"LDM")
    midline_x = gl.x if gl else None
    udm_dev = round(abs(udm.x - midline_x) * scale, 2) if udm and midline_x is not None and scale else None
    ldm_dev = round(abs(ldm.x - midline_x) * scale, 2) if ldm and midline_x is not None and scale else None
    shift   = round(abs(udm.x - ldm.x) * scale, 2) if udm and ldm and scale else None
    flag = FlagValue.NORMAL
    if (udm_dev and udm_dev > 2.0) or (ldm_dev and ldm_dev > 2.0): flag = FlagValue.ABNORMAL
    elif (udm_dev and udm_dev > 1.0) or (ldm_dev and ldm_dev > 1.0): flag = FlagValue.BORDERLINE
    return DentalMidline(udm_deviation_from_facial_mm=udm_dev, ldm_deviation_from_facial_mm=ldm_dev,
                         udm_ldm_shift_mm=shift, flag=flag).model_dump()


# ── Analysis 7: Overjet & Overbite ───────────────────────────────────────────
# Source: Proffit & Fields (2013). Photographic estimates only.

def _classify_overjet(oj):
    if oj is None: return "not_measured"
    if oj < 0: return "reverse"
    if oj < 1: return "edge_to_edge"
    if oj <= 4: return "normal"
    if oj <= 6: return "increased"
    return "severely_increased"

def _classify_overbite(ob):
    if ob is None: return "not_measured"
    if ob < 0: return "open_bite"
    if ob < 1: return "edge_to_edge"
    if ob <= 4: return "normal"
    if ob <= 6: return "increased"
    return "severely_increased"

def _analyse_overjet_overbite(smile: List[LandmarkPoint], scale: Optional[float]) -> Dict:
    ui_l=_get(smile,"UI_L"); ui_r=_get(smile,"UI_R"); li_l=_get(smile,"LI_L"); li_r=_get(smile,"LI_R")
    oj = ob = None
    if ui_l and li_l and ui_r and li_r and scale:
        oj = round((abs(ui_l.x - li_l.x) + abs(ui_r.x - li_r.x)) / 2 * scale, 2)
        ob = round(((li_l.y - ui_l.y) + (li_r.y - ui_r.y)) / 2 * scale, 2)
    return OverjetOverbite(overjet_estimate_mm=oj, overbite_estimate_mm=ob,
                           overjet_class=_classify_overjet(oj), overbite_class=_classify_overbite(ob)).model_dump()


# ── Key findings generator ────────────────────────────────────────────────────

def _generate_findings(analyses: Dict) -> List[str]:
    findings = []
    sym = analyses.get("facial_symmetry", {})
    if sym.get("overall_flag") == FlagValue.ABNORMAL:
        findings.append(f"Facial asymmetry: chin deviated {sym.get('midline_deviation_chin_mm')} mm (> 2 mm threshold).")
    else:
        findings.append("Facial symmetry: within normal limits.")
    thirds = analyses.get("facial_thirds", {})
    if thirds.get("flag") == FlagValue.ABNORMAL:
        findings.append(f"Facial thirds imbalance: middle {thirds.get('middle_pct')}%, lower {thirds.get('lower_pct')}% (ideal 33.3%).")
    sk = analyses.get("skeletal_class", {})
    if sk.get("estimated_class"):
        findings.append(f"Soft tissue skeletal estimate: {sk['estimated_class']}.")
    lip = analyses.get("lip_competence", {})
    if lip.get("flag") in (FlagValue.ABNORMAL, FlagValue.BORDERLINE):
        gap = lip.get("interlabial_gap_mm")
        if gap and gap > 3.0:
            findings.append(f"Lip incompetence: interlabial gap {gap} mm at rest (norm 0–3 mm).")
    smile = analyses.get("smile_arc", {})
    if smile.get("arc_classification") in ("flat", "reverse"):
        findings.append(f"Smile arc: {smile['arc_classification']} (consonant preferred).")
    mid = analyses.get("dental_midline", {})
    if mid.get("flag") in (FlagValue.ABNORMAL, FlagValue.BORDERLINE):
        findings.append(f"Dental midline: UDM {mid.get('udm_deviation_from_facial_mm')} mm, LDM {mid.get('ldm_deviation_from_facial_mm')} mm from facial midline.")
    oj = analyses.get("overjet_overbite", {})
    if oj.get("overjet_class") not in ("normal", "not_measured"):
        findings.append(f"Overjet estimate: {oj.get('overjet_estimate_mm')} mm — {oj.get('overjet_class')}.")
    if not findings:
        findings.append("All assessed parameters are within normal limits.")
    return findings


# ── Main endpoint ─────────────────────────────────────────────────────────────

@router.post("/analyse", response_model=AnalysisResponse)
async def analyse(payload: ConfirmedLandmarks):
    """
    Runs all clinical analyses on confirmed landmark coordinates.
    IMPORTANT: only call this after the doctor has confirmed all landmark positions.
    """
    scale = _calibration_scale(payload.frontal, payload.ipd_mm)
    analyses: Dict = {
        "facial_symmetry":  _analyse_symmetry(payload.frontal, scale),
        "facial_thirds":    _analyse_thirds(payload.frontal, payload.profile, scale),
        "skeletal_class":   _analyse_skeletal(payload.profile, scale),
        "lip_competence":   _analyse_lip(payload.profile, scale),
        "smile_arc":        _analyse_smile(payload.smile, scale),
        "dental_midline":   _analyse_midline(payload.frontal, payload.smile, scale),
        "overjet_overbite": _analyse_overjet_overbite(payload.smile, scale),
    }
    return AnalysisResponse(patient_id=payload.patient_id, analyses=analyses,
                            key_findings=_generate_findings(analyses))
