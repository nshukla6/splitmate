import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'
import SplitBar from '../components/SplitBar.jsx'
import Wordmark from '../components/Wordmark.jsx'
import Avatar, { AvatarStack } from '../components/Avatar.jsx'
import { Button, PendingTag } from '../components/ui.jsx'
import { colorsForMembers } from '../utils/palette.js'

/* A worked example, used as the hero: three expenses that reduce to one payment. */
const DEMO = [
  { id: 1, what: 'Dinner', who: 'Shubham', amount: '$1,200', payer: 'shubham@test.com' },
  { id: 2, what: 'Cab home', who: 'Bob', amount: '$400', payer: 'bob@test.com' },
  { id: 3, what: 'Drinks', who: 'Rahul', amount: '$800', payer: 'rahul@test.com' },
]

const DEMO_SHARES = {
  'shubham@test.com': 100,
  'bob@test.com': 100,
  'rahul@test.com': 100,
}

const DEMO_COLORS = colorsForMembers([
  'shubham@test.com',
  'bob@test.com',
  'rahul@test.com',
  'eva@test.com',
])

const DEMO_MEMBERS = [
  { name: 'Shubham', email: 'shubham@test.com', status: 'active' },
  { name: 'Bob', email: 'bob@test.com', status: 'active' },
  { name: 'Rahul', email: 'rahul@test.com', status: 'active' },
  { name: 'Eva', email: 'eva@test.com', status: 'pending' },
]

export default function Landing() {
  const { user } = useAuth()

  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Wordmark />
        <Link
          to="/login"
          className="label rounded-md px-2 py-1 text-ink-soft transition-colors hover:text-ink"
        >
          Sign in
        </Link>
      </header>

      {/* Hero: the claim on the left, the claim demonstrated on the right. */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20">
        <div>
          <p className="label anim-rise text-violet">Shared expenses, settled</p>

          <h1 className="display anim-rise mt-5 text-[clamp(2.75rem,7vw,4.5rem)]" style={{ animationDelay: '60ms' }}>
            Split the bill.
            <br />
            <span className="text-violet">Settle once.</span>
          </h1>

          <p
            className="anim-rise mt-6 max-w-md text-[17px] leading-relaxed text-ink-soft"
            style={{ animationDelay: '120ms' }}
          >
            Splitmate keeps the running tab for a group — who paid, who shared, and what is
            still outstanding — then reduces the whole tangle to the fewest payments that
            clear it.
          </p>

          <div className="anim-rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: '180ms' }}>
            <Link to="/register">
              <Button className="px-6 py-3 text-[15px]">Get started</Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="px-4 py-3 text-[15px]">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>

        <figure className="anim-rise rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_60px_-30px_rgba(23,18,43,0.35)]" style={{ animationDelay: '240ms' }}>
          <figcaption className="label flex items-center justify-between text-ink-faint">
            <span>Goa trip</span>
            <span>3 people</span>
          </figcaption>

          <ul className="mt-5 space-y-4">
            {DEMO.map((row, index) => (
              <li
                key={row.id}
                className="anim-rise"
                style={{ animationDelay: `${340 + index * 110}ms` }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: DEMO_COLORS[row.payer] }}
                    />
                    {row.what}
                  </span>
                  <span className="tabular text-sm font-semibold">{row.amount}</span>
                </div>
                <p className="label mt-1 text-ink-faint">{row.who} paid · split 3 ways</p>
                <div className="mt-2">
                  <SplitBar shares={DEMO_SHARES} height={5} colors={DEMO_COLORS} />
                </div>
              </li>
            ))}
          </ul>

          {/* The moment the product exists for. */}
          <div className="anim-draw mt-6 h-px bg-line" style={{ animationDelay: '700ms' }} />

          <div className="anim-collapse mt-5 rounded-2xl bg-owed-wash p-4" style={{ animationDelay: '820ms' }}>
            <p className="label text-owed/70">Settles to one payment</p>
            <div className="mt-2.5 flex items-center gap-2.5">
              <Avatar member={DEMO_MEMBERS[1]} size="sm" colors={DEMO_COLORS} />
              <span className="text-sm font-medium">Bob</span>
              <span aria-hidden="true" className="flex-1 border-t border-dashed border-owed/30" />
              <span className="tabular display text-lg text-owed">$400</span>
              <span aria-hidden="true" className="flex flex-1 items-center">
                <span className="flex-1 border-t border-dashed border-owed/30" />
                <svg viewBox="0 0 6 8" className="h-2 w-1.5 shrink-0 fill-owed/50">
                  <path d="M0 0l6 4-6 4z" />
                </svg>
              </span>
              <span className="text-sm font-medium">Shubham</span>
              <Avatar member={DEMO_MEMBERS[0]} size="sm" colors={DEMO_COLORS} />
            </div>
          </div>
        </figure>
      </section>

      {/* Features, shown as the actual pieces of the product rather than described. */}
      <section className="border-t border-line bg-surface/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-3 md:gap-8">
          <article>
            <div className="flex min-h-[132px] items-center">
             <div className="w-full rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between">
                <span className="font-semibold">Goa trip</span>
                <PendingTag />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <AvatarStack members={DEMO_MEMBERS} colors={DEMO_COLORS} />
                <span className="label text-ink-faint">4 members</span>
              </div>
             </div>
            </div>
            <h2 className="display mt-5 text-lg">Create groups</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
              Add people by email. Anyone who has not signed up yet joins as pending and
              keeps their place until they do.
            </p>
          </article>

          <article>
            <div className="flex min-h-[132px] items-center">
             <div className="w-full rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Groceries</span>
                <span className="tabular font-semibold">$240</span>
              </div>
              <p className="label mt-1 text-ink-faint">Eva paid · Mar 4</p>
              <div className="mt-3">
                <SplitBar shares={DEMO_SHARES} height={5} colors={DEMO_COLORS} />
              </div>
             </div>
            </div>
            <h2 className="display mt-5 text-lg">Track shared expenses</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
              Log what it was for, who covered it, and who was in on it. Every expense
              shows the shares it breaks into.
            </p>
          </article>

          <article>
            <div className="flex min-h-[132px] items-center">
             <div className="w-full space-y-2.5 rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between rounded-xl bg-owe-wash px-3 py-2.5">
                <span className="text-sm font-medium text-owe">You owe Shubham</span>
                <span className="tabular font-semibold text-owe">$800</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-owed-wash px-3 py-2.5">
                <span className="text-sm font-medium text-owed">Bob owes you</span>
                <span className="tabular font-semibold text-owed">$200</span>
              </div>
             </div>
            </div>
            <h2 className="display mt-5 text-lg">See who owes what</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
              Balances are written from where you stand, and always recalculated from
              scratch — delete an expense and the numbers follow.
            </p>
          </article>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <Wordmark />
          <p className="text-sm text-ink-faint">
            Ready to square up?{' '}
            <Link to="/register" className="font-medium text-violet hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
