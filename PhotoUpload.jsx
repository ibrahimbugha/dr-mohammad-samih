/**
 * PhotoUpload.jsx
 *
 * Three-slot upload panel for the standardised extraoral photos.
 * Each slot shows:
 *   - Drag-and-drop zone
 *   - Clinical photography guidelines
 *   - Thumbnail preview once a file is selected
 *   - Remove button
 *
 * On "Run AI Detection" all three slots must be filled.
 */

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { PHOTO_TYPES } from '../constants/landmarks'
import { uploadPhoto } from '../api/client'

const MAX_SIZE_MB = 15

// ── Single drop slot ──────────────────────────────────────────────────────────
function PhotoSlot({ photoConfig, file, preview, onFile, onRemove, isUploading }) {
  const { id, label, description, guidelines } = photoConfig
  const [guidelinesOpen, setGuidelinesOpen] = useState(false)

  const onDrop = useCallback(
    (accepted) => { if (accepted.length) onFile(accepted[0]) },
    [onFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    multiple: false,
    disabled: !!file || isUploading,
  })

  return (
    <div className="card flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{label}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <button
          onClick={() => setGuidelinesOpen((v) => !v)}
          className="text-xs text-blue-600 hover:underline flex-shrink-0"
        >
          {guidelinesOpen ? 'Hide guidelines' : 'Photo guidelines'}
        </button>
      </div>

      {/* Guidelines panel */}
      {guidelinesOpen && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs font-semibold text-blue-800 mb-1">
            ⚠️ Photo quality directly affects analysis accuracy
          </p>
          <ul className="space-y-0.5">
            {guidelines.map((g, i) => (
              <li key={i} className="text-xs text-blue-900 flex gap-1.5">
                <span className="text-blue-400 mt-0.5">•</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Drop zone / preview */}
      {file ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <img
            src={preview}
            alt={`${label} preview`}
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={onRemove}
              className="btn-danger text-sm"
            >
              Remove photo
            </button>
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-green-600 text-white text-xs text-center py-0.5">
            ✓ {file.name} ({(file.size / 1024).toFixed(0)} KB)
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            flex flex-col items-center justify-center h-48 rounded-lg border-2 border-dashed
            cursor-pointer transition-colors select-none
            ${isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="text-4xl mb-2">📷</div>
          <p className="text-sm font-medium text-gray-700">
            {isDragActive ? 'Drop photo here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-gray-400 mt-1">JPEG · PNG · WebP · max {MAX_SIZE_MB} MB</p>
        </div>
      )}
    </div>
  )
}


// ── Main component ────────────────────────────────────────────────────────────
export default function PhotoUpload({ onDetectionComplete }) {
  const [files, setFiles]       = useState({ frontal: null, profile: null, smile: null })
  const [previews, setPreviews] = useState({ frontal: null, profile: null, smile: null })
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState([])
  const [patientId, setPatientId] = useState(`P${Date.now().toString().slice(-6)}`)

  const handleFile = (photoType) => (file) => {
    setFiles((f)    => ({ ...f, [photoType]: file }))
    setPreviews((p) => ({ ...p, [photoType]: URL.createObjectURL(file) }))
  }

  const handleRemove = (photoType) => () => {
    if (previews[photoType]) URL.revokeObjectURL(previews[photoType])
    setFiles((f)    => ({ ...f, [photoType]: null }))
    setPreviews((p) => ({ ...p, [photoType]: null }))
  }

  const allUploaded = PHOTO_TYPES.every((pt) => files[pt.id])

  const handleRunDetection = async () => {
    setErrors([])
    setLoading(true)
    try {
      const results = {}
      for (const pt of PHOTO_TYPES) {
        results[pt.id] = await uploadPhoto(files[pt.id], pt.id)
      }
      onDetectionComplete({
        patientId,
        detections: results,       // { frontal: LandmarkDetectionResponse, … }
        previews,
      })
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Upload failed'
      setErrors([`Upload error: ${msg}`])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Orthodontic Photo Analysis
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Upload three standardised extraoral photographs. The AI will suggest
          anatomical landmark positions for you to confirm before analysis runs.
        </p>
      </div>

      {/* Patient ID */}
      <div className="card flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 flex-shrink-0">
          Patient ID
        </label>
        <input
          type="text"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. P001"
        />
        <p className="text-xs text-gray-400">
          Used for record-keeping only — no personal data is stored.
        </p>
      </div>

      {/* Three upload slots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PHOTO_TYPES.map((pt) => (
          <PhotoSlot
            key={pt.id}
            photoConfig={pt}
            file={files[pt.id]}
            preview={previews[pt.id]}
            onFile={handleFile(pt.id)}
            onRemove={handleRemove(pt.id)}
            isUploading={loading}
          />
        ))}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-red-800">{e}</p>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900">
        <strong>Clinical Notice:</strong> This system is a decision support tool. All
        AI-suggested landmarks must be confirmed by a qualified orthodontist before
        any analysis is accepted. The results do not constitute a diagnosis.
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <button
          onClick={handleRunDetection}
          disabled={!allUploaded || loading}
          className="btn-primary flex items-center gap-2 text-base px-6 py-2.5"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent
                               rounded-full animate-spin" />
              Uploading & detecting landmarks…
            </>
          ) : (
            <>
              🔍 Run AI Landmark Detection
            </>
          )}
        </button>
      </div>

      {!allUploaded && (
        <p className="text-xs text-gray-400 text-right">
          All three photos must be uploaded before detection can run.
        </p>
      )}
    </div>
  )
}
