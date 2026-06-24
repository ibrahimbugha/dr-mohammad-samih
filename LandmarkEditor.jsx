/**
 * LandmarkEditor.jsx
 *
 * Konva.js canvas editor. Renders the uploaded photo as background, overlays
 * colour-coded draggable landmark points, and lets the clinician correct any
 * AI prediction by dragging.
 *
 * Props:
 *   photoType    - 'frontal' | 'profile' | 'smile'
 *   imageUrl     - URL of the uploaded photo (served from /uploads/...)
 *   detectedLms  - LandmarkDetectionResponse from the API
 *   onConfirm    - callback(confirmedLandmarks: LandmarkPoint[])
 *   onBack       - callback() go back to previous photo
 *
 * Landmark colour code:
 *   skeletal    → blue
 *   dental      → yellow
 *   soft_tissue → green
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Circle, Text, Line, Group } from 'react-konva'
import useImage from 'use-image'
import { CATEGORY_COLORS, LANDMARKS_BY_PHOTO, PHOTO_TYPES } from '../constants/landmarks'

const POINT_RADIUS   = 6
const HOVER_RADIUS   = 8
const LABEL_OFFSET_X = 10
const LABEL_OFFSET_Y = -4

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex gap-4 flex-wrap">
      {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
        <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-700">
          <span
            className="inline-block w-3 h-3 rounded-full border"
            style={{ backgroundColor: col.fill, borderColor: col.stroke }}
          />
          {col.label}
        </div>
      ))}
    </div>
  )
}

// ── Point list sidebar ────────────────────────────────────────────────────────
function PointList({ landmarks, selectedId, onSelect }) {
  const byCategory = {}
  for (const lm of landmarks) {
    if (!byCategory[lm.category]) byCategory[lm.category] = []
    byCategory[lm.category].push(lm)
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
      {Object.entries(byCategory).map(([cat, lms]) => {
        const col = CATEGORY_COLORS[cat] || CATEGORY_COLORS.soft_tissue
        return (
          <div key={cat}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
              {col.label}
            </p>
            <div className="space-y-0.5">
              {lms.map((lm) => (
                <button
                  key={lm.id}
                  onClick={() => onSelect(lm.id)}
                  className={`
                    w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2
                    transition-colors
                    ${selectedId === lm.id
                      ? 'bg-blue-100 text-blue-900 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: col.fill }}
                  />
                  <span className="font-mono mr-1 text-gray-400">{lm.id}</span>
                  {lm.name}
                  {lm.confidence != null && (
                    <span className="ml-auto text-gray-400">
                      {Math.round(lm.confidence * 100)}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}


// ── Main editor ───────────────────────────────────────────────────────────────
export default function LandmarkEditor({
  photoType,
  imageUrl,
  detectedLms,
  onConfirm,
  onBack,
}) {
  const photoLabel = PHOTO_TYPES.find((p) => p.id === photoType)?.label || photoType

  // Landmark state — initialised from API response
  const [landmarks, setLandmarks] = useState(() =>
    detectedLms.landmarks.map((lm) => ({ ...lm }))
  )
  const [selectedId,   setSelectedId]   = useState(null)
  const [showLabels,   setShowLabels]   = useState(true)
  const [showMidline,  setShowMidline]  = useState(photoType === 'frontal')
  const [hoveredId,    setHoveredId]    = useState(null)

  // Canvas sizing
  const containerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ w: 700, h: 520 })

  // Load image
  const [img] = useImage(imageUrl, 'anonymous')

  // Compute scale to fit image in canvas
  const imgW = detectedLms.image_width  || 1024
  const imgH = detectedLms.image_height || 768
  const scale = Math.min(canvasSize.w / imgW, canvasSize.h / imgH)
  const drawW = imgW * scale
  const drawH = imgH * scale
  const offsetX = (canvasSize.w - drawW) / 2
  const offsetY = (canvasSize.h - drawH) / 2

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      setCanvasSize({ w: Math.max(400, width), h: Math.round(width * 0.72) })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Convert image coords → canvas coords
  const toCanvas = (lm) => ({
    cx: offsetX + lm.x * scale,
    cy: offsetY + lm.y * scale,
  })

  // Convert canvas coords → image coords (for drag end)
  const toImage = (canvasX, canvasY) => ({
    x: (canvasX - offsetX) / scale,
    y: (canvasY - offsetY) / scale,
  })

  const handleDragEnd = useCallback((id, e) => {
    const { x: imgX, y: imgY } = toImage(e.target.x(), e.target.y())
    setLandmarks((prev) =>
      prev.map((lm) => lm.id === id ? { ...lm, x: imgX, y: imgY } : lm)
    )
  }, [scale, offsetX, offsetY])

  // Facial midline: Gl → Sn → Me (frontal only)
  const midlinePoints = (() => {
    if (!showMidline || photoType !== 'frontal') return null
    const ids = ['Gl', 'N', 'Sn', 'Me']
    const pts = []
    for (const id of ids) {
      const lm = landmarks.find((l) => l.id === id)
      if (lm) { const c = toCanvas(lm); pts.push(c.cx, c.cy) }
    }
    return pts.length >= 4 ? pts : null
  })()

  const handleConfirm = () => {
    onConfirm(landmarks)
  }

  const resetLandmark = (id) => {
    const orig = detectedLms.landmarks.find((l) => l.id === id)
    if (orig) {
      setLandmarks((prev) => prev.map((lm) => lm.id === id ? { ...lm, x: orig.x, y: orig.y } : lm))
    }
  }

  const movedCount = landmarks.filter((lm) => {
    const orig = detectedLms.landmarks.find((l) => l.id === lm.id)
    return orig && (Math.abs(lm.x - orig.x) > 1 || Math.abs(lm.y - orig.y) > 1)
  }).length

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Confirm Landmarks — {photoLabel}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Drag any point to correct it. Labels indicate AI confidence.
            {movedCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                {movedCount} point{movedCount > 1 ? 's' : ''} adjusted
              </span>
            )}
          </p>
        </div>
        <button onClick={onBack} className="btn-secondary text-sm">
          ← Back to Upload
        </button>
      </div>

      {/* Toolbar */}
      <div className="card flex flex-wrap items-center gap-4 py-3">
        <Legend />
        <div className="flex gap-3 ml-auto">
          <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="accent-blue-600"
            />
            Show labels
          </label>
          {photoType === 'frontal' && (
            <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showMidline}
                onChange={(e) => setShowMidline(e.target.checked)}
                className="accent-blue-600"
              />
              Show midline
            </label>
          )}
        </div>
      </div>

      {/* Canvas + sidebar */}
      <div className="flex gap-4">
        {/* Canvas */}
        <div ref={containerRef} className="flex-1 card p-0 overflow-hidden">
          <Stage width={canvasSize.w} height={canvasSize.h}>
            <Layer>
              {/* Background photo */}
              {img && (
                <KonvaImage
                  image={img}
                  x={offsetX}
                  y={offsetY}
                  width={drawW}
                  height={drawH}
                />
              )}

              {/* Facial midline (frontal only) */}
              {midlinePoints && (
                <Line
                  points={midlinePoints}
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={1.5}
                  dash={[6, 4]}
                />
              )}

              {/* Landmark points */}
              {landmarks.map((lm) => {
                const { cx, cy } = toCanvas(lm)
                const col = CATEGORY_COLORS[lm.category] || CATEGORY_COLORS.soft_tissue
                const isSelected = lm.id === selectedId
                const isHovered  = lm.id === hoveredId
                const r = isHovered || isSelected ? HOVER_RADIUS : POINT_RADIUS

                return (
                  <Group key={lm.id}>
                    <Circle
                      x={cx}
                      y={cy}
                      radius={r}
                      fill={col.fill}
                      stroke={isSelected ? '#fff' : col.stroke}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      opacity={0.92}
                      draggable
                      onDragEnd={(e) => handleDragEnd(lm.id, e)}
                      onClick={() => setSelectedId(lm.id === selectedId ? null : lm.id)}
                      onMouseEnter={() => setHoveredId(lm.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      // Konva drag must work on canvas coords — translate here
                      dragBoundFunc={(pos) => {
                        // Clamp within image bounds
                        return {
                          x: Math.max(offsetX, Math.min(offsetX + drawW, pos.x)),
                          y: Math.max(offsetY, Math.min(offsetY + drawH, pos.y)),
                        }
                      }}
                    />
                    {showLabels && (
                      <Text
                        x={cx + LABEL_OFFSET_X}
                        y={cy + LABEL_OFFSET_Y}
                        text={lm.id}
                        fontSize={10}
                        fill="#fff"
                        shadowColor="#000"
                        shadowBlur={3}
                        shadowOffsetX={1}
                        shadowOffsetY={1}
                        listening={false}
                      />
                    )}
                  </Group>
                )
              })}
            </Layer>
          </Stage>
        </div>

        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 card flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Landmark List
            </p>
            <PointList
              landmarks={landmarks}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          {/* Selected point details */}
          {selectedId && (() => {
            const lm = landmarks.find((l) => l.id === selectedId)
            const orig = detectedLms.landmarks.find((l) => l.id === selectedId)
            const moved = orig && (Math.abs(lm.x - orig.x) > 1 || Math.abs(lm.y - orig.y) > 1)
            return lm ? (
              <div className="rounded-lg border border-gray-200 p-3 text-xs space-y-1">
                <p className="font-semibold text-gray-800">{lm.name}</p>
                <p className="text-gray-500">x: {lm.x.toFixed(1)}  y: {lm.y.toFixed(1)}</p>
                {lm.confidence != null && (
                  <p className="text-gray-500">
                    Confidence: {Math.round(lm.confidence * 100)}%
                  </p>
                )}
                {moved && (
                  <button
                    onClick={() => resetLandmark(selectedId)}
                    className="mt-1 text-blue-600 hover:underline"
                  >
                    Reset to AI position
                  </button>
                )}
              </div>
            ) : null
          })()}
        </div>
      </div>

      {/* Confirm strip */}
      <div className="card bg-green-50 border-green-200 flex items-center justify-between">
        <div>
          <p className="font-semibold text-green-900 text-sm">
            ✅ Ready to confirm {landmarks.length} landmark{landmarks.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            Review all points above. Drag any point to correct it before confirming.
            Analysis will only run on <strong>confirmed</strong> landmarks.
          </p>
        </div>
        <button
          onClick={handleConfirm}
          className="btn-primary ml-4 flex-shrink-0"
        >
          Confirm Landmarks →
        </button>
      </div>
    </div>
  )
}
