/**
 * AnalysisResults.jsx
 *
 * Displays the full clinical analysis report returned by /api/analyse.
 * Sections:
 *   1. Key Findings banner
 *   2. Measurement cards for each of the 7 analyses
 *   3. Disclaimer footer
 */

import React, { useState } from 'react'

// ── Badge helper ──────────────────────────────────────────────────────────────
function FlagBadge({ flag }) {
  const map = {
    within_normal_limits: 'badge-normal',
    borderline:           'badge-borderline',
    abnormal:             'badge-abnormal',
    missing_data:         'badge-missing',
  }
  const labels = {
    within_normal_limits: 'Normal',
    borderline:           'Borderline',
    abnormal:             'Abnormal',
    missing_data:         'No data',
  }
  return (
    <span className={map[flag] || 'badge-missing'}>
      {labels[flag] || flag}
    </span>
  )
}

// ── Generic measurement row ───────────────────────────────────────────────────
function MeasRow({ label, value, norm, unit = 'mm' }) {
  if (value == null) return null
  return (
    <tr className="border-t border-gray-100">
      <td className="py-1.5 pr-4 text-sm text-gray-700 w-60">{label}</td>
      <td className="py-1.5 pr-4 text-sm font-mono font-medium">
        {typeof value === 'number' ? value.toFixed(1) : value}
        {typeof value === 'number' && ` ${unit}`}
      </td>
      <td className="py-1.5 text-xs text-gray-400">{norm}</td>
    </tr>
  )
}

// ── Individual analysis cards ─────────────────────────────────────────────────

function SymmetryCard({ data }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Facial Symmetry</h3>
        <FlagBadge flag={data.overall_flag} />
      </div>
      <table className="w-full">
        <tbody>
          <MeasRow label="Chin (Me') deviation from midline" value={data.midline_deviation_chin_mm} norm="< 2 mm" />
          <MeasRow label="Nasal tip deviation from midline"  value={data.midline_deviation_nose_mm} norm="< 2 mm" />
          <MeasRow label="Alar base asymmetry"               value={data.alar_base_asymmetry_mm}   norm="< 2 mm" />
          <MeasRow label="Mouth corner asymmetry"            value={data.mouth_corner_asymmetry_mm} norm="< 2 mm" />
          <MeasRow label="Canthus asymmetry"                 value={data.canthus_asymmetry_mm}     norm="< 2 mm" />
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2">
        Source: Arnett &amp; Bergman (1993) · Flag threshold: {'>'} 2 mm
      </p>
    </div>
  )
}

