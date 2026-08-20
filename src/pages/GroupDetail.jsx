import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'
import * as storage from '../data/storage.js'
import { groupBalance, sharesFor } from '../utils/balances.js'
import { formatAmount, formatCents, formatDate } from '../utils/money.js'
import { colorsForMembers } from '../utils/palette.js'
import Avatar from '../components/Avatar.jsx'
import SplitBar from '../components/SplitBar.jsx'
import AddExpenseModal from '../components/AddExpenseModal.jsx'
import { Button, PendingTag } from '../components/ui.jsx'

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [group] = useState(() => storage.getGroup(id))
  const [expenses, setExpenses] = useState(() => (group ? storage.getExpenses(id) : []))
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  const refresh = useCallback(() => setExpenses(storage.getExpenses(id)), [id])

  // Balances are derived from the live expense list every render — never stored.
  const { net, payments } = useMemo(
    () => (group ? groupBalance(group.members, expenses) : { net: {}, payments: [] }),
    [group, expenses],
  )

  // One colour per member, deconflicted across the group.
  const colors = useMemo(() => colorsForMembers(group?.members ?? []), [group])

  const nameFor = useCallback(
    (email) => group?.members.find((m) => m.email === email)?.name ?? storage.nameFromEmail(email),
    [group],
  )

  if (!group) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
        <h1 className="display text-2xl">That group is not here</h1>
        <p className="mt-2 text-[15px] text-ink-soft">It may have been removed, or the link is wrong.</p>
        <Link to="/dashboard" className="mt-6 inline-block">
          <Button>Back to groups</Button>
        </Link>
      </div>
    )
  }

  function handleSave(draft) {
    if (editingExpense) {
      storage.deleteExpense(editingExpense.id)
    }
    storage.addExpense({
      ...draft,
      groupId: group.id,
      createdBy: editingExpense?.createdBy ?? user.email,
      createdAt: editingExpense?.createdAt,
    })
    setModalOpen(false)
    setEditingExpense(null)
    refresh()
  }

  function handleDelete(expenseId) {
    storage.deleteExpense(expenseId)
    refresh()
  }

  function handleEdit(expense) {
    setEditingExpense(expense)
    setModalOpen(true)
  }

  const myBalance = net[user.email] ?? 0

  return (
    <div>
      <Link to="/dashboard" className="label inline-flex items-center gap-1.5 text-ink-faint transition-colors hover:text-ink">
        <span aria-hidden="true">←</span> Groups
      </Link>

      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl">{group.name}</h1>
          <p className="label mt-2 text-ink-faint">
            {group.members.length} member{group.members.length === 1 ? '' : 's'} ·{' '}
            {expenses.length} expense{expenses.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <PlusIcon />
          Add expense
        </Button>
      </header>

      {/* Where the current user stands in this group, stated once and plainly. */}
      <p
        className={`display mt-6 text-2xl ${
          myBalance === 0 ? 'text-ink-faint' : myBalance > 0 ? 'text-owed' : 'text-owe'
        }`}
      >
        {myBalance === 0
          ? 'You are all settled up here'
          : myBalance > 0
            ? `You’re owed ${formatCents(myBalance)} overall`
            : `You owe ${formatCents(myBalance)} overall`}
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_280px] lg:gap-12">
        <div className="lg:order-1">
          <h2 className="label text-ink-faint">Expenses</h2>

          {expenses.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
              <h3 className="display text-xl">Nothing on the tab yet</h3>
              <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-ink-soft">
                Add the first expense and Splitmate starts working out who owes whom.
              </p>
              <Button className="mt-5 gap-2" onClick={() => setModalOpen(true)}>
                <PlusIcon />
                Add expense
              </Button>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  currentUserEmail={user.email}
                  nameFor={nameFor}
                  colors={colors}
                  onDelete={() => handleDelete(expense.id)}
                  onEdit={() => handleEdit(expense)}
                />
              ))}
            </ul>
          )}

          <BalanceSummary
            payments={payments}
            currentUserEmail={user.email}
            nameFor={nameFor}
            colors={colors}
            hasExpenses={expenses.length > 0}
          />
        </div>

        <aside className="lg:order-2">
          <h2 className="label text-ink-faint">Members</h2>
          <ul className="mt-3 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
            {group.members.map((member) => (
              <li key={member.email} className="flex items-center gap-3 px-4 py-3">
                <Avatar member={member} size="sm" muted={member.status === 'pending'} colors={colors} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.name}
                    {member.email === user.email && (
                      <span className="ml-1.5 text-ink-faint">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-ink-faint">{member.email}</p>
                </div>
                {member.status === 'pending' && <PendingTag />}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {modalOpen && (
        <AddExpenseModal
          group={group}
          currentUserEmail={user.email}
          colors={colors}
          onSave={handleSave}
          onClose={() => {
            setModalOpen(false)
            setEditingExpense(null)
          }}
          editingExpense={editingExpense}
        />
      )}
    </div>
  )
}

function ExpenseRow({ expense, currentUserEmail, nameFor, colors, onDelete, onEdit }) {
  const [confirming, setConfirming] = useState(false)
  const shares = sharesFor(expense)
  const payerIsYou = expense.paidBy === currentUserEmail
  const isCreator = expense.createdBy === currentUserEmail

  return (
    <li className="group rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ink-faint/50">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="truncate text-[15px] font-semibold">{expense.description}</h3>
        <span className="tabular display shrink-0 text-lg">{formatAmount(expense.amount)}</span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: colors[expense.paidBy] }}
        />
        <span className="text-sm text-ink-soft">
          {payerIsYou ? 'You' : nameFor(expense.paidBy)} paid
        </span>
        <span aria-hidden="true" className="text-ink-faint/50">·</span>
        <span className="label text-ink-faint">{formatDate(expense.date)}</span>
        <span aria-hidden="true" className="text-ink-faint/50">·</span>
        <span className="label text-ink-faint">
          {expense.participants.length} way{expense.participants.length === 1 ? '' : 's'}
        </span>
        {expense.category && expense.category !== 'Other' && (
          <>
            <span aria-hidden="true" className="text-ink-faint/50">·</span>
            <span className="inline-flex items-center rounded-full bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange">
              {expense.category}
            </span>
          </>
        )}
        {expense.splitMode === 'manual' && (
          <>
            <span aria-hidden="true" className="text-ink-faint/50">·</span>
            <span className="label text-ink-faint">Unequal</span>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <SplitBar shares={shares} height={5} colors={colors} />
        </div>

        {confirming ? (
          <span className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onDelete}
              className="label rounded-md px-1.5 py-1 text-owe transition-opacity hover:opacity-70"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="label rounded-md px-1.5 py-1 text-ink-faint transition-colors hover:text-ink"
            >
              Keep
            </button>
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-2">
            {isCreator && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${expense.description}`}
                className="label rounded-md px-1.5 py-1 text-orange transition-opacity hover:opacity-70"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Remove ${expense.description}`}
              className="shrink-0 rounded-md p-1.5 text-ink-faint opacity-0 transition-opacity hover:text-owe focus-visible:opacity-100 group-hover:opacity-100"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8h5.8l.6-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </span>
        )}
      </div>
    </li>
  )
}

/**
 * The settlement plan, written from where the current user stands. Payments
 * that involve them lead and are stated in the second person; the rest are
 * still shown, quietly, because a group needs the full picture.
 */
function BalanceSummary({ payments, currentUserEmail, nameFor, colors, hasExpenses }) {
  const mine = payments.filter((p) => p.from === currentUserEmail || p.to === currentUserEmail)
  const others = payments.filter((p) => p.from !== currentUserEmail && p.to !== currentUserEmail)

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="label text-ink-faint">Balance summary</h2>
        {payments.length > 0 && (
          <span className="label text-ink-faint">
            {payments.length} payment{payments.length === 1 ? '' : 's'} to settle
          </span>
        )}
      </div>

      {payments.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line bg-surface/60 px-5 py-8 text-center text-[15px] text-ink-soft">
          {hasExpenses ? 'Everyone is square. Nothing to pay.' : 'Balances appear once there are expenses.'}
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {mine.map((payment) => {
            const youPay = payment.from === currentUserEmail
            const other = youPay ? payment.to : payment.from
            return (
              <div
                key={`${payment.from}-${payment.to}`}
                className={`flex items-center justify-between gap-3 rounded-2xl px-5 py-4 ${
                  youPay ? 'bg-owe-wash' : 'bg-owed-wash'
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar member={{ name: nameFor(other), email: other }} size="sm" colors={colors} />
                  <span className={`truncate text-[17px] font-semibold ${youPay ? 'text-owe' : 'text-owed'}`}>
                    {youPay ? `You owe ${nameFor(other)}` : `${nameFor(other)} owes you`}
                  </span>
                </span>
                <span className={`tabular display shrink-0 text-xl ${youPay ? 'text-owe' : 'text-owed'}`}>
                  {formatCents(payment.cents)}
                </span>
              </div>
            )
          })}

          {others.map((payment) => (
            <div
              key={`${payment.from}-${payment.to}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line-soft px-5 py-3"
            >
              <span className="truncate text-sm text-ink-faint">
                {nameFor(payment.from)} owes {nameFor(payment.to)}
              </span>
              <span className="tabular shrink-0 text-sm font-medium text-ink-faint">
                {formatCents(payment.cents)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
    </svg>
  )
}
