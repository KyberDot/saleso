export function formatCurrency(value, currency = 'GBP') {
  if (value == null || isNaN(value)) return '—'
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value)
  } catch {
    return `${currency} ${parseFloat(value).toFixed(2)}`
  }
}

export function formatDate(ts) {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(ts))
}

export function formatDateTime(ts) {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts))
}

export function formatNumber(n) {
  if (n == null) return '0'
  return new Intl.NumberFormat('en-GB').format(n)
}

export function truncate(str, n = 40) {
  if (!str) return '—'
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function statusBadgeClass(status) {
  if (!status) return 'badge-gray'
  const s = status.toUpperCase()
  if (s.includes('PAID') || s.includes('FULFILLED') || s.includes('SHIPPED') || s === 'ACTIVE') return 'badge-green'
  if (s.includes('PENDING') || s.includes('PROGRESS')) return 'badge-yellow'
  if (s.includes('CANCEL') || s.includes('FAILED') || s.includes('DELETED')) return 'badge-red'
  if (s.includes('ENDED') || s.includes('INACTIVE')) return 'badge-gray'
  return 'badge-blue'
}

export const CURRENCIES = [
  { code: 'GBP', label: '£ GBP — British Pound' },
  { code: 'USD', label: '$ USD — US Dollar' },
  { code: 'EUR', label: '€ EUR — Euro' },
  { code: 'CAD', label: '$ CAD — Canadian Dollar' },
  { code: 'AUD', label: '$ AUD — Australian Dollar' },
  { code: 'JPY', label: '¥ JPY — Japanese Yen' },
]
