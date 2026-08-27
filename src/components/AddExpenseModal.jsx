import { useEffect, useMemo, useRef, useState } from 'react'
import { sharesFor } from '../utils/balances.js'
import { formatCents, splitGapCents, today, toCents } from '../utils/money.js'
import SplitBar from './SplitBar.jsx'
import { Alert, Button, Field, inputClass, PendingTag } from './ui.jsx'

/**
 * Opens over the group page — the list stays visible behind it, so an expense
 * is added in the same place it lands. Shares recalculate on every keystroke.
 */
export default function AddExpenseModal({
  group,
  currentUserEmail,
  colors,
  onSave,
  onClose,
  editingExpense,
  saveError,
}) {
  const [description, setDescription] = useState(editingExpense?.description ?? '')
  const [amount, setAmount] = useState(editingExpense ? (editingExpense.amount?.toFixed(2) ?? '') : '')
  const [date, setDate] = useState(editingExpense?.date ?? today)
  const [paidBy, setPaidBy] = useState(editingExpense?.paidBy ?? currentUserEmail)
  const [participants, setParticipants] = useState(() => editingExpense?.participants ?? group.members.map((m) => m.email))
  const [splitMode, setSplitMode] = useState(editingExpense?.splitMode ?? 'equal')
  const [category, setCategory] = useState(editingExpense?.category ?? 'Other')
  const [notes, setNotes] = useState(editingExpense?.notes ?? '')
  // Keyed by email, kept as raw input strings so a half-typed "12." survives.
  // Retained when switching back to Equal, so toggling does not lose typing.
  const [manualAmounts, setManualAmounts] = useState(() => {
    if (!editingExpense?.splits) return {}
    const amounts = {}
    for (const split of editingExpense.splits) {
      amounts[split.email] = (split.cents / 100).toFixed(2)
    }
    return amounts
  })
  const [error, setError] = useState('')

  const dialogRef = useRef(null)
  const firstFieldRef = useRef(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  // The same split the balance engine will run, previewed before saving.
  const equalShares = useMemo(() => {
    if (!participants.length) return {}
    return sharesFor({ amount: amount || 0, participants })
  }, [amount, participants])

  const shares = useMemo(() => {
    if (splitMode === 'equal') return equalShares
    const manual = {}
    for (const email of participants) manual[email] = toCents(manualAmounts[email] || 0)
    return manual
  }, [splitMode, equalShares, participants, manualAmounts])

  const totalCents = toCents(amount)
  const gapCents = splitGapCents(totalCents, shares)
  const isManual = splitMode === 'manual'
  const unbalanced = isManual && gapCents !== 0

  function toggleParticipant(email) {
    setParticipants((current) =>
      current.includes(email) ? current.filter((e) => e !== email) : [...current, email],
    )
    // Dropping someone releases their amount rather than spreading it over the
    // others — the gap shows up and the user decides where it goes.
    setManualAmounts((current) => {
      const { [email]: _removed, ...rest } = current
      return rest
    })
  }

  /**
   * Manual starts from the equal split, so the form opens already balanced and
   * the user edits away from a valid state. Amounts typed earlier win over the
   * seed, which is what makes Equal -> Manual -> Equal -> Manual non-destructive.
   */
  function chooseMode(mode) {
    setError('')
    if (mode === 'manual' && !Object.keys(manualAmounts).length) {
      const seeded = {}
      for (const email of participants) {
        seeded[email] = ((equalShares[email] ?? 0) / 100).toFixed(2)
      }
      setManualAmounts(seeded)
    }
    setSplitMode(mode)
  }

  function setManualAmount(email, raw) {
    const cleaned = raw.replace(/[^\d.]/g, '')
    setManualAmounts((current) => ({ ...current, [email]: cleaned }))
  }

  const allSelected = participants.length === group.members.length

  function handleSubmit(event) {
    event.preventDefault()
    if (!description.trim()) return setError('Say what the expense was for.')
    if (totalCents <= 0) return setError('Enter an amount greater than zero.')
    if (!participants.length) return setError('Pick at least one person to share this.')
    if (unbalanced) {
      return setError(
        gapCents > 0
          ? `${formatCents(gapCents)} of this expense is still unassigned.`
          : `The shares are ${formatCents(gapCents)} more than the total.`,
      )
    }

    onSave({
      description: description.trim(),
      amount: totalCents / 100,
      paidBy,
      participants,
      date,
      category,
      ...(notes.trim() && { notes }),
      ...(isManual && {
        splitMode: 'manual',
        splits: participants.map((email) => ({ email, cents: shares[email] ?? 0 })),
      }),
    })
  }

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (!dialogRef.current?.contains(event.target)) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-expense-title"
        className="anim-modal max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl"
      >
        <form onSubmit={handleSubmit}>
          <header className="flex items-start justify-between gap-4 border-b border-line-soft px-6 py-5">
            <div>
              <p className="label text-ink-faint">{group.name}</p>
              <h2 id="add-expense-title" className="display mt-1 text-2xl">
                {editingExpense ? 'Edit expense' : 'Add an expense'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-line-soft hover:text-ink"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="space-y-5 px-6 py-6">
            <Field label="What it was for" htmlFor="expense-description">
              <input
                id="expense-description"
                ref={firstFieldRef}
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dinner at Bombay Canteen"
                autoComplete="off"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Total amount" htmlFor="expense-amount">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
                    $
                  </span>
                  <input
                    id="expense-amount"
                    className={`${inputClass} tabular pl-7 text-[17px] font-semibold`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0.00"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                </div>
              </Field>

              <Field label="Date" htmlFor="expense-date">
                <input
                  id="expense-date"
                  type="date"
                  className={inputClass}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Who paid" htmlFor="expense-paidby">
              <select
                id="expense-paidby"
                className={inputClass}
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              >
                {group.members.map((member) => (
                  <option key={member.email} value={member.email}>
                    {member.email === currentUserEmail ? `${member.name} (you)` : member.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Category" htmlFor="expense-category">
              <select
                id="expense-category"
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Food & Drinks">Food & Drinks</option>
                <option value="Transport">Transport</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Activities">Activities</option>
                <option value="Shopping">Shopping</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>
            </Field>

            <Field label="Notes (optional)" htmlFor="expense-notes">
              <textarea
                id="expense-notes"
                className={`${inputClass} resize-none`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any details or notes..."
                rows="3"
              />
            </Field>

            <div>
              <div className="flex items-baseline justify-between">
                <span className="label text-ink-faint">Who shares it</span>
                <button
                  type="button"
                  className="label text-orange transition-opacity hover:opacity-70"
                  onClick={() =>
                    setParticipants(allSelected ? [] : group.members.map((m) => m.email))
                  }
                >
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
              </div>

              <div
                role="group"
                aria-label="How to split this expense"
                className="mt-2 inline-flex rounded-lg border border-line p-0.5"
              >
                {[
                  ['equal', 'Split equally'],
                  ['manual', 'Enter amounts'],
                ].map(([mode, text]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => chooseMode(mode)}
                    aria-pressed={splitMode === mode}
                    className={`label cursor-pointer rounded-md px-3 py-1.5 transition-colors ${
                      splitMode === mode
                        ? 'bg-orange text-white'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>

              <ul className="mt-2 divide-y divide-line-soft overflow-hidden rounded-xl border border-line">
                {group.members.map((member) => {
                  const checked = participants.includes(member.email)
                  return (
                    <li key={member.email}>
                      <label className="flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors hover:bg-paper/60">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleParticipant(member.email)}
                          className="h-4 w-4 shrink-0 accent-orange"
                        />
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full transition-opacity"
                          style={{
                            backgroundColor: colors[member.email],
                            opacity: checked ? 1 : 0.25,
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {member.name}
                          {member.email === currentUserEmail && (
                            <span className="ml-1.5 font-normal text-ink-faint">(you)</span>
                          )}
                        </span>
                        {member.status === 'pending' && <PendingTag />}
                        {isManual && checked ? (
                          /* Clicks stop here: the whole row is a label bound to the
                             checkbox, so aiming for this field would otherwise drop the
                             person from the expense mid-edit. */
                          <span className="relative w-24 shrink-0">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                              $
                            </span>
                            <input
                              aria-label={`Amount for ${member.name}`}
                              className={`${inputClass} tabular py-1.5 pl-6 pr-2.5 text-right text-sm font-semibold`}
                              value={manualAmounts[member.email] ?? ''}
                              onChange={(e) => setManualAmount(member.email, e.target.value)}
                              placeholder="0.00"
                              inputMode="decimal"
                              autoComplete="off"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                          </span>
                        ) : (
                          <span
                            className={`tabular w-20 shrink-0 text-right text-sm font-semibold ${
                              checked ? 'text-ink' : 'text-ink-faint/50'
                            }`}
                          >
                            {checked ? formatCents(shares[member.email] ?? 0) : '—'}
                          </span>
                        )}
                      </label>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-3.5 flex items-center gap-3">
                <div className="flex-1">
                  <SplitBar shares={shares} height={8} colors={colors} />
                </div>
                <p
                  className={`label shrink-0 ${
                    unbalanced ? (gapCents > 0 ? 'text-ink-soft' : 'text-owe') : 'text-ink-faint'
                  }`}
                >
                  {!participants.length
                    ? 'Nobody selected'
                    : !isManual
                      ? `${participants.length} ways · ${formatCents(totalCents)}`
                      : gapCents === 0
                        ? `Adds up · ${formatCents(totalCents)}`
                        : gapCents > 0
                          ? `${formatCents(gapCents)} left to assign`
                          : `${formatCents(gapCents)} over`}
                </p>
              </div>
            </div>

            <Alert>{error || saveError}</Alert>
          </div>

          <footer className="flex justify-end gap-2 border-t border-line-soft bg-paper/50 px-6 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={unbalanced}>
              {editingExpense ? 'Update expense' : 'Save expense'}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  )
}
