import { supabase } from './supabaseClient.js'

/**
 * The only module in the app that queries Supabase's data tables (users,
 * groups, group_members, expenses, expense_participants, expense_splits).
 * Everything else reads and writes through these functions.
 *
 * Shapes
 *   user    { id, name, email, createdAt }
 *   group   { id, name, createdBy, createdAt, members: [member] }
 *   member  { email, name, status: 'active' | 'pending', userId | null }
 *   expense { id, groupId, description, amount, paidBy, participants[],
 *             date, createdBy, createdAt, isDeleted, category, notes?,
 *             splitMode?: 'manual', splits?: [{ email, cents }] }
 *
 * An expense splits equally unless it carries splitMode 'manual' and a splits
 * array of exact per-person amounts in cents. Both fields are absent on an
 * equal expense.
 *
 * Members are keyed by email, not by user id, so a person invited before
 * they register keeps their place in every group and every expense. When
 * they finally sign up, their memberships flip from pending to active.
 *
 * Row-level security scopes every read to the signed-in user: groups/expenses
 * only come back for groups you belong to, and `users` only ever returns your
 * own row. So findUserByEmail can resolve your own email but not a friend's —
 * an invite for someone else always starts 'pending' with a guessed name,
 * same as an unregistered address, until they sign in and
 * activatePendingMemberships claims it for them.
 */

const GROUP_SELECT = '*, group_members(email, name, status, user_id)'
const EXPENSE_SELECT = '*, expense_participants(email), expense_splits(email, cents)'

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

/** "rahul.k@test.com" -> "Rahul K" — a readable stand-in until they register. */
export function nameFromEmail(email) {
  const local = normalizeEmail(email).split('@')[0] || 'Member'
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** Data lives centrally in Supabase now, so there is nothing to bootstrap client-side. */
export function seed() {}

/* ---------------------------------------------------------------- users -- */

function toUser(row) {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at }
}

export async function getUsers() {
  const data = unwrap(await supabase.from('users').select('*'))
  return data.map(toUser)
}

/**
 * Resolves any email to its registered user via the find_user_by_email RPC
 * (a narrow SECURITY DEFINER function — see migration 020) rather than a
 * direct table select, since RLS otherwise only lets a client see its own
 * `users` row. This is what lets group invites recognize an already
 * registered friend immediately instead of always starting them 'pending'.
 */
export async function findUserByEmail(email) {
  const data = unwrap(
    await supabase.rpc('find_user_by_email', { p_email: normalizeEmail(email) }),
  )
  return data?.[0] ? toUser(data[0]) : null
}

export async function findUserById(id) {
  const data = unwrap(await supabase.from('users').select('*').eq('id', id).maybeSingle())
  return data ? toUser(data) : null
}

export async function createUser({ name, email }) {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) throw new Error('createUser requires an authenticated session')

  const data = unwrap(
    await supabase
      .from('users')
      .insert({ id: authUser.id, name: String(name).trim(), email: normalizeEmail(email) })
      .select()
      .single(),
  )
  const user = toUser(data)
  await activatePendingMemberships(user)
  return user
}

/** Any group that invited this email is now waiting for them — hand over their seat. */
async function activatePendingMemberships(user) {
  unwrap(
    await supabase
      .from('group_members')
      .update({ name: user.name, status: 'active', user_id: user.id })
      .eq('email', user.email)
      .eq('status', 'pending'),
  )
}

/* -------------------------------------------------------------- session -- */

export async function getSessionUserId() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user.id ?? null
}

/** No-op: Supabase Auth persists the session itself once sign-in succeeds. */
export function setSessionUserId() {}

export async function clearSession() {
  await supabase.auth.signOut()
}

/* --------------------------------------------------------------- groups -- */

function toGroup(row) {
  const members = (row.group_members ?? []).map((member) => ({
    email: member.email,
    name: member.name,
    status: member.status,
    userId: member.user_id,
  }))
  // group_members carries emails; groups.created_by is a uuid, so recover the
  // creator's email from whichever member row matches it.
  const creator = members.find((member) => member.userId === row.created_by)
  return {
    id: row.id,
    name: row.name,
    createdBy: creator?.email ?? row.created_by,
    createdAt: row.created_at,
    members,
  }
}

