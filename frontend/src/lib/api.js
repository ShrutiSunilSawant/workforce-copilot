// In dev, VITE_API_BASE_URL is unset so this resolves to "" and requests go through
// Vite's proxy (see vite.config.js). In production (frontend and backend on separate
// domains, e.g. Vercel + Render) it must be set to the deployed backend's origin.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
