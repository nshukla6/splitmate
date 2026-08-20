import { Link } from 'react-router-dom'
import Wordmark from './Wordmark.jsx'
import Logo from './Logo.jsx'
import SplitBar from './SplitBar.jsx'
import { colorsForMembers } from '../utils/palette.js'

const ASIDE_COLORS = colorsForMembers([
  'shubham@test.com',
  'bob@test.com',
  'rahul@test.com',
  'eva@test.com',
])

const ASIDE_SHARES = {
  'shubham@test.com': 100,
  'bob@test.com': 100,
  'rahul@test.com': 100,
  'eva@test.com': 100,
}

/** Two columns: the form does the work, the panel keeps the mark in view. */
export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-ink px-12 py-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="w-fit rounded-md text-paper">
          <Wordmark />
        </Link>

        <div>
          <p className="display max-w-sm text-[2.5rem] leading-[1.05]">
            Every expense is a set of shares.
          </p>
          <div className="mt-8 max-w-sm">
            <SplitBar shares={ASIDE_SHARES} height={10} colors={ASIDE_COLORS} />
            <p className="label mt-4 text-paper/50">Four ways · settled in one payment</p>
          </div>
        </div>

        <p className="label text-paper/40">Local build · data stays in this browser</p>
      </aside>

      <main className="flex min-h-screen flex-col justify-center px-5 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 flex justify-center lg:hidden rounded-md text-paper hover:opacity-75">
            <Logo className="h-10 w-auto" />
          </Link>

          <p className="label text-orange">{eyebrow}</p>
          <h1 className="display mt-3 text-4xl">{title}</h1>
          {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 text-sm text-ink-soft">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