export async function getGroups() {
  const data = unwrap(
    await supabase.from('groups').select(GROUP_SELECT).order('created_at', { ascending: false }),
  )
  return data.map(toGroup)
}

export async function getGroup(id) {
  const data = unwrap(await supabase.from('groups').select(GROUP_SELECT).eq('id', id).maybeSingle())
  return data ? toGroup(data) : null
}

export async function getGroupsForUser(email) {
  const target = normalizeEmail(email)
  const groups = await getGroups()
  return groups.filter((group) => group.members.some((member) => member.email === target))
}

/** Builds a member record, resolving against the user list so known people join as active. */
async function buildMember(email) {
  const normalized = normalizeEmail(email)
  const user = await findUserByEmail(normalized)
  return user
    ? { email: normalized, name: user.name, status: 'active', userId: user.id }
    : { email: normalized, name: nameFromEmail(normalized), status: 'pending', userId: null }
}

export async function createGroup({ name, creatorEmail, memberEmails = [] }) {
  const creator = normalizeEmail(creatorEmail)
  const emails = [creator, ...memberEmails.map(normalizeEmail)].filter(Boolean)
  const unique = [...new Set(emails)]

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) throw new Error('createGroup requires an authenticated session')

  const groupRow = unwrap(
    await supabase
      .from('groups')
      .insert({ name: String(name).trim(), created_by: authUser.id })
      .select()
      .single(),
  )

  const members = await Promise.all(unique.map(buildMember))
  unwrap(
    await supabase.from('group_members').insert(
      members.map((member) => ({
        group_id: groupRow.id,
        email: member.email,
        name: member.name,
        status: member.status,
        user_id: member.userId,
      })),
    ),
  )

  return { id: groupRow.id, name: groupRow.name, createdBy: creator, createdAt: groupRow.created_at, members }
}

/* ------------------------------------------------------------- expenses -- */

function toExpense(row) {
  const expense = {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: row.amount_cents / 100,
    paidBy: row.paid_by,
    participants: (row.expense_participants ?? []).map((p) => p.email),
    date: row.date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    isDeleted: row.is_deleted,
    category: row.category,
  }
  if (row.notes) expense.notes = row.notes
  if (row.split_mode === 'manual') {
    expense.splitMode = 'manual'
    expense.splits = (row.expense_splits ?? []).map((s) => ({ email: s.email, cents: s.cents }))
  }
  return expense
}

/** Live expenses for a group, newest first. Soft-deleted records never leave here. */
export async function getExpenses(groupId) {
  const data = unwrap(
    await supabase
      .from('expenses')
      .select(EXPENSE_SELECT)
      .eq('group_id', groupId)
      .eq('is_deleted', false)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
  )
  return data.map(toExpense)
}

export async function addExpense({
  groupId,
  description,
  amount,
  paidBy,
  participants,
  date,
  createdBy,
  category,
  notes,
  splitMode,
  splits,
}) {
  const isManual = splitMode === 'manual' && splits?.length > 0

  const expenseRow = unwrap(
    await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        description: String(description).trim(),
        amount_cents: Math.round(Number(amount) * 100),
        paid_by: normalizeEmail(paidBy),
        date,
        created_by: normalizeEmail(createdBy),
        category: category || 'Other',
        notes: notes?.trim() ? String(notes).trim() : null,
        split_mode: isManual ? 'manual' : null,
      })
      .select()
      .single(),
  )

  const participantEmails = participants.map(normalizeEmail)
  unwrap(
    await supabase.from('expense_participants').insert(
      participantEmails.map((email) => ({ expense_id: expenseRow.id, group_id: groupId, email })),
    ),
  )

  let splitRows = []
  if (isManual) {
    splitRows = splits.map(({ email, cents }) => ({
      expense_id: expenseRow.id,
      group_id: groupId,
      email: normalizeEmail(email),
      cents: Math.round(Number(cents) || 0),
    }))
    unwrap(await supabase.from('expense_splits').insert(splitRows))
  }

  return toExpense({
    ...expenseRow,
    expense_participants: participantEmails.map((email) => ({ email })),
    expense_splits: splitRows,
  })
}

