// Dynamic API base URL — works on localhost AND over the network.
// Uses the current page's hostname so it automatically resolves to:
//   • http://localhost:5000        — when opened locally
//   • http://10.120.22.211:5000   — when opened from another device on the network

// Check if we are running in development/local mode
const isLocal = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]' ||
  // Match local network IPs (e.g. 192.168.x.x, 10.x.x.x, 172.16.x.x-172.31.x.x)
  window.location.hostname.startsWith('10.') ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
);

// Support overriding via Vite's environment variable (VITE_API_URL) for production.
// If not specified, dynamically switch between local URL and production backend fallback.
const API_BASE = import.meta.env.VITE_API_URL || (
  isLocal
    ? `http://${window.location.hostname}:5000`
    : 'https://exam-app-tau-ten.vercel.app' // Deployed backend URL
);

export default API_BASE;

