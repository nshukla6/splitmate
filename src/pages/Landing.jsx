import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'
import SplitBar from '../components/SplitBar.jsx'
import Wordmark from '../components/Wordmark.jsx'
import Logo from '../components/Logo.jsx'
import Avatar, { AvatarStack } from '../components/Avatar.jsx'
import { Button, PendingTag } from '../components/ui.jsx'
import { colorsForMembers } from '../utils/palette.js'

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
      <header className="border-b border-line mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo className="h-8 w-auto" />
        <Link
          to="/login"
          className="label rounded-md px-2 py-1 text-ink-soft transition-colors hover:text-ink"
        >
          Sign in
        </Link>
      </header>

      {/* Hero: bold claim with working demonstration */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-28">
        <div>
          <p className="label text-orange">For groups who split</p>

          <h1 className="display mt-4 text-[clamp(2.5rem,7vw,4.2rem)] leading-tight text-ink">
            Stop keeping tabs.
            <br />
            <span className="text-orange">Start settling fairly.</span>
          </h1>

          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink-soft">
            Whether it's a group trip, shared rent, or splitting dinner — Splitmate tracks who paid what and shows exactly who owes whom. No spreadsheets. No guessing. Clear, instant, final.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/register">
              <Button className="px-6 py-3 text-[15px] bg-orange hover:bg-orange-deep text-white">
                <ArrowIcon />
                Get started free
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="px-4 py-3 text-[15px]">
                <SignInIcon />
                Already have an account
              </Button>
            </Link>
          </div>
        </div>

        <figure className="rounded-2xl border border-line bg-surface p-6">
          <figcaption className="label flex items-center justify-between text-ink-faint">
            <span>Goa trip • 3 people</span>
          </figcaption>

          <ul className="mt-5 space-y-4">
            {DEMO.map((row) => (
              <li key={row.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: DEMO_COLORS[row.payer] }}
                    />
                    {row.what}
                  </span>
                  <span className="tabular text-sm font-semibold text-ink">{row.amount}</span>
                </div>
                <p className="label mt-1 text-ink-faint">{row.who} paid · split 3 ways</p>
                <div className="mt-2">
                  <SplitBar shares={DEMO_SHARES} height={5} colors={DEMO_COLORS} />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 h-px bg-line" />

          <div className="mt-5 rounded-2xl bg-orange-wash p-4">
            <p className="label text-orange-deep/60">Settlement</p>
            <div className="mt-2.5 flex items-center gap-2.5">
              <Avatar member={DEMO_MEMBERS[1]} size="sm" colors={DEMO_COLORS} />
              <span className="text-sm font-medium text-ink">Bob</span>
              <span aria-hidden="true" className="flex-1 border-t border-dashed border-orange/20" />
              <span className="tabular display text-lg text-orange">$400</span>
              <span aria-hidden="true" className="flex flex-1 items-center">
                <span className="flex-1 border-t border-dashed border-orange/20" />
                <svg viewBox="0 0 6 8" className="h-2 w-1.5 shrink-0 fill-orange/40">
                  <path d="M0 0l6 4-6 4z" />
                </svg>
              </span>
              <span className="text-sm font-medium text-ink">Shubham</span>
              <Avatar member={DEMO_MEMBERS[0]} size="sm" colors={DEMO_COLORS} />
            </div>
          </div>
        </figure>
      </section>

      {/* How it works: 3 simple steps */}
      <section className="border-t border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <h2 className="display text-center text-[clamp(1.75rem,5vw,2.2rem)] text-ink">
            Three steps to clarity
          </h2>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <article className="text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-wash">
                <span className="display text-2xl text-orange">1</span>
              </div>
              <h3 className="display text-lg text-ink">Create a group</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                Add people by email. Invites go out instantly. They can join whenever they're ready.
              </p>
            </article>

            <article className="text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-wash">
                <span className="display text-2xl text-orange">2</span>
              </div>
              <h3 className="display text-lg text-ink">Add expenses</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                Log what you paid for and who was in on it. Splits equally by default, or customize exact amounts.
              </p>
            </article>

            <article className="text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-wash">
                <span className="display text-2xl text-orange">3</span>
              </div>
              <h3 className="display text-lg text-ink">Settle up</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                See exact balances. Know who owes whom. Close the loop with minimal payments.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Why it works: features shown in context */}
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <h2 className="display text-center text-[clamp(1.75rem,5vw,2.2rem)] text-ink mb-12">
            Built for real groups
          </h2>

          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            <article>
              <div className="flex min-h-[140px] items-center">
                <div className="w-full rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-ink">Weekend getaway</span>
                    <PendingTag />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <AvatarStack members={DEMO_MEMBERS} colors={DEMO_COLORS} />
                    <span className="label text-ink-faint">4 members</span>
                  </div>
                </div>
              </div>
              <h3 className="display mt-5 text-lg text-ink">Invite anyone</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                People who haven't signed up yet join as pending. Their spot holds until they register — no one gets left out.
              </p>
            </article>

            <article>
              <div className="flex min-h-[140px] items-center">
                <div className="w-full rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-ink">Hotel bill</span>
                    <span className="tabular font-semibold text-ink">$840</span>
                  </div>
                  <p className="label mt-1 text-ink-faint">Shared • Mar 8</p>
                  <div className="mt-3">
                    <SplitBar shares={DEMO_SHARES} height={5} colors={DEMO_COLORS} />
                  </div>
                </div>
              </div>
              <h3 className="display mt-5 text-lg text-ink">Flexible splits</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                Equal splits work out of the box. But some people paid less? Set exact amounts per person in seconds.
              </p>
            </article>

            <article>
              <div className="flex min-h-[140px] items-center">
                <div className="w-full space-y-2.5 rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center justify-between rounded-lg bg-owed-wash px-3 py-2">
                    <span className="text-sm font-medium text-owed">Bob owes you</span>
                    <span className="tabular font-semibold text-owed">$180</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-owe-wash px-3 py-2">
                    <span className="text-sm font-medium text-owe">You owe Shubham</span>
                    <span className="tabular font-semibold text-owe">$320</span>
                  </div>
                </div>
              </div>
              <h3 className="display mt-5 text-lg text-ink">Instant clarity</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                Balances recalculate in real time. Delete an expense and the math adjusts instantly. No surprises.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Social proof: stats or testimonial */}
      <section className="border-t border-b border-line bg-surface">
        <div className="mx-auto max-w-2xl px-5 py-16 text-center md:py-20">
          <div className="rounded-2xl border border-line bg-orange-wash p-8 md:p-12">
            <p className="text-lg leading-relaxed text-ink md:text-xl">
              "My group took Splitmate on our week in Bali. Normally we'd spend half the trip arguing about who owes what. This time, we knew the exact settlement every day. We could finally just enjoy it."
            </p>
            <p className="label mt-6 text-orange-deep">Sarah, travel organizer</p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div>
              <p className="display text-3xl text-orange">$0</p>
              <p className="label mt-2 text-ink-soft">No fees. No subscriptions.</p>
            </div>
            <div>
              <p className="display text-3xl text-orange">∞</p>
              <p className="label mt-2 text-ink-soft">Unlimited groups and expenses</p>
            </div>
            <div>
              <p className="display text-3xl text-orange">🔐</p>
              <p className="label mt-2 text-ink-soft">All data stays on your device</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA: dark, intentional, clear action */}
      <section className="bg-ink">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center md:py-24">
          <h2 className="display text-[clamp(1.75rem,5vw,2.5rem)] leading-tight text-white">
            Ready to stop keeping tabs?
          </h2>
          <p className="mt-4 text-lg text-orange">Start free. No card required.</p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button className="px-8 py-4 text-[16px] bg-orange hover:bg-orange-deep text-white font-medium">
                Create account
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-ink-soft">
            Have an account?{' '}
            <Link to="/login" className="text-orange hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <Logo className="h-8 w-auto" />
          <p className="text-sm text-ink-faint">
            Splitting made simple.
          </p>
        </div>
      </footer>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SignInIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 8h8M9 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 2v12" strokeLinecap="round" />
    </svg>
  )
}
