/**
 * Normalizes any Uganda phone number variant to E.164 format (+256XXXXXXXXX).
 *
 * Accepted inputs:
 *   0740123456   → +256740123456
 *   740123456    → +256740123456
 *   256740123456 → +256740123456
 *   +256740123456→ +256740123456
 *   07 40-123.456→ +256740123456
 */
export function normalizePhone(raw: string): string {
  // Strip everything that isn't a digit
  const digits = raw.replace(/\D/g, '')

  if (digits.startsWith('256') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+256${digits.slice(1)}`
  if (digits.length === 9) return `+256${digits}`

  // Already stripped of non-digits; prepend + as best-effort fallback
  return `+${digits}`
}
