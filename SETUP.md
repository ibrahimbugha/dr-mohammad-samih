# Orthodontic Photo Analysis System — Setup Guide
## Phase 1: Foundation (dummy landmarks, full analysis engine)

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | ≥ 3.10 | python.org |
| Node.js | ≥ 18 | nodejs.org |
| npm  | ≥ 9    | included with Node |

---

## 1. Backend (FastAPI)

```bash
cd orthodontic-app/backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the API server
uvicorn main:app --reload --port 8000
```

The API will be available at:
- http://localhost:8000          → welcome
- http://localhost:8000/health   → liveness check
- http://localhost:8000/docs     → Swagger UI (interactive docs)

---

## 2. Frontend (React + Vite)

```bash
cd orthodontic-app/frontend

# Install npm packages
npm install

# Start the dev server
npm run dev
```

The app will open at **http://localhost:5173**

All `/api/*` requests are proxied to the backend automatically via `vite.config.js`.

---

## 3. Workflow (Phase 1)

1. Open http://localhost:5173
2. Enter a Patient ID
3. Upload the three standardised photos (frontal, profile, smile)
4. Click **Run AI Landmark Detection**
   - Phase 1: returns hardcoded dummy landmarks positioned on a typical face
5. Review each photo in sequence — drag any landmark dot to correct its position
6. Click **Confirm Landmarks →** on each photo
7. The analysis engine runs after all three are confirmed
8. View the structured report with measurements and flags

---

## 4. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET  | /health | Liveness check |
| POST | /api/upload/{photo_type} | Upload photo, get landmark predictions |
| POST | /api/analyse | Run 8 clinical analyses on confirmed landmarks |

`photo_type` = `frontal` | `profile` | `smile`

---

## 5. Project Structure

```
orthodontic-app/
├── backend/
│   ├── main.py                  ← FastAPI entry point + CORS
│   ├── requirements.txt
│   ├── routers/
│   │   ├── landmarks.py         ← /upload, dummy landmark detection
│   │   └── analysis.py          ← /analyse, all 8 analysis algorithms
│   ├── models/
│   │   └── schemas.py           ← Pydantic request/response models
│   └── uploads/                 ← Uploaded photos saved here
│
└── frontend/
    ├── package.json
    ├── vite.config.js            ← Dev proxy → backend
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.jsx               ← State machine (upload → review × 3 → results)
        ├── index.css             ← Tailwind + component classes
        ├── api/
        │   └── client.js         ← Axios wrapper
        ├── constants/
        │   └── landmarks.js      ← All 39 landmark definitions + photo guidelines
        └── components/
            ├── PhotoUpload.jsx   ← 3-slot drag-and-drop + clinical guidelines
            ├── LandmarkEditor.jsx← Konva canvas: draggable landmark dots
            └── AnalysisResults.jsx← Full report dashboard
```

---

## 6. Next Steps (Phase 2 — AI Model)

1. Download 300W dataset from https://ibug.doc.ic.ac.uk/resources/300-W/
2. Map 300W's 68 landmarks to the 39 orthodontic landmark set
3. Fine-tune HRNet-W32 (pretrained on ImageNet):
   - Replace `_detect_dummy_landmarks()` in `backend/routers/landmarks.py`
   - with `_detect_hrnet_landmarks(image_array, photo_type)`
4. Evaluate on 300W test set: MRE and SDR metrics
5. Integrate MediaPipe face detection as pre-processing step

---

## 7. Calibration Note

All measurements are in **pixels** until a calibration scale is established.

The `/api/analyse` endpoint accepts `ipd_mm` (inter-pupillary distance in mm).  
Default is **63 mm** (population mean, Farkas 1994).

For clinical accuracy: ask the doctor to measure the patient's IPD with a pupillometer
and enter it in the UI before running analysis.

---

## 8. Clinical Disclaimer

This system is an AI decision support tool for research purposes (Master's thesis).
It does not replace the clinical judgment of a qualified orthodontist.
All measurements must be verified clinically before any treatment planning.
