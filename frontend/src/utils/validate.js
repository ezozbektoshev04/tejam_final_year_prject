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

export function validatePhone(v) {
  if (!v) return '' // optional
  if (!/^\+?[\d\s\-()]{7,}$/.test(v)) return 'Enter a valid phone number'
  return ''
}
