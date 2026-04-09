// Uzbekistan is UTC+5 — all backend timestamps are UTC, convert for display

const TZ = 'Asia/Tashkent'

/**
 * Format a UTC ISO string for display in Tashkent local time.
 * @param {string} iso  - ISO 8601 string from backend (UTC)
 * @param {'date'|'time'|'datetime'|'short'} format
 */
export function formatDate(iso, format = 'datetime') {
  if (!iso) return '—'
  const date = new Date(iso)
  if (isNaN(date)) return '—'

  switch (format) {
    case 'date':
      return date.toLocaleDateString('en-US', { timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric' })
    case 'time':
      return date.toLocaleTimeString('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
    case 'short':
      return date.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' })
    case 'datetime':
    default:
      return date.toLocaleString('en-US', {
        timeZone: TZ,
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
  }
}

/** Returns just the short date + time parts as separate strings */
export function splitDateTime(iso) {
  if (!iso) return { date: '—', time: '' }
  const date = new Date(iso)
  if (isNaN(date)) return { date: '—', time: '' }
  return {
    date: date.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }),
  }
}
