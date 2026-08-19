/** Money is stored in dollars but reasoned about in cents, so splits never drift. */

export function toCents(amount) {
  return Math.round(Number(amount || 0) * 100)
}

export function formatCents(cents) {
  const value = Math.abs(cents) / 100
  const hasFraction = Math.abs(cents) % 100 !== 0
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

export function formatAmount(amount) {
  return formatCents(toCents(amount))
}

/**
 * Divides cents into `count` shares that sum back to exactly the total.
 * The odd cents go to the earliest shares, so a $10 three-way split is
 * 3.34 / 3.33 / 3.33 rather than three lots of 3.33 and a missing penny.
 */
export function splitCents(totalCents, count) {
  if (count <= 0) return []
  const base = Math.floor(totalCents / count)
  const remainder = totalCents - base * count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
}

/**
 * How far a set of manual shares is from the total, in cents.
 * Positive means there is money still to assign, negative means it is over.
 * Zero is the only state an unequal expense may be saved in.
 */
export function splitGapCents(totalCents, shares) {
  const assigned = Object.values(shares).reduce((sum, cents) => sum + cents, 0)
  return totalCents - assigned
}

export function formatDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number)
  if (!year) return isoDate
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function today() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
