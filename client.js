/**
 * Axios client + API helper functions.
 *
 * In development, VITE_API_URL is not set, so requests go through the Vite
 * proxy (/api → localhost:8000/api).
 *
 * In production (Netlify), set VITE_API_URL to your deployed backend URL,
 * e.g. https://your-app.onrender.com
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

/**
 * Upload a single photo and receive predicted landmark coordinates.
 * @param {File}   file      - Image file object
 * @param {string} photoType - 'frontal' | 'profile' | 'smile'
 * @returns {Promise<object>} LandmarkDetectionResponse
 */
export async function uploadPhoto(file, photoType) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post(`/upload/${photoType}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Run all 8 clinical analyses on confirmed landmark coordinates.
 * This endpoint must only be called after the doctor has confirmed all points.
 *
 * @param {object} confirmedLandmarks - ConfirmedLandmarks payload
 * @returns {Promise<object>} AnalysisResponse
 */
export async function runAnalysis(confirmedLandmarks) {
  const { data } = await api.post('/analyse', confirmedLandmarks)
  return data
}

/**
 * Quick liveness check.
 */
export async function healthCheck() {
  const { data } = await axios.get('/health')
  return data
}

export default api
