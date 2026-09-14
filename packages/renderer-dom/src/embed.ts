/**
 * Detect iframe / minimal-player embed mode from `?embed=1` (or true/yes).
 */
export function resolveEmbedMode(search?: string): boolean {
  let query = search;
  if (query === undefined && typeof window !== 'undefined') {
    query = window.location.search;
  }
  if (!query) return false;
  const value = new URLSearchParams(query).get('embed');
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
