/**
 * Get the full URL for an image path
 * @param {string} path - The image path (relative or absolute)
 * @returns {string} - The full URL
 */
export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  
  // Get API URL from env or default to localhost:5000
  // Handle both /api and /api/v1 conventions
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  
  // We need the root/base URL of the server (e.g. http://localhost:5000)
  // Remove /api/v1, /api/v2, /api, etc.
  const baseUrl = apiUrl.replace(/\/api(\/v\d+)?\/?$/, '');
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${cleanPath}`;
};