/** Soft delete — the record stays, balances simply stop counting it. */
export async function deleteExpense(expenseId) {
  unwrap(
    await supabase
      .from('expenses')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', expenseId),
  )
}

/**
 * Throws unless the signed-in user is the group's creator. GroupSettings.jsx already
 * hides creator-only actions in the UI, but that's trivially bypassed by calling
 * storage functions directly with a valid session — this is the real enforcement.
 */
async function assertIsGroupCreator(groupId, message) {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) throw new Error('You must be signed in to do that.')

  const group = unwrap(
    await supabase.from('groups').select('created_by').eq('id', groupId).maybeSingle(),
  )
  if (!group || group.created_by !== authUser.id) {
    throw new Error(message)
  }
}

/** Renames a group. Creator-only, enforced here (not just hidden in GroupSettings.jsx). */
export async function renameGroup(groupId, name) {
  const trimmed = String(name).trim()
  if (!trimmed) throw new Error('Give the group a name.')
  await assertIsGroupCreator(groupId, "Only the group's creator can rename this group.")
  unwrap(await supabase.from('groups').update({ name: trimmed }).eq('id', groupId))
}

/**
 * True if this member is referenced by any expense in the group — as payer or as a
 * participant (equal or manual split), deleted or not. Both `expenses.paid_by` and
 * `expense_participants` carry a foreign key to `group_members`, so a row in either
 * (even one belonging to a soft-deleted expense, which is never actually removed)
 * would make the delete below fail at the database level. Checking `expense_participants`
 * also covers `expense_splits`, since every split row has a matching participant row.
 * Catching this here keeps the error friendly instead of surfacing a raw Postgres
 * foreign-key violation.
 */
async function memberHasExpenses(groupId, email) {
  const normalized = normalizeEmail(email)
  const asPayer = unwrap(
    await supabase.from('expenses').select('id').eq('group_id', groupId).eq('paid_by', normalized).limit(1),
  )
  if (asPayer.length > 0) return true

  const asParticipant = unwrap(
    await supabase
      .from('expense_participants')
      .select('expense_id')
      .eq('group_id', groupId)
      .eq('email', normalized)
      .limit(1),
  )
  return asParticipant.length > 0
}

/**
 * Removes a member from a group. Creator-only, enforced here (not just hidden in
 * GroupSettings.jsx). Throws if they have existing expenses in it.
 */
export async function removeMember(groupId, email) {
  const normalized = normalizeEmail(email)
  await assertIsGroupCreator(groupId, "Only the group's creator can remove members.")
  if (await memberHasExpenses(groupId, normalized)) {
    throw new Error('Cannot remove — member has existing expenses.')
  }
  unwrap(await supabase.from('group_members').delete().eq('group_id', groupId).eq('email', normalized))
}

/* ----------------------------------------------------------- settlements -- */

function toSettlement(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    from: row.from_email,
    to: row.to_email,
    cents: row.cents,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

/** All settlements recorded for a group. */
export async function getSettlements(groupId) {
  const data = unwrap(await supabase.from('settlements').select('*').eq('group_id', groupId))
  return data.map(toSettlement)
}

/** Records that `from` paid `to` the given amount (cents) to settle a balance. */
export async function addSettlement({ groupId, from, to, cents, createdBy }) {
  const row = unwrap(
    await supabase
      .from('settlements')
      .insert({
        group_id: groupId,
        from_email: normalizeEmail(from),
        to_email: normalizeEmail(to),
        cents: Math.round(Number(cents)),
        created_by: normalizeEmail(createdBy),
      })
      .select()
      .single(),
  )
  return toSettlement(row)
}
