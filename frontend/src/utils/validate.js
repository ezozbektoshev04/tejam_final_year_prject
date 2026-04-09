export function validateEmail(v) {
  if (!v) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address'
  return ''
}

export function validatePassword(v, minLen = 6) {
  if (!v) return 'Password is required'
  if (v.length < minLen) return `Password must be at least ${minLen} characters`
  return ''
}

export function validateConfirm(v, pw) {
  if (!v) return 'Please confirm your password'
  if (v !== pw) return 'Passwords do not match'
  return ''
}

export function validateRequired(v, label = 'This field') {
  if (!v || !v.trim()) return `${label} is required`
  return ''
}

// Valid Uzbek mobile operator prefixes (after +998)
const UZ_PREFIXES = ['90','91','93','94','95','97','98','99','33','50','77','88']

export function validatePhone(v) {
  if (!v) return '' // optional
  const digits = v.replace(/\D/g, '')
  // Accept with or without country code: 998XXXXXXXXX or just XXXXXXXXX (9 digits)
  const local = digits.startsWith('998') ? digits.slice(3) : digits
  if (local.length !== 9) return 'Enter a valid Uzbek number: +998 XX XXX XX XX'
  const prefix = local.slice(0, 2)
  if (!UZ_PREFIXES.includes(prefix)) return `Operator code ${prefix} is not a valid Uzbek mobile prefix`
  return ''
}

// Format raw digits into +998 XX XXX XX XX as user types
export function formatUzbekPhone(raw) {
  // Strip everything except digits
  let digits = raw.replace(/\D/g, '')
  // Remove leading 998 or 8 (common mistakes)
  if (digits.startsWith('998')) digits = digits.slice(3)
  else if (digits.startsWith('8')) digits = digits.slice(1)
  // Limit to 9 digits
  digits = digits.slice(0, 9)
  // Build formatted string
  let out = '+998'
  if (digits.length > 0) out += ' ' + digits.slice(0, 2)
  if (digits.length > 2) out += ' ' + digits.slice(2, 5)
  if (digits.length > 5) out += ' ' + digits.slice(5, 7)
  if (digits.length > 7) out += ' ' + digits.slice(7, 9)
  return out
}
