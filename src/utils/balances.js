import { splitCents, toCents } from './money.js'

/**
 * Balances are always recomputed from the expense list — nothing is cached and
 * no running total is stored, so deleting an expense simply changes the input.
 */

/**
 * Per-participant share of one expense, keyed by email.
 *
 * An expense carries stored `splits` only when someone assigned amounts by
 * hand; without them the split is equal and derived here, which is also what
 * every expense recorded before unequal splitting existed looks like.
 */
export function sharesFor(expense) {
  const participants = [...expense.participants].sort()

  if (expense.splits?.length) {
    const shares = {}
    for (const email of participants) shares[email] = 0
    for (const { email, cents } of expense.splits) {
      // Ignore anyone no longer sharing the expense, so a stored split that has
      // drifted from the participant list cannot resurrect them in the totals.
      if (email in shares) shares[email] = cents
    }
    return shares
  }

  const amounts = splitCents(toCents(expense.amount), participants.length)
  const shares = {}
  participants.forEach((email, index) => {
    shares[email] = amounts[index]
  })
  return shares
}

/**
 * Net position of every member, in cents.
 * Positive means the group owes them; negative means they owe the group.
 */
export function netBalances(members, expenses, settlements = []) {
  const net = {}
  for (const member of members) net[member.email] = 0

  for (const expense of expenses) {
    if (expense.isDeleted) continue
    const shares = sharesFor(expense)
    // The payer is credited with what the shares actually add up to, not with
    // the recorded total. For an equal split the two are identical, but it
    // keeps the books conserved if a stored split ever disagrees with `amount`.
    let paid = 0
    for (const [email, share] of Object.entries(shares)) {
      net[email] = (net[email] ?? 0) - share
      paid += share
    }
    net[expense.paidBy] = (net[expense.paidBy] ?? 0) + paid
  }

  for (const settlement of settlements) {
    net[settlement.from] = (net[settlement.from] ?? 0) + settlement.cents
    net[settlement.to] = (net[settlement.to] ?? 0) - settlement.cents
  }

  return net
}

/**
 * Turns net positions into the fewest payments that clear them.
 * Repeatedly matches the largest debtor against the largest creditor, which
 * fully settles at least one person per payment — so a group needs at most
 * one fewer payment than it has members, rather than one per expense.
 */
export function settleUp(net) {
  const creditors = []
  const debtors = []

  for (const [email, cents] of Object.entries(net)) {
    if (cents > 0) creditors.push({ email, cents })
    else if (cents < 0) debtors.push({ email, cents: -cents })
  }

  // Sort by size, then email, so the same balances always produce the same plan.
  const bySize = (a, b) => b.cents - a.cents || a.email.localeCompare(b.email)
  creditors.sort(bySize)
  debtors.sort(bySize)

  const payments = []
  let c = 0
  let d = 0

  while (c < creditors.length && d < debtors.length) {
    const amount = Math.min(creditors[c].cents, debtors[d].cents)
    if (amount > 0) {
      payments.push({ from: debtors[d].email, to: creditors[c].email, cents: amount })
    }
    creditors[c].cents -= amount
    debtors[d].cents -= amount
    if (creditors[c].cents === 0) c += 1
    if (debtors[d].cents === 0) d += 1
  }

  return payments
}

/** Everything a group view needs: net positions plus the settlement plan. */
export function groupBalance(members, expenses, settlements = []) {
  const net = netBalances(members, expenses, settlements)
  return { net, payments: settleUp(net) }
}

/** One member's standing in a group, in cents. Positive means they are owed. */
export function balanceForMember(members, expenses, email, settlements = []) {
  return netBalances(members, expenses, settlements)[email] ?? 0
}
