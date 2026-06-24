/**
 * App.jsx — Main application shell.
 *
 * State machine (no router needed for Phase 1):
 *
 *   'upload'
 *     ↓ (photos uploaded, AI returns dummy landmarks)
 *   'review-frontal'
 *     ↓ (doctor confirms frontal landmarks)
 *   'review-profile'
 *     ↓ (doctor confirms profile landmarks)
 *   'review-smile'
 *     ↓ (doctor confirms smile landmarks)
 *   'analysing'  (POST /api/analyse)
 *     ↓
 *   'results'
 *
 * The doctor-in-the-loop constraint is enforced here:
 * runAnalysis() is only called after all three landmark sets are confirmed.
 */

import React, { useState } from 'react'
import PhotoUpload      from './components/PhotoUpload'
import LandmarkEditor   from './components/LandmarkEditor'
import AnalysisResults  from './components/AnalysisResults'
import { runAnalysis }  from './api/client'

const REVIEW_STEPS = ['review-frontal', 'review-profile', 'review-smile']
const PHOTO_KEYS   = ['frontal', 'profile', 'smile']

export default function App() {
  const [stage,        setStage]        = useState('upload')
  const [sessionData,  setSessionData]  = useState(null)   // { patientId, detections, previews }
  const [confirmed,    setConfirmed]    = useState({})      // { frontal: [...], profile: [...], smile: [...] }
  const [report,       setReport]       = useState(null)
  const [error,        setError]        = useState(null)
  const [ipdMm,        setIpdMm]        = useState(63)      // calibration — user can change in future

  // ── Step 1: photos uploaded, AI detection done ──────────────────────────────
  const handleDetectionComplete = (data) => {
    setSessionData(data)
    setConfirmed({})
    setStage('review-frontal')
  }

  // ── Steps 2–4: doctor confirms one photo at a time ──────────────────────────
  const currentReviewIndex = REVIEW_STEPS.indexOf(stage)
  const currentPhotoKey    = currentReviewIndex >= 0 ? PHOTO_KEYS[currentReviewIndex] : null

  const handleConfirmLandmarks = async (confirmedLandmarks) => {
    const key = currentPhotoKey
    const nextConfirmed = { ...confirmed, [key]: confirmedLandmarks }
    setConfirmed(nextConfirmed)

    if (currentReviewIndex < REVIEW_STEPS.length - 1) {
      // Move to next photo review
      setStage(REVIEW_STEPS[currentReviewIndex + 1])
    } else {
      // All three confirmed → run analysis
      setStage('analysing')
      setError(null)
      try {
        const payload = {
          patient_id: sessionData.patientId,
          frontal:    nextConfirmed.frontal,
          profile:    nextConfirmed.profile,
          smile:      nextConfirmed.smile,
          ipd_mm:     ipdMm,
        }
        const result = await runAnalysis(payload)
        setReport(result)
        setStage('results')
      } catch (err) {
        const msg = err.response?.data?.detail || err.message || 'Analysis failed'
        setError(msg)
        setStage('review-smile')  // step back
      }
    }
  }

  const handleBack = () => {
    if (stage === 'review-frontal') {
      setStage('upload')
    } else {
      const idx = REVIEW_STEPS.indexOf(stage)
      if (idx > 0) setStage(REVIEW_STEPS[idx - 1])
    }
  }

  const handleReset = () => {
    setStage('upload')
    setSessionData(null)
    setConfirmed({})
    setReport(null)
    setError(null)
  }

  // ── Progress indicator ──────────────────────────────────────────────────────
  const steps = [
    { key: 'upload',           label: 'Upload Photos' },
    { key: 'review-frontal',   label: 'Frontal Landmarks' },
    { key: 'review-profile',   label: 'Profile Landmarks' },
    { key: 'review-smile',     label: 'Smile Landmarks' },
    { key: 'results',          label: 'Results' },
  ]
  const activeIndex = steps.findIndex((s) => s.key === stage || (stage === 'analysing' && s.key === 'results'))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-xl font-bold">⬡</span>
          <span className="font-semibold text-gray-900 text-sm">OrthoAnalyse</span>
          <span className="text-xs text-gray-400 ml-1">Master's Thesis Demo · Phase 1</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          AI Decision Support — Not for standalone diagnosis
        </div>
      </header>

      {/* Progress bar */}
      {stage !== 'upload' && (
        <div className="bg-white border-b border-gray-100 px-6 py-2">
          <ol className="flex items-center gap-0">
            {steps.map((s, i) => {
              const done    = i < activeIndex
              const active  = i === activeIndex
              const pending = i > activeIndex
              return (
                <React.Fragment key={s.key}>
                  <li className={`flex items-center gap-1.5 text-xs font-medium ${
                    active  ? 'text-blue-700' :
                    done    ? 'text-green-600' :
                              'text-gray-400'
                  }`}>
                    <span className={`
                      w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${active  ? 'bg-blue-600 text-white' :
                        done    ? 'bg-green-500 text-white' :
                                  'bg-gray-200 text-gray-500'}
                    `}>
                      {done ? '✓' : i + 1}
                    </span>
                    {s.label}
                  </li>
                  {i < steps.length - 1 && (
                    <span className="mx-2 text-gray-300">→</span>
                  )}
                </React.Fragment>
              )
            })}
          </ol>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="max-w-4xl mx-auto mt-4 mx-4">
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex justify-between">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main>
        {stage === 'upload' && (
          <PhotoUpload onDetectionComplete={handleDetectionComplete} />
        )}

        {stage === 'analysing' && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 font-medium">Running clinical analysis…</p>
            <p className="text-sm text-gray-400">Computing 8 analyses from confirmed landmarks</p>
          </div>
        )}

        {REVIEW_STEPS.includes(stage) && sessionData && (() => {
          const photoKey   = PHOTO_KEYS[REVIEW_STEPS.indexOf(stage)]
          const detection  = sessionData.detections[photoKey]
          const imageUrl   = sessionData.previews[photoKey]
          return (
            <LandmarkEditor
              key={stage}
              photoType={photoKey}
              imageUrl={imageUrl}
              detectedLms={detection}
              onConfirm={handleConfirmLandmarks}
              onBack={handleBack}
            />
          )
        })()}

        {stage === 'results' && report && (
          <AnalysisResults report={report} onReset={handleReset} />
        )}
      </main>
    </div>
  )
}
