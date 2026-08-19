import { colorForEmail } from '../utils/palette.js'
import { formatCents } from '../utils/money.js'

/**
 * The signature element: one expense drawn as the shares that make it up.
 * Each segment is a participant, sized to what they owe and coloured by the
 * same rule used for their avatar, so a glance answers "who is in this?".
 */
export default function SplitBar({ shares, height = 6, showLegend = false, colors }) {
  const entries = Object.entries(shares)
  const colorFor = (email) => colors?.[email] ?? colorForEmail(email)
  const total = entries.reduce((sum, [, cents]) => sum + cents, 0)

  if (!entries.length || total <= 0) {
    return <div className="rounded-full bg-line-soft" style={{ height }} />
  }

  return (
    <div>
      <div
        className="flex overflow-hidden rounded-full bg-line-soft"
        style={{ height }}
        role="img"
        aria-label={`Split between ${entries.length} people`}
      >
        {entries.map(([email, cents]) => (
          <div
            key={email}
            className="transition-[width] duration-300 ease-out"
            style={{ width: `${(cents / total) * 100}%`, backgroundColor: colorFor(email) }}
          />
        ))}
      </div>

      {showLegend && (
        <ul className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2">
          {entries.map(([email, cents]) => (
            <li key={email} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorFor(email) }}
                />
                <span className="truncate text-ink-soft">{email}</span>
              </span>
              <span className="tabular shrink-0 font-medium">{formatCents(cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
