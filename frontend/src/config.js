// Configuration for API endpoints
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// If running on Vercel (monorepo), the prefix is /_/backend
// If using a separate service like Render, set VITE_API_URL in environment
export const API_BASE_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:3001' : '/_/backend');

