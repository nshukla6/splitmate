/**
 * The only module in the app that touches localStorage.
 * Everything else reads and writes through these functions.
 *
 * Shapes
 *   user    { id, name, email, password, createdAt }
 *   group   { id, name, createdBy, createdAt, members: [member] }
 *   member  { email, name, status: 'active' | 'pending', userId | null }
 *   expense { id, groupId, description, amount, paidBy, participants[],
 *             date, createdBy, createdAt, isDeleted, category,
 *             splitMode?: 'manual', splits?: [{ email, cents }] }
 *
 * An expense splits equally unless it carries splitMode 'manual' and a splits
 * array of exact per-person amounts in cents. Both fields are absent on an
 * equal expense, so records written before unequal splitting still read
 * correctly and need no migration.
 *
 * Members are keyed by email, not by user id, so a person invited before
 * they register keeps their place in every group and every expense. When
 * they finally sign up, their memberships flip from pending to active.
 */

const KEYS = {
  users: 'splitmate.users',
  groups: 'splitmate.groups',
  expenses: 'splitmate.expenses',
  session: 'splitmate.session',
}

const TEST_ACCOUNTS = [
  { name: 'Shubham', email: 'shubham@test.com' },
  { name: 'Bob', email: 'bob@test.com' },
  { name: 'Rahul', email: 'rahul@test.com' },
  { name: 'Eva', email: 'eva@test.com' },
]

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
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

/** Creates the four test accounts the first time the app runs. Safe to call repeatedly. */
export function seed() {
  if (localStorage.getItem(KEYS.users) !== null) return
  const now = new Date().toISOString()
  write(
    KEYS.users,
    TEST_ACCOUNTS.map((account) => ({
      id: uid('usr'),
      name: account.name,
      email: account.email,
      password: 'password',
      createdAt: now,
    })),
  )
  write(KEYS.groups, [])
  write(KEYS.expenses, [])
}

/* ---------------------------------------------------------------- users -- */

export function getUsers() {
  return read(KEYS.users, [])
}

export function findUserByEmail(email) {
  const target = normalizeEmail(email)
  return getUsers().find((user) => user.email === target) ?? null
}

export function findUserById(id) {
  return getUsers().find((user) => user.id === id) ?? null
}

export function createUser({ name, email, password }) {
  const users = getUsers()
  const user = {
    id: uid('usr'),
    name: String(name).trim(),
    email: normalizeEmail(email),
    password,
    createdAt: new Date().toISOString(),
  }
  write(KEYS.users, [...users, user])
  activatePendingMemberships(user)
  return user
}

/** Any group that invited this email by is now waiting for them — hand over their seat. */
function activatePendingMemberships(user) {
  const groups = getGroups()
  let changed = false
  const updated = groups.map((group) => {
    if (!group.members.some((m) => m.email === user.email && m.status === 'pending')) {
      return group
    }
    changed = true
    return {
      ...group,
      members: group.members.map((member) =>
        member.email === user.email
          ? { ...member, name: user.name, status: 'active', userId: user.id }
          : member,
      ),
    }
  })
  if (changed) write(KEYS.groups, updated)
}

/* -------------------------------------------------------------- session -- */

export function getSessionUserId() {
  return read(KEYS.session, null)
}

export function setSessionUserId(userId) {
  write(KEYS.session, userId)
}

export function clearSession() {
  localStorage.removeItem(KEYS.session)
}

/* --------------------------------------------------------------- groups -- */

export function getGroups() {
  return read(KEYS.groups, [])
}

export function getGroup(id) {
  return getGroups().find((group) => group.id === id) ?? null
}

export function getGroupsForUser(email) {
  const target = normalizeEmail(email)
  return getGroups()
    .filter((group) => group.members.some((member) => member.email === target))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Builds a member record, resolving against the user list so known people join as active. */
function buildMember(email) {
  const normalized = normalizeEmail(email)
  const user = findUserByEmail(normalized)
  return user
    ? { email: normalized, name: user.name, status: 'active', userId: user.id }
    : { email: normalized, name: nameFromEmail(normalized), status: 'pending', userId: null }
}

export function createGroup({ name, creatorEmail, memberEmails = [] }) {
  const creator = normalizeEmail(creatorEmail)
  const emails = [creator, ...memberEmails.map(normalizeEmail)].filter(Boolean)
  const unique = [...new Set(emails)]

  const group = {
    id: uid('grp'),
    name: String(name).trim(),
    createdBy: creator,
    createdAt: new Date().toISOString(),
    members: unique.map(buildMember),
  }
  write(KEYS.groups, [...getGroups(), group])
  return group
}

/* ------------------------------------------------------------- expenses -- */

function getAllExpenses() {
  return read(KEYS.expenses, [])
}

/** Live expenses for a group, newest first. Soft-deleted records never leave here. */
export function getExpenses(groupId) {
  return getAllExpenses()
    .filter((expense) => expense.groupId === groupId && !expense.isDeleted)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

export function addExpense({
  groupId,
  description,
  amount,
  paidBy,
  participants,
  date,
  createdBy,
  category,
  splitMode,
  splits,
}) {
  const expense = {
    id: uid('exp'),
    groupId,
    description: String(description).trim(),
    amount: Number(amount),
    paidBy: normalizeEmail(paidBy),
    participants: participants.map(normalizeEmail),
    date,
    createdBy: normalizeEmail(createdBy),
    category: category || 'Other',
    createdAt: new Date().toISOString(),
    isDeleted: false,
  }

  // Only an unequal expense records amounts; an equal one stays derivable, so
  // it keeps splitting evenly if the group ever changes underneath it.
  if (splitMode === 'manual' && splits?.length) {
    expense.splitMode = 'manual'
    expense.splits = splits.map(({ email, cents }) => ({
      email: normalizeEmail(email),
      cents: Math.round(Number(cents) || 0),
    }))
  }

  write(KEYS.expenses, [...getAllExpenses(), expense])
  return expense
}

/** Soft delete — the record stays, balances simply stop counting it. */
export function deleteExpense(expenseId) {
  const updated = getAllExpenses().map((expense) =>
    expense.id === expenseId
      ? { ...expense, isDeleted: true, deletedAt: new Date().toISOString() }
      : expense,
  )
  write(KEYS.expenses, updated)
}