function ThirdsCard({ data }) {
  const thirds = [
    { label: 'Upper third (inferred)',  pct: data.upper_pct  },
    { label: 'Middle third (Gl → Sn)', pct: data.middle_pct },
    { label: 'Lower third (Sn → Me\')',pct: data.lower_pct  },
  ]
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Facial Thirds</h3>
        <FlagBadge flag={data.flag} />
      </div>
      <div className="space-y-2">
        {thirds.map(({ label, pct }) => pct != null && (
          <div key={label}>
            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
              <span>{label}</span>
              <span className="font-mono font-medium">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${Math.abs(pct - 33.3) > 5 ? 'bg-red-400' : Math.abs(pct - 33.3) > 3 ? 'bg-yellow-400' : 'bg-green-400'}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {data.note && <p className="text-xs text-gray-400 mt-2">{data.note}</p>}
      <p className="text-xs text-gray-400 mt-1">
        Ideal: 33.3% each · Source: Farkas (1994)
      </p>
    </div>
  )
}

function SkeletalCard({ data }) {
  const classColor = {
    'Class I':             'text-green-700 bg-green-100',
    'Class II tendency':   'text-amber-700 bg-amber-100',
    'Class III tendency':  'text-red-700 bg-red-100',
  }
  const cls = data.estimated_class || 'Unknown'
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Skeletal Class Estimate</h3>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${classColor[cls] || 'bg-gray-100 text-gray-700'}`}>
          {cls}
        </span>
      </div>
      <table className="w-full">
        <tbody>
          <MeasRow label="Nasolabial angle (Cm–Sn–Ls)"    value={data.nasolabial_angle_deg}      norm="90–110°" unit="°" />
          <MeasRow label="Upper lip to E-plane (Ricketts)" value={data.upper_lip_to_eplane_mm}    norm="−4 mm (Caucasian)" />
          <MeasRow label="Lower lip to E-plane (Ricketts)" value={data.lower_lip_to_eplane_mm}    norm="−2 mm (Caucasian)" />
          <MeasRow label="Pog' to Sn vertical"             value={data.pog_to_sn_vertical_mm}     norm="≈ 0 mm (Class I)" />
        </tbody>
      </table>
      <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded p-2">
        ⚠ {data.confidence_note}
      </p>
    </div>
  )
}

function LipCard({ data }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Lip Competence &amp; Soft Tissue Profile</h3>
        <FlagBadge flag={data.flag} />
      </div>
      <table className="w-full">
        <tbody>
          <MeasRow label="Upper lip length (Sn → Sto)"      value={data.upper_lip_length_mm}     norm="19–22 mm (F) · 20–24 mm (M)" />
          <MeasRow label="Lower lip length (Sto → Me')"     value={data.lower_lip_length_mm}     norm="38–44 mm" />
          <MeasRow label="Interlabial gap (at rest)"        value={data.interlabial_gap_mm}      norm="0–3 mm" />
          <MeasRow label="Nasolabial angle (Cm–Sn–Ls)"     value={data.nasolabial_angle_deg}    norm="90–110°" unit="°" />
          <MeasRow label="Mentolabial fold angle"           value={data.mentolabial_fold_deg}    norm="120–135°" unit="°" />
          <MeasRow label="Upper lip to E-plane"             value={data.upper_lip_to_eplane_mm}  norm="−4 mm (Caucasian)" />
          <MeasRow label="Lower lip to E-plane"             value={data.lower_lip_to_eplane_mm}  norm="−2 mm (Caucasian)" />
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2">{data.ethnicity_note}</p>
      <p className="text-xs text-gray-400">Source: Arnett &amp; Bergman (1993); Subtelny (1961)</p>
    </div>
  )
}

function SmileCard({ data }) {
  const arcColor = { consonant: 'text-green-700', flat: 'text-amber-700', reverse: 'text-red-700' }
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Smile Arc &amp; Buccal Corridor</h3>
        <FlagBadge flag={data.flag} />
      </div>
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">Smile arc</p>
        <p className={`font-semibold capitalize ${arcColor[data.arc_classification] || ''}`}>
          {data.arc_classification}
        </p>
        <p className="text-xs text-gray-400">Consonant (matching lower lip) = aesthetic ideal · Sarver &amp; Ackerman (2001)</p>
      </div>
      <table className="w-full">
        <tbody>
          <MeasRow label="Buccal corridor — left"  value={data.buccal_corridor_left_pct}  norm="10–15%" unit="%" />
          <MeasRow label="Buccal corridor — right" value={data.buccal_corridor_right_pct} norm="10–15%" unit="%" />
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2">Source: Hulsey (1970)</p>
    </div>
  )
}

function MidlineCard({ data }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Dental Midline</h3>
        <FlagBadge flag={data.flag} />
      </div>
      <table className="w-full">
        <tbody>
          <MeasRow label="Upper dental midline (UDM) deviation"  value={data.udm_deviation_from_facial_mm} norm="< 1 mm" />
          <MeasRow label="Lower dental midline (LDM) deviation"  value={data.ldm_deviation_from_facial_mm} norm="< 2 mm" />
          <MeasRow label="UDM–LDM shift"                         value={data.udm_ldm_shift_mm}             norm="< 1 mm" />
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2">
        Deviation from facial midline. Source: Peck &amp; Peck (1995)
      </p>
    </div>
  )
}

function OverjetCard({ data }) {
  const classTag = (cls) => {
    const map = {
      normal:           'badge-normal',
      increased:        'badge-borderline',
      severely_increased:'badge-abnormal',
      reduced:          'badge-borderline',
      edge_to_edge:     'badge-borderline',
      open_bite:        'badge-abnormal',
      reverse:          'badge-abnormal',
      not_measured:     'badge-missing',
    }
    return <span className={map[cls] || 'badge-missing'}>{cls.replace(/_/g, ' ')}</span>
  }
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Overjet &amp; Overbite Estimate</h3>
        <span className="badge-missing text-xs">Photographic estimate</span>
      </div>
      <table className="w-full">
        <tbody>
          <tr className="border-t border-gray-100">
            <td className="py-1.5 pr-4 text-sm text-gray-700 w-60">Overjet</td>
            <td className="py-1.5 pr-4 text-sm font-mono">{data.overjet_estimate_mm != null ? `${data.overjet_estimate_mm.toFixed(1)} mm` : '—'}</td>
            <td className="py-1.5">{classTag(data.overjet_class)}</td>
            <td className="py-1.5 text-xs text-gray-400 pl-2">Norm: 2–4 mm</td>
          </tr>
          <tr className="border-t border-gray-100">
            <td className="py-1.5 pr-4 text-sm text-gray-700">Overbite</td>
            <td className="py-1.5 pr-4 text-sm font-mono">{data.overbite_estimate_mm != null ? `${data.overbite_estimate_mm.toFixed(1)} mm` : '—'}</td>
            <td className="py-1.5">{classTag(data.overbite_class)}</td>
            <td className="py-1.5 text-xs text-gray-400 pl-2">Norm: 2–4 mm</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded p-2">
        ⚠ {data.note}
      </p>
      <p className="text-xs text-gray-400 mt-1">Source: Proffit &amp; Fields (2013)</p>
    </div>
  )
}


// ── Main component ────────────────────────────────────────────────────────────
export default function AnalysisResults({ report, onReset }) {
  const [expanded, setExpanded] = useState(true)
  const { patient_id, analyses, key_findings, disclaimer } = report

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis Report</h1>
          <p className="text-gray-500 text-sm mt-1">Patient ID: <span className="font-mono font-medium">{patient_id}</span></p>
        </div>
        <button onClick={onReset} className="btn-secondary">
          ← New Patient
        </button>
      </div>

      {/* Key findings */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="font-semibold text-blue-900 mb-3">Key Findings</h2>
        <ul className="space-y-1.5">
          {key_findings.map((f, i) => (
            <li key={i} className="flex gap-2 text-sm text-blue-800">
              <span className="text-blue-400 mt-0.5">→</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Analysis cards */}
      <div className="space-y-4">
        {analyses.facial_symmetry  && <SymmetryCard  data={analyses.facial_symmetry} />}
        {analyses.facial_thirds    && <ThirdsCard    data={analyses.facial_thirds} />}
        {analyses.skeletal_class   && <SkeletalCard  data={analyses.skeletal_class} />}
        {analyses.lip_competence   && <LipCard       data={analyses.lip_competence} />}
        {analyses.smile_arc        && <SmileCard     data={analyses.smile_arc} />}
        {analyses.dental_midline   && <MidlineCard   data={analyses.dental_midline} />}
        {analyses.overjet_overbite && <OverjetCard   data={analyses.overjet_overbite} />}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
        <strong>Disclaimer:</strong> {disclaimer}
      </div>

      {/* Raw JSON toggle — useful for debugging */}
      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer hover:text-gray-600">View raw JSON response</summary>
        <pre className="mt-2 bg-gray-900 text-green-400 rounded-lg p-4 overflow-auto text-xs">
          {JSON.stringify(report, null, 2)}
        </pre>
      </details>
    </div>
  )
}
