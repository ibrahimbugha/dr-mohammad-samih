# OrthoAnalyse — AI Orthodontic Photo Analysis System
## Complete Project Documentation (v2.0)
> Last updated: June 2026  
> Author: Doctor Mohammad Samih  
> Context: Master's Thesis — AI-assisted orthodontic facial analysis

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Folder Structure](#2-folder-structure)
3. [Technology Stack](#3-technology-stack)
4. [Clinical Workflow](#4-clinical-workflow)
5. [Landmark Definitions](#5-landmark-definitions)
6. [Clinical Analyses & Formulas](#6-clinical-analyses--formulas)
7. [Calibration System](#7-calibration-system)
8. [Face Detection](#8-face-detection)
9. [Patient Archive System](#9-patient-archive-system)
10. [Export Features](#10-export-features)
11. [Landmark Editor](#11-landmark-editor)
12. [Critical Clinical Constraints](#12-critical-clinical-constraints)
13. [State Machine](#13-state-machine)
14. [Known Limitations & Future Work](#14-known-limitations--future-work)
15. [Deployment Instructions](#15-deployment-instructions)
16. [Resuming or Editing the Project](#16-resuming-or-editing-the-project)

---

## 1. PROJECT OVERVIEW

**OrthoAnalyse** is a self-contained, single-file HTML web application for AI-assisted orthodontic facial photograph analysis. It is built as a decision-support tool for a Master's thesis in orthodontics.

### Purpose
The system accepts three standardised extraoral photographs (frontal at rest, lateral profile at rest, full smile), places AI-detected anatomical landmarks on each, allows a qualified clinician to review and correct those landmarks, and then computes 7 clinical soft-tissue analyses with reference norms.

### Key Design Decisions
- **Single HTML file** — No build step, no server required. Drag the file to Netlify or open locally in Chrome/Edge.
- **Doctor-in-the-loop mandatory** — Analysis NEVER runs on raw AI landmarks. The clinician must explicitly confirm each photo's landmarks before analysis proceeds.
- **Decision support only** — The system never diagnoses. Every result page and export includes the mandatory disclaimer.
- **No backend** — All processing happens in the browser via JavaScript. No patient data leaves the device.
- **Persistent archive** — Completed analyses are saved to `localStorage` and remain accessible across browser sessions on the same device.

---

## 2. FOLDER STRUCTURE

```
C:\Users\HP\OneDrive\Desktop\MASTER\
│
├── orthodontic-analysis.html        ← PRIMARY DELIVERABLE (single-file web app)
├── generate-test-images.html        ← Helper: generates 3 synthetic test face images
│                                       for testing the app pipeline
└── PROJECT_DOCUMENTATION.md         ← THIS FILE
```

### orthodontic-analysis.html
This is the entire application in one file. It contains:
- HTML structure
- All CSS styles (embedded `<style>`)
- React 18 components (embedded `<script type="text/babel">`)
- All clinical logic
- All drawing/canvas code
- No external dependencies except CDN scripts loaded at runtime

### generate-test-images.html
A standalone utility page. Open in any browser, click "Download All 3 Images" to get synthetic frontal, profile, and smile face illustrations. Used for testing the full app pipeline without real patient photos.

---

## 3. TECHNOLOGY STACK

| Library | Version | CDN URL | Purpose |
|---------|---------|---------|---------|
| React | 18.2.0 | cdnjs.cloudflare.com | UI components |
| ReactDOM | 18.2.0 | cdnjs.cloudflare.com | DOM rendering |
| Babel Standalone | 7.23.2 | cdnjs.cloudflare.com | JSX transpilation in-browser |
| SheetJS (xlsx) | 0.18.5 | cdnjs.cloudflare.com | Excel export (.xlsx) |
| FaceDetector API | native | browser built-in | Face/landmark detection (Chrome/Edge only) |

### No npm, no build step
All CDN scripts are loaded via `<script src="...">` tags in the `<head>`. Babel transpiles JSX at page load. This makes the file deployable anywhere that serves static HTML.

### Browser Compatibility
- **Best**: Chrome 123+ or Edge 123+ (FaceDetector API available → better auto-landmark placement)
- **Acceptable**: Any modern browser (FaceDetector absent → falls back to anatomical ratio defaults)
- **Not supported**: Internet Explorer

---

## 4. CLINICAL WORKFLOW

The app is a strict linear state machine. The user cannot skip ahead.

```
upload → review-frontal → review-profile → review-smile → [analysing] → results
                                                                           ↓
                                                                      auto-saved
                                                                      to archive
```

### Step 1: Upload
- User enters Patient ID (auto-generated as P + timestamp, editable)
- User enters IPD in mm (Inter-Pupillary Distance, default 63 mm, used for px→mm calibration)
- User uploads 3 photos: frontal, profile, smile
- Photos must be JPEG, PNG, or WebP
- All 3 required before proceeding

### Step 2–4: Landmark Review (one per photo)
- On entering each review stage, the app runs `detectAndRefine(img, photoType)` to auto-place landmarks
- The AI places landmark dots on the canvas image
- The clinician can:
  - **Drag** any dot to correct its position
  - **Select** a dot (click) then press **Delete/Backspace** to remove it
  - Use the **✚ Add** button to enter add-mode, pick a landmark from the list, click the canvas to place it
  - Adjust **dot size** with a slider (33%–100% of base radius 5px)
  - Toggle **label display**, **facial midline guide**, and **golden ratio overlay**
- The **Confirm Landmarks** button is the doctor-in-the-loop gate. Analysis does NOT run until this is clicked for all 3 photos.
- **Progress steps are clickable** — clicking a completed step navigates back to it WITHOUT clearing confirmed landmarks from other photos.

### Step 5: Analysis
- All 7 analyses run synchronously in JavaScript
- A 350ms artificial delay shows the spinner to communicate processing
- On completion, the record is auto-saved to localStorage archive
- Results stage is shown

### Archive
- At any time, clicking "📁 Archive" in the header opens the patient library
- All saved patients shown as cards with key findings
- Click any patient to view their full report
- Delete with 🗑 (double-click to confirm)
- Search by ID, date, or class

---

## 5. LANDMARK DEFINITIONS

All coordinates are stored as `nx` (normalised x, 0–1) and `ny` (normalised y, 0–1) relative to image width/height. At runtime they become pixel coordinates: `x = nx × imageWidth`, `y = ny × imageHeight`.

### Convention
- **R landmarks** = patient's anatomical right = image LEFT (lower x values)
- **L landmarks** = patient's anatomical left = image RIGHT (higher x values)
- **y increases downward** (standard canvas coordinates)

### Category colours
| Category | Fill | Stroke |
|----------|------|--------|
| skeletal | #3b82f6 (blue) | #1d4ed8 |
| dental | #eab308 (yellow) | #a16207 |
| soft_tissue | #22c55e (green) | #15803d |

---

### 5.1 Frontal Landmarks (LM_FRONTAL) — 15 points, NO dental

| ID | Name | nx | ny | Category |
|----|------|----|----|----------|
| Gl | Glabella | 0.500 | 0.165 | skeletal |
| N | Nasion | 0.500 | 0.222 | skeletal |
| ExR | Outer Canthus (R) | 0.318 | 0.252 | soft_tissue |
| EnR | Inner Canthus (R) | 0.418 | 0.255 | soft_tissue |
| EnL | Inner Canthus (L) | 0.582 | 0.255 | soft_tissue |
| ExL | Outer Canthus (L) | 0.682 | 0.252 | soft_tissue |
| Prn | Nasal Tip | 0.500 | 0.395 | soft_tissue |
| AlR | Alar Base (R) | 0.432 | 0.422 | soft_tissue |
| AlL | Alar Base (L) | 0.568 | 0.422 | soft_tissue |
| Sn | Subnasale | 0.500 | 0.448 | soft_tissue |
| Ls | Upper Lip | 0.500 | 0.510 | soft_tissue |
| ChR | Mouth Corner (R) | 0.415 | 0.524 | soft_tissue |
| ChL | Mouth Corner (L) | 0.585 | 0.524 | soft_tissue |
| Li | Lower Lip | 0.500 | 0.558 | soft_tissue |
| Me | Menton (Me') | 0.500 | 0.740 | skeletal |

> **NOTE**: UDM (Upper Dental Midline) and LDM (Lower Dental Midline) were intentionally REMOVED from the frontal landmark set. They were causing stray dots in image corners due to FaceDetector mislocalisation. Dental midline analysis uses only UDM_s from the SMILE photo.

---

### 5.2 Profile Landmarks (LM_PROFILE) — 12 points, NO dental

| ID | Name | nx | ny | Category |
|----|------|----|----|----------|
| Gl_p | Glabella | 0.468 | 0.178 | skeletal |
| N_p | Soft Tissue Nasion | 0.448 | 0.222 | skeletal |
| Prn_p | Pronasale (Nasal Tip) | 0.338 | 0.368 | soft_tissue |
| Cm | Columella | 0.370 | 0.402 | soft_tissue |
| Sn_p | Subnasale | 0.388 | 0.432 | soft_tissue |
| Ls_p | Upper Lip | 0.362 | 0.500 | soft_tissue |
| Sto | Stomion | 0.378 | 0.528 | soft_tissue |
| Li_p | Lower Lip | 0.375 | 0.558 | soft_tissue |
| B_p | Soft Tissue B Point | 0.398 | 0.618 | skeletal |
| Pog_p | Soft Tissue Pogonion | 0.384 | 0.656 | skeletal |
| Me_p | Menton (Me') | 0.408 | 0.708 | skeletal |
| T | Tragus of Ear | 0.758 | 0.338 | soft_tissue |

> **NOTE**: Profile face detection via FaceDetector API is bypassed entirely (`if(photoType==='profile') return lms;`). FaceDetector fails on true 90° profiles. Only anatomical normalised defaults are used; the clinician corrects manually.

---

### 5.3 Smile Landmarks (LM_SMILE) — 10 points, HAS dental

| ID | Name | nx | ny | Category |
|----|------|----|----|----------|
| ChR_s | Mouth Corner (R) | 0.345 | 0.528 | soft_tissue |
| ChL_s | Mouth Corner (L) | 0.655 | 0.528 | soft_tissue |
| UI_R | Upper Incisor Edge (R) | 0.488 | 0.518 | dental |
| UI_L | Upper Incisor Edge (L) | 0.512 | 0.518 | dental |
| LI_R | Lower Incisor Edge (R) | 0.488 | 0.552 | dental |
| LI_L | Lower Incisor Edge (L) | 0.512 | 0.552 | dental |
| LL_mid | Lower Lip Midpoint | 0.500 | 0.590 | soft_tissue |
| UDM_s | Upper Dental Midline | 0.500 | 0.524 | dental |
| BCR | Buccal Corridor (R) | 0.278 | 0.534 | dental |
| BCL | Buccal Corridor (L) | 0.722 | 0.534 | dental |

---

## 6. CLINICAL ANALYSES & FORMULAS

All functions are in the `<script>` section of orthodontic-analysis.html.

### Helper functions
```javascript
function dist(a, b)                          // Euclidean distance in pixels
function angleDeg(a, b, c)                   // Angle at vertex b formed by a–b–c
function ptLineSigned(px,py, ax,ay, bx,by)   // Signed perpendicular distance point→line (px)
function g(lms, id)                          // Find landmark by id in array
function r1(v)                               // Round to 1 decimal place
function calibScale(frontal, ipdMm)          // Returns mm/px scale factor
```

---

### 6.1 Facial Symmetry (`analyseSymmetry`)
**Source**: Arnett & Bergman (1993)  
**Inputs**: frontal landmarks  
**Midline reference**: Glabella x-coordinate (`Gl.x`)

| Measurement | Formula | Normal |
|-------------|---------|--------|
| Chin deviation | `|Me.x − Gl.x| × scale` | < 2 mm |
| Nasal tip deviation | `|Prn.x − Gl.x| × scale` | < 2 mm |
| Alar base asymmetry | `|(AlR.x + AlL.x)/2 − Gl.x| × scale` | < 2 mm |
| Mouth corner asymmetry | `|(ChR.x + ChL.x)/2 − Gl.x| × scale` | < 2 mm |
| Canthus asymmetry | `|(EnR.x + EnL.x)/2 − Gl.x| × scale` | < 2 mm |

**Flags**: `within_normal_limits` if all < 1.5 mm · `borderline` if any 1.5–2 mm · `abnormal` if any > 2 mm

---

### 6.2 Facial Thirds (`analyseThirds`)
**Source**: Farkas (1994)  
**Inputs**: frontal landmarks: Gl, Sn, Me  
**Note**: Upper third is inferred (100% − mid% − low%)

| Third | Formula |
|-------|---------|
| Middle | `(Sn.y − Gl.y) / (Me.y − Gl.y) × 100` |
| Lower | `(Me.y − Sn.y) / (Me.y − Gl.y) × 100` |

**Flag**: `abnormal` if maxDeviation > 5% from 33.3% · `borderline` > 3%

---

### 6.3 Skeletal Class Estimate (`analyseSkeletal`)
**Source**: Ricketts (1968), soft-tissue E-plane  
**Inputs**: profile landmarks  
**Important caveat**: This is a SOFT-TISSUE estimate only. Skeletal class must be confirmed by lateral cephalogram.

| Measurement | Formula | Normal (Caucasian) |
|-------------|---------|-------------------|
| Nasolabial angle | `angleDeg(Cm, Sn_p, Ls_p)` | 90–110° |
| Upper lip to E-plane | `ptLineSigned(Ls_p, Prn_p, Pog_p) × scale` | −4 mm |
| Lower lip to E-plane | `ptLineSigned(Li_p, Prn_p, Pog_p) × scale` | −2 mm |
| Pog' to Sn vertical | `(Pog_p.x − Sn_p.x) × scale` | ≈ 0 mm |

**Class assignment**:
- Lower lip E-plane > +1 mm → Class III tendency
- Lower lip E-plane < −4 mm → Class II tendency
- Otherwise → Class I

---

### 6.4 Lip Competence (`analyseLip`)
**Source**: Arnett & Bergman (1993), Subtelny (1961)  
**Inputs**: profile landmarks

| Measurement | Formula | Normal |
|-------------|---------|--------|
| Upper lip length | `dist(Sn_p, Sto) × scale` | 19–22 mm (F), 20–24 mm (M) |
| Lower lip length | `dist(Sto, Me_p) × scale` | 38–44 mm |
| Interlabial gap | `max(0, (Li_p.y − Ls_p.y) × scale)` | 0–3 mm |
| Nasolabial angle | `angleDeg(Cm, Sn_p, Ls_p)` | 90–110° |
| Mentolabial fold | `angleDeg(Li_p, B_p, Pog_p)` | 120–135° |

**Flag**: `abnormal` if 2+ measurements out of range · `borderline` if 1

---

### 6.5 Smile Arc (`analyseSmile`)
**Source**: Sarver & Ackerman (2001); Hulsey (1970)  
**Inputs**: smile landmarks

| Measurement | Formula |
|-------------|---------|
| Arc | Compare avg upper incisor y to avg mouth corner y |
| Buccal corridor % | `(ChR_s.x − BCR.x) / (ChL_s.x − ChR_s.x) × 100` |

**Arc classification**:
- `diff > threshold` → consonant (ideal)
- `-threshold < diff < threshold` → flat (borderline)
- `diff < -threshold` → reverse (abnormal)
- Threshold = 3mm converted to pixels: `3 / scale`

**Buccal corridor normal**: 10–15% of smile width each side

---

### 6.6 Dental Midline (`analyseMidline`)
**Source**: Peck & Peck (1995)  
**Inputs**: frontal landmarks (for facial midline Gl.x) + smile landmarks (UDM_s)

| Measurement | Formula | Normal |
|-------------|---------|--------|
| Upper dental midline deviation | `|UDM_s.x − Gl.x| × scale` | < 1 mm |

> **IMPORTANT**: LDM (lower dental midline) is NOT computed because the frontal photo dental landmarks were removed. Only UDM_s from the smile photo is used.

---

### 6.7 Overjet & Overbite (`analyseOJ`)
**Source**: Proffit & Fields (2013)  
**Inputs**: smile landmarks: UI_R, UI_L, LI_R, LI_L  
**IMPORTANT**: Photographic estimate only — MUST be confirmed clinically and with radiographs.

| Measurement | Formula | Normal |
|-------------|---------|--------|
| Overjet | `avg(|UI_R.x − LI_R.x|, |UI_L.x − LI_L.x|) × scale` | 2–4 mm |
| Overbite | `avg((LI_R.y − UI_R.y), (LI_L.y − UI_L.y)) × scale` | 2–4 mm |

**Classifications**: normal · increased · severely_increased · reverse · edge_to_edge · open_bite · not_measured

---

## 7. CALIBRATION SYSTEM

**Function**: `calibScale(frontal, ipdMm)` → returns `scale` in mm per pixel

**Primary method** (preferred):
```
scale = ipdMm / (dist(ExR, ExL) × 0.70)
```
The factor 0.70 converts outer canthi distance to inter-pupillary distance (Farkas 1994).  
Typical IPD = 63 mm (population average, configurable on upload screen).

**Fallback method** (if ExR/ExL missing):
```
scale = 35 / dist(AlR, AlL)
```
Alar base width = 35 mm average (Farkas 1994).

If calibration fails (returns null), pixel measurements are shown as-is with an "uncalibrated" warning. All distance calculations include null guards so the app never crashes silently.

---

## 8. FACE DETECTION

**API**: Native browser `FaceDetector` (Shape Detection API) — available in Chrome/Edge only.  
**Function**: `detectAndRefine(imgEl, photoType)` → returns array of landmark objects with `{...def, x, y, confidence}`

### Detection pipeline (frontal/smile only)

1. Check if `window.FaceDetector` exists; if not, return normalised defaults
2. Detect faces; if none or bbox < 8% of image, return defaults
3. Sort eye landmarks left→right; validate both eyes are within bbox
4. Compute `eyeSpan = eL.x − eR.x`; reject if < 20px
5. Compute centre `cx`, eye midpoint `ey`
6. **Nose validation**: accept FaceDetector nose only if below eye level by > 10px and within bbox
7. **Mouth validation** (critical fix): accept FaceDetector mouth only if `mp.y > noseY + 10` AND within bbox. If mouth is at eye level (common bug), fall back to `ey + eyeSpan × 1.18`
8. Compute refined positions using eye span as anthropometric unit
9. Clamp all points inside face bbox

### Profile: detection bypassed
```javascript
if (photoType === 'profile') return lms;
```
FaceDetector fails on 90° side-face views. Clinician corrects defaults manually.

### Confidence scoring
- Detected via FaceDetector and refined: `0.85–0.90`
- Only bbox used: `0.65`
- Default normalised: `0.60`

---

## 9. PATIENT ARCHIVE SYSTEM

**Storage**: `localStorage` key `ortho_archive_v1`  
**Format**: JSON array, newest first

### Record structure
```json
{
  "pid": "P001",
  "ipdMm": 63,
  "savedAt": "2026-06-24T10:30:00.000Z",
  "report": {
    "pid": "P001",
    "ts": "6/24/2026, 10:30:00 AM",
    "scale": 0.043,
    "sym":    { "chinDev": 0.8, "noseDev": 0.3, ..., "flag": "within_normal_limits" },
    "thirds": { "upPct": 32.1, "midPct": 33.5, "lowPct": 34.4, "flag": "within_normal_limits" },
    "skel":   { "cls": "Class I", "nasolabial": 98.5, "upperE": -3.2, "lowerE": -1.8, "pogSn": 0.2 },
    "lip":    { "ulLen": 21.0, "llLen": 40.5, "gap": 1.2, "nasolabial": 98.5, ..., "flag": "within_normal_limits" },
    "smile":  { "arc": "consonant", "bcLeft": 12.1, "bcRight": 11.8, "flag": "within_normal_limits" },
    "mid":    { "udmDev": 0.4, "ldmDev": null, "shift": null, "flag": "within_normal_limits" },
    "oj":     { "oj": 2.8, "ob": 2.1, "ojCls": "normal", "obCls": "normal" },
    "findings": [ { "text": "Facial symmetry: within normal limits.", "level": "normal" }, ... ]
  }
}
```

**Note**: Images and landmark coordinates are NOT stored (too large). Archive stores only numerical results.

### Archive functions
```javascript
loadArchive()              // Returns array from localStorage
saveToArchive(record)      // Upserts by pid (updates if pid exists, prepends if new)
deleteFromArchive(pid)     // Removes record by pid
```

### Archive UI features
- Grid of patient cards with: PID, date, class badge, symmetry badge, smile arc, OJ value
- Search by PID, date, or class
- Click card → view full report
- Delete button with double-click confirmation
- "📁 Archive" button in header navigates from any screen
- "← New Analysis" navigates from archive back to upload

---

## 10. EXPORT FEATURES

### PDF Export
**Method**: `window.print()` — browser native print dialog  
**How**: User clicks "📄 PDF" on the results page → print dialog opens → user selects "Save as PDF"  
**CSS**: `@media print` rules hide `.no-print` elements (header, progress bar, buttons), keep all report content. Branding watermark appears on printed pages via `position:fixed` in print CSS.

### Excel Export (`exportExcel`)
**Library**: SheetJS (`window.XLSX`)  
**File**: `OrthoAnalysis_{pid}_{date}.xlsx`  
**Content**: Single sheet "Analysis" with columns: Measurement, Value, Normal Range  
**Sections**: Patient Info → Symmetry → Facial Thirds → Skeletal Class → Lip Competence → Smile → Midline → Overjet/Overbite → Disclaimer  
**Column widths**: 40 / 22 / 28 characters

---

## 11. LANDMARK EDITOR

**Component**: `LandmarkEditor({ photoType, imageUrl, imgW, imgH, onConfirm, onBack, initialLms })`

### Canvas rendering
- Image drawn at `drawImage(img, ox, oy, dw, dh)` — letterboxed, centred horizontally
- Scale: `sc = min(canvasW/imgW, (canvasW*0.74)/imgH)`
- Landmark dots: filled circle (colour by category) + stroke + label text (with shadow)
- Selected landmark: 1.7× radius, white stroke
- Hovered landmark: 1.4× radius, white glow ring

### Coordinate systems
- Canvas coordinates: `cx = ox + lm.x × sc`, `cy = oy + lm.y × sc`
- Image coordinates: `x = (cx − ox) / sc`, `y = (cy − oy) / sc`

### Interaction
| Action | Result |
|--------|--------|
| Click landmark | Select it |
| Drag landmark | Move it (clamped to image bounds) |
| Delete/Backspace key | Delete selected landmark |
| Escape key | Deselect / cancel add mode |
| Click empty canvas (add mode) | Place selected add-landmark |
| ✚ Add button | Toggle add mode |
| 🗑 Delete button | Delete selected landmark |
| Size slider (33–100%) | Controls `dotSize`; `pointR = max(2, round(5 × dotSize))` |
| Labels checkbox | Show/hide landmark ID text labels |
| Midline checkbox | Show/hide facial midline guide (frontal only) |
| Golden ratio checkbox | Show golden ratio overlay |

### Golden Ratio Overlay
When enabled, draws on canvas:
- **Gold dashed lines**: Horizontal thirds (Gl to Me divided into thirds)
- **Blue dashed lines**: Rule-of-fifths vertical lines (using ExR/ExL, frontal only)
- **Pink line**: Phi (φ = 1.618) golden ratio point on face height

### `drawAllRef` pattern
The draw function is stored in `drawAllRef.current` to avoid stale closure when called from `useEffect` with image `onload`. This is critical — the canvas will be blank if you use a closure over stale state.

### Responsive canvas
`ResizeObserver` watches the canvas wrapper div and updates `canvasW` state, which triggers re-render and re-draw.

### Touch support
Native `touchmove` event listener with `{ passive: false }` to allow `preventDefault()` during drag on mobile. React's synthetic `onTouchMove` cannot call `preventDefault`.

### `initialLms` prop
When navigating back to a previously confirmed photo, `initialLms` is passed (the confirmed landmarks). This bypasses auto-detection and restores the confirmed state. Detecting spinner is hidden. This allows re-editing without losing other photos' confirmed landmarks.

---

## 12. CRITICAL CLINICAL CONSTRAINTS

These must NEVER be removed or altered:

1. **Doctor-in-the-loop gate**: The "Confirm Landmarks →" button is mandatory. `doAnalyse()` must only be called after all 3 landmark sets are confirmed. It is impossible to proceed to analysis without explicit confirmation of each photo.

2. **Mandatory disclaimer** (must appear verbatim on every report and every export):
   > "This analysis is intended to assist clinical assessment and does not replace the judgment of a qualified orthodontist."

3. **Calibration caveat**: All measurements shown must state they are calibrated to real-world mm via IPD proxy. Uncalibrated results must show a warning.

4. **Overjet/Overbite caveat**: Must be labelled "photographic estimate — confirm with clinical measurement and radiographs."

5. **Skeletal class caveat**: Must be labelled "soft-tissue estimate only — confirm with lateral cephalogram."

6. **Decision support, not diagnosis**: The system header and all communications must frame the tool as a DECISION SUPPORT tool, not a diagnostic tool.

7. **E-plane population caveat**: Ricketts E-plane norms (upper lip −4 mm, lower lip −2 mm) are Caucasian population norms (1968). This must be stated in results.

8. **Clinical formula changes**: Any change to a clinical formula or reference norm must be clinically verified first. Do NOT change norms for speed or convenience.

---

## 13. STATE MACHINE

```javascript
const STEPS = [
  { key: 'upload',         label: 'Upload'  },
  { key: 'review-frontal', label: 'Frontal' },
  { key: 'review-profile', label: 'Profile' },
  { key: 'review-smile',   label: 'Smile'   },
  { key: 'results',        label: 'Results' },
];

// Extra non-workflow stages:
'analysing'       — spinner between review-smile and results
'archive'         — patient library page
'archive-detail'  — single patient view from archive
```

### Transitions
| From | Action | To |
|------|--------|----|
| upload | click "Detect Landmarks" | review-frontal |
| review-frontal | confirm | review-profile |
| review-profile | confirm | review-smile |
| review-smile | confirm | analysing → results |
| any | click done step in progress bar | that step (no landmark loss) |
| any | click "📁 Archive" | archive |
| archive | click patient card | archive-detail |
| archive-detail | click "← Archive" | archive |
| archive or results | click "← New Analysis" | upload + reset |

### State variables in App component
```javascript
const [stage, setStage]         // current stage key
const [files, setFiles]         // { frontal, profile, smile } — File objects
const [previews, setPreviews]   // { frontal, profile, smile } — object URLs
const [dims, setDims]           // { frontal, profile, smile } — { w, h } natural px
const [confirmed, setConfirmed] // { frontal?, profile?, smile? } — confirmed landmark arrays
const [report, setReport]       // result of doAnalyse(), plus pid
const [error, setError]         // error string or null
const [pid, setPid]             // patient ID string
const [ipdMm, setIpdMm]        // number, default 63
const [archivePatient, setArchivePatient]  // patient record from archive
```

---

## 14. KNOWN LIMITATIONS & FUTURE WORK

### Current limitations
1. **No image storage in archive**: Photos are not saved with the archive record (localStorage has a ~5–10 MB limit; photos can be several MB each). The archive shows only numerical results.
2. **Calibration accuracy**: Using IPD as calibration proxy assumes a standard distance of 63 mm. For more accurate results, a ruler/known-distance calibration tool should be added.
3. **Profile detection**: FaceDetector does not work on 90° profiles. All profile landmarks default to anatomical ratios and require full manual correction.
4. **Photographic estimates only**: Overjet/overbite are inherently imprecise from photos. Parallax, lens distortion, and patient positioning affect these values.
5. **E-plane population norms**: Ricketts norms (1968) are Caucasian-centric. Norms vary by ethnicity. A population selector should be added in future.
6. **No history of landmark corrections**: The system does not track how much each landmark was moved from AI placement. This intra-rater data would be valuable for thesis analysis.
7. **localStorage only**: Archive is device and browser-specific. No cloud sync. Clearing browser data deletes all patients.
8. **Single tab**: App has no multi-tab handling; opening two tabs with the same app will share localStorage but not React state.

### Suggested future improvements
- Ruler calibration tool (draw a line of known mm on the image)
- Population norm selector (Caucasian / Middle Eastern / Asian / African)
- Landmark correction tracking for research data
- Photo storage using IndexedDB (larger capacity than localStorage)
- PDF generation via jsPDF (no browser print dialog)
- Progress notes field per patient
- Treatment plan recommendation module (requires clinical sign-off)
- Cephalometric analysis from lateral radiograph (separate module)
- Arabic language interface toggle

---

## 15. DEPLOYMENT INSTRUCTIONS

### Netlify (recommended)
1. Go to [netlify.com](https://netlify.com) and log in
2. Drag the `orthodontic-analysis.html` file onto the Netlify deploy area
3. The URL will be something like `https://random-name.netlify.app`
4. To use a custom URL: Site settings → Domain management → Add custom domain

### Local (no internet needed for the app logic)
1. Open `orthodontic-analysis.html` in Chrome or Edge
2. The CDN scripts require internet on first load; after that the browser may cache them
3. For offline use, embed the CDN libraries locally (download and add `<script>` from local files)

### GitHub Pages
1. Create a GitHub repository
2. Upload `orthodontic-analysis.html` and rename it to `index.html`
3. Settings → Pages → Source: main branch

---

## 16. RESUMING OR EDITING THE PROJECT

### For a programmer or AI tool picking this up

**The entire application lives in one file**: `C:\Users\HP\OneDrive\Desktop\MASTER\orthodontic-analysis.html`

**Read the file** — it is ~1600 lines of self-contained code. Key sections in order:
1. `<head>` — CDN `<script>` tags (React, Babel, SheetJS)
2. `<style>` — All CSS (~350 lines)
3. `<script type="text/babel">` — All application logic
   - Constants: `CATS`, `LM_FRONTAL`, `LM_PROFILE`, `LM_SMILE`, `LM_MAP`, `PHOTO_CONFIGS`, `STEPS`
   - Archive functions: `loadArchive`, `saveToArchive`, `deleteFromArchive`
   - Detection: `detectAndRefine`
   - Geometry: `dist`, `angleDeg`, `ptLineSigned`, `g`, `r1`
   - Analysis: `calibScale`, `analyseSymmetry`, `analyseThirds`, `analyseSkeletal`, `analyseLip`, `analyseSmile`, `analyseMidline`, `analyseOJ`, `doAnalyse`
   - Export: `exportExcel`
   - React components: `LandmarkEditor`, `Slot`, `Badge`, `Row`, `RCard`, `ReportView`, `ArchivePage`, `App`
   - Root render: `ReactDOM.createRoot(...).render(<App/>)`

**Editing approach**: 
- Make targeted edits (use find/replace or Edit tool)
- Test in Chrome/Edge (FaceDetector only works there)
- Do NOT introduce npm/build steps — keep it single-file
- Do NOT add backend — keep it fully client-side
- Consult sections 12 (Clinical Constraints) before changing any analysis formula

### Common tasks
| Task | Where |
|------|-------|
| Add a new landmark to a photo | Add to `LM_FRONTAL` / `LM_PROFILE` / `LM_SMILE` array |
| Change a clinical threshold | Find the relevant `analyse*` function |
| Change default normalised positions | Edit `nx`, `ny` in landmark arrays |
| Add a new analysis | Write new `analyse*` function, add result to `doAnalyse()`, add card in `ReportView` |
| Change UI colours | Edit CSS `:root` variables |
| Add a new archive field | Add to record in `handleConfirm`, display in `ArchivePage` |
| Change branding | Edit `.branding` div at bottom of `App` component |

### Branding (must keep)
```html
<div className="branding">
  MADE WITH <span className="heart">♥</span> BY DOCTOR.MOHAMMAD SAMIH
</div>
```
This appears fixed bottom-right on all screens, and on printed/PDF pages via `@media print` CSS.

---

## APPENDIX — CLINICAL REFERENCES

| Reference | Used For |
|-----------|---------|
| Arnett & Bergman (1993) | Facial symmetry thresholds, lip length norms |
| Farkas LG (1994) | Facial thirds, alar base width, IPD calibration factor 0.70 |
| Ricketts RM (1968) | E-plane (esthetic line) norms |
| Proffit & Fields (2013) | Overjet/overbite classification |
| Sarver & Ackerman (2001) | Smile arc classification |
| Hulsey CM (1970) | Buccal corridor norms |
| Peck & Peck (1995) | Dental midline deviation threshold |
| Subtelny JD (1961) | Lip length reference ranges |

---

*This document was generated as part of a Master's thesis project on AI-assisted orthodontic photo analysis.*  
*Tool: OrthoAnalyse v2.0 | Author: Doctor Mohammad Samih | © 2026*
