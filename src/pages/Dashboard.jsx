import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'
import * as storage from '../data/storage.js'
import { balanceForMember } from '../utils/balances.js'
import { formatCents } from '../utils/money.js'
import { AvatarStack } from '../components/Avatar.jsx'
import { colorsForMembers } from '../utils/palette.js'
import { Button } from '../components/ui.jsx'
import Logo from '../components/Logo.jsx'

export default function Dashboard() {
  const { user } = useAuth()

  // Recomputed from storage on every visit — no cached totals anywhere.
  const groups = useMemo(() => {
    return storage.getGroupsForUser(user.email).map((group) => ({
      ...group,
      balance: balanceForMember(group.members, storage.getExpenses(group.id), user.email),
    }))
  }, [user.email])

  const owedToYou = groups.reduce((sum, g) => sum + Math.max(g.balance, 0), 0)
  const youOwe = groups.reduce((sum, g) => sum + Math.max(-g.balance, 0), 0)
  const net = owedToYou - youOwe

  return (
    <div>
      <div className="mb-8 flex items-center justify-center">
        <Logo className="h-10 w-auto" />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-ink-faint">Signed in as {user.email}</p>
          <h1 className="display mt-2 text-4xl">Hello, {user.name.split(' ')[0]}</h1>
        </div>
        {groups.length > 0 && (
          <Link to="/group/new">
            <Button className="gap-2">
              <PlusIcon />
              Create group
            </Button>
          </Link>
        )}
      </div>

      {/* The ledger line: what is coming to you, what is going out, where you land. */}
      <dl className="mt-8 grid grid-cols-1 divide-y divide-line rounded-2xl border border-line bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Summary label="Owed to you" cents={owedToYou} tone={owedToYou ? 'owed' : 'flat'} />
        <Summary label="You owe" cents={youOwe} tone={youOwe ? 'owe' : 'flat'} />
        <Summary label="Net balance" cents={net} tone={net > 0 ? 'owed' : net < 0 ? 'owe' : 'flat'} signed />
      </dl>

      <h2 className="label mt-12 text-ink-faint">
        {groups.length ? `Your groups · ${groups.length}` : 'Your groups'}
      </h2>

      {groups.length === 0 ? <EmptyState /> : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {groups.map((group, index) => (
            <li key={group.id} className="anim-rise" style={{ animationDelay: `${index * 50}ms` }}>
              <GroupCard group={group} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const TONE_TEXT = {
  owed: 'text-owed',
  owe: 'text-owe',
  flat: 'text-ink-faint',
}

function Summary({ label, cents, tone, signed = false }) {
  const prefix = signed && cents !== 0 ? (cents > 0 ? '+' : '−') : ''
  return (
    <div className="px-6 py-5">
      <dt className="label text-ink-faint">{label}</dt>
      <dd className={`display tabular mt-2 text-3xl ${TONE_TEXT[tone]}`}>
        {prefix}
        {formatCents(cents)}
      </dd>
    </div>
  )
}

function GroupCard({ group }) {
  const { balance } = group
  const settled = balance === 0

  return (
    <Link
      to={`/group/${group.id}`}
      className="group block h-full rounded-2xl border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-[0_12px_30px_-18px_rgba(23,18,43,0.4)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="display text-xl leading-tight">{group.name}</h3>
        <span aria-hidden="true" className="mt-1 text-ink-faint transition-transform group-hover:translate-x-0.5">
          <ArrowIcon />
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <AvatarStack members={group.members} colors={colorsForMembers(group.members)} />
        <span className="label text-ink-faint">
          {group.members.length} member{group.members.length === 1 ? '' : 's'}
        </span>
      </div>

      <p
        className={`mt-5 border-t border-line-soft pt-4 text-[15px] font-semibold ${
          settled ? 'text-ink-faint' : balance > 0 ? 'text-owed' : 'text-owe'
        }`}
      >
        {settled ? (
          'All settled'
        ) : balance > 0 ? (
          <>You’re owed <span className="tabular">{formatCents(balance)}</span></>
        ) : (
          <>You owe <span className="tabular">{formatCents(balance)}</span></>
        )}
      </p>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
      <h3 className="display text-2xl">No groups yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
        A group is where a shared tab lives — a trip, a flat, a standing dinner. Start one
        and add the people you split with.
      </p>
      <Link to="/group/new" className="mt-6 inline-block">
        <Button className="gap-2 px-6 py-3">
          <PlusIcon />
          Create group
        </Button>
      </Link>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12L12 4M6 4h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

