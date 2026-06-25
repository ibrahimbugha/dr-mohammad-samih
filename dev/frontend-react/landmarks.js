/**
 * Landmark definitions for all three photo views.
 *
 * category colour convention (keep in sync with tailwind.config.js):
 *   skeletal    → blue   (#3B82F6)
 *   dental      → yellow (#EAB308)
 *   soft_tissue → green  (#22C55E)
 */

export const CATEGORY_COLORS = {
  skeletal:    { fill: '#3B82F6', stroke: '#1D4ED8', label: 'Skeletal' },
  dental:      { fill: '#EAB308', stroke: '#A16207', label: 'Dental' },
  soft_tissue: { fill: '#22C55E', stroke: '#15803D', label: 'Soft Tissue' },
}

// ── Frontal photo landmarks (17 points) ──────────────────────────────────────
export const FRONTAL_LANDMARKS = [
  { id: 'Gl',  name: 'Glabella',            category: 'skeletal' },
  { id: 'N',   name: 'Nasion',              category: 'skeletal' },
  { id: 'Prn', name: 'Nasal Tip',           category: 'soft_tissue' },
  { id: 'Sn',  name: 'Subnasale',           category: 'soft_tissue' },
  { id: 'AlL', name: 'Alar Base (L)',       category: 'soft_tissue' },
  { id: 'AlR', name: 'Alar Base (R)',       category: 'soft_tissue' },
  { id: 'EnL', name: 'Inner Canthus (L)',   category: 'soft_tissue' },
  { id: 'EnR', name: 'Inner Canthus (R)',   category: 'soft_tissue' },
  { id: 'ExL', name: 'Outer Canthus (L)',   category: 'soft_tissue' },
  { id: 'ExR', name: 'Outer Canthus (R)',   category: 'soft_tissue' },
  { id: 'ChL', name: 'Mouth Corner (L)',    category: 'soft_tissue' },
  { id: 'ChR', name: 'Mouth Corner (R)',    category: 'soft_tissue' },
  { id: 'Ls',  name: 'Upper Lip Midpoint',  category: 'soft_tissue' },
  { id: 'Li',  name: 'Lower Lip Midpoint',  category: 'soft_tissue' },
  { id: 'Me',  name: 'Menton',              category: 'skeletal' },
  { id: 'UDM', name: 'Upper Dental Midline',category: 'dental' },
  { id: 'LDM', name: 'Lower Dental Midline',category: 'dental' },
]

// ── Profile photo landmarks (12 points) ──────────────────────────────────────
export const PROFILE_LANDMARKS = [
  { id: 'Gl_p',  name: 'Glabella',            category: 'skeletal' },
  { id: 'N_p',   name: 'Soft Tissue Nasion',  category: 'skeletal' },
  { id: 'Prn_p', name: 'Pronasale',           category: 'soft_tissue' },
  { id: 'Cm',    name: 'Columella',           category: 'soft_tissue' },
  { id: 'Sn_p',  name: 'Subnasale',          category: 'soft_tissue' },
  { id: 'Ls_p',  name: 'Upper Lip',          category: 'soft_tissue' },
  { id: 'Sto',   name: 'Stomion',            category: 'soft_tissue' },
  { id: 'Li_p',  name: 'Lower Lip',          category: 'soft_tissue' },
  { id: 'B_p',   name: 'Soft Tissue B Point',category: 'skeletal' },
  { id: 'Pog_p', name: 'Soft Tissue Pogonion',category: 'skeletal' },
  { id: 'Me_p',  name: 'Menton (profile)',   category: 'skeletal' },
  { id: 'T',     name: 'Tragus of Ear',      category: 'soft_tissue' },
]

// ── Smile photo landmarks (10 points) ────────────────────────────────────────
export const SMILE_LANDMARKS = [
  { id: 'ChL_s',  name: 'Mouth Corner (L)',         category: 'soft_tissue' },
  { id: 'ChR_s',  name: 'Mouth Corner (R)',         category: 'soft_tissue' },
  { id: 'UI_L',   name: 'Upper Incisor Edge (L)',   category: 'dental' },
  { id: 'UI_R',   name: 'Upper Incisor Edge (R)',   category: 'dental' },
  { id: 'LI_L',   name: 'Lower Incisor Edge (L)',   category: 'dental' },
  { id: 'LI_R',   name: 'Lower Incisor Edge (R)',   category: 'dental' },
  { id: 'LL_mid', name: 'Lower Lip Midpoint',       category: 'soft_tissue' },
  { id: 'UDM_s',  name: 'Upper Dental Midline',     category: 'dental' },
  { id: 'BCL',    name: 'Buccal Corridor (L)',      category: 'dental' },
  { id: 'BCR',    name: 'Buccal Corridor (R)',      category: 'dental' },
]

export const LANDMARKS_BY_PHOTO = {
  frontal: FRONTAL_LANDMARKS,
  profile: PROFILE_LANDMARKS,
  smile:   SMILE_LANDMARKS,
}

export const PHOTO_TYPES = [
  {
    id: 'frontal',
    label: 'Frontal (Rest)',
    description: 'Face forward, lips relaxed, Natural Head Position (NHP)',
    icon: '👤',
    guidelines: [
      'Patient facing camera directly (no head tilt)',
      'Lips at rest — not smiling, not pursed',
      'Natural head position (NHP): eyes on horizon, Frankfurt plane horizontal',
      'Camera at eye level',
      'Even lighting — no shadows across the face',
      'Plain background preferred',
    ],
  },
  {
    id: 'profile',
    label: 'Profile (Rest)',
    description: 'Patient facing left or right, lips relaxed, NHP',
    icon: '👤',
    guidelines: [
      'True profile — patient facing exactly 90° to camera',
      'Lips at rest',
      'Natural head position',
      'Full ear visible (tragus must be in frame)',
      'Hair off the face',
      'Camera at eye level',
    ],
  },
  {
    id: 'smile',
    label: 'Full Smile',
    description: 'Full natural smile, facing camera',
    icon: '😁',
    guidelines: [
      'Full natural smile — not forced or exaggerated',
      'Facing camera directly',
      'Upper and lower teeth visible',
      'Buccal corridors (dark spaces at sides) must be visible',
      'Lips fully retracted to show incisor edges',
    ],
  },
]
