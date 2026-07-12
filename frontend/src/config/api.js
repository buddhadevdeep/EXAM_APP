// Dynamic API base URL — works on localhost AND over the network.
// Uses the current page's hostname so it automatically resolves to:
//   • http://localhost:5000        — when opened locally
//   • http://10.120.22.211:5000   — when opened from another device on the network

// ── Option A (recommended): auto-detects hostname ──
const API_BASE = `http://${window.location.hostname}:5000`;

export default API_BASE;

