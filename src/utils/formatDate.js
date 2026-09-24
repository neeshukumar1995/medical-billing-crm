// Single source of truth for date/time display across the app.
// Canonical formats: date "15 Jan 2024", time "2:30 PM", datetime "15 Jan 2024, 2:30 PM".

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

// Plain calendar dates (Laravel `date:Y-m-d` casts — date_of_birth, followup_date,
// etc.) carry no timezone. `new Date('2024-01-15')` parses that as UTC midnight,
// and reading it back with local getters shifts it a day earlier in any timezone
// behind UTC. Read the Y/M/D digits straight off the string instead of ever
// constructing a Date from it.
function parseDateOnly(value) {
    const m = typeof value === 'string' ? DATE_ONLY_RE.exec(value) : null
    if (!m) return null
    return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) }
}

function toDate(value) {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

/** "15 Jan 2024". Safe for both plain dates and full timestamps. */
export const formatDate = (value) => {
    if (!value) return null
    const dateOnly = parseDateOnly(value)
    if (dateOnly) return `${dateOnly.day} ${MONTHS[dateOnly.month]} ${dateOnly.year}`
    const d = toDate(value)
    if (!d) return value
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "2:30 PM" — local time, 12-hour clock. */
export const formatTime = (value) => {
    const d = toDate(value)
    if (!d) return value ?? null
    let hours = d.getHours()
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const period = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    return `${hours}:${minutes} ${period}`
}

/** "15 Jan 2024, 2:30 PM" */
export const formatDateTime = (value) => {
    if (!value) return null
    const datePart = formatDate(value)
    const d = toDate(value)
    if (!d) return datePart
    return `${datePart}, ${formatTime(d)}`
}

/** Value for an <input type="date">: always "YYYY-MM-DD", never timezone-shifted. */
export const toInputDate = (value) => {
    if (!value) return ''
    if (typeof value === 'string') {
        const m = /^(\d{4}-\d{2}-\d{2})/.exec(value)
        if (m) return m[1]
    }
    const d = toDate(value)
    if (!d) return ''
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${mo}-${day}`
}

/** Today, as an <input type="date"> value, in the viewer's local timezone. */
export const todayInputDate = () => toInputDate(new Date())

/** "2 hours ago", falling back to the plain date once it's a month old or more. */
export const formatRelativeTime = (value) => {
    const d = toDate(value)
    if (!d) return ''
    const diffMs = Date.now() - d.getTime()
    if (diffMs < 0) return formatDateTime(d)
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    return formatDate(d)
}
