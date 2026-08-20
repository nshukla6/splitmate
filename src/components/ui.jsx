const BUTTON_BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40'

const VARIANTS = {
  primary: 'bg-orange text-white hover:bg-orange-deep active:translate-y-px',
  secondary: 'border border-line bg-surface text-ink hover:border-ink-faint',
  ghost: 'text-ink-soft hover:bg-line-soft hover:text-ink',
  danger: 'border border-owe/30 bg-owe-wash text-owe hover:bg-owe hover:text-white',
}

export function Button({ variant = 'primary', className = '', ...props }) {
  return <button className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`} {...props} />
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="label text-ink-faint">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-faint/70 transition-colors focus:border-orange focus:outline-none'

export function Panel({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</section>
  )
}

export function Alert({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-xl border border-owe/25 bg-owe-wash px-3.5 py-2.5 text-sm text-owe">
      {children}
    </p>
  )
}

/** Status marker for people who have been invited but have not signed up yet. */
export function PendingTag() {
  return (
    <span className="label rounded-full bg-pending-wash px-2 py-1 text-pending">Pending</span>
  )
}
