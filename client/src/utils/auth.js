/**
 * Get the target dashboard URL based on the user's role.
 * @param {string} role - The user's role (e.g., 'tenant', 'owner', 'admin').
 * @returns {string} The target URL for redirection.
 */
export const getRedirectPath = (role) => {
  switch (role) {
    case "tenant":
      return "/search";
    case "owner":
      return "/owner/dashboard";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
};
