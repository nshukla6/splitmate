# Splitmate API Specification

## Overview

Splitmate has **no custom backend server**. All data access goes through
**Supabase** (Postgres + auto-generated PostgREST API + Supabase Auth), reached
from the client via `@supabase/supabase-js`.

The application enforces a single boundary rule: **`src/data/storage.js` is
the only module allowed to query a Supabase table directly.** Every page and
component calls into `storage.js` (and, for auth, `AuthContext.jsx`) instead of
talking to Supabase itself.

This document describes that boundary as a conventional REST-style API
(GET/POST/PUT/DELETE) for clarity, since that's the actual contract the rest
of the app is written against. Each entry lists:
- **Method** — the closest REST verb for the operation
- **Resource** — a conceptual path (not a literal URL — see "How this maps to real HTTP calls" below)
- **Function** — the exact `storage.js` / `AuthContext.jsx` export to call
- **Request** — parameters/body shape
- **Response** — return shape
- **Auth / RLS** — who can call it and what the database enforces independently of application code
- **Errors** — what gets thrown and when

### How this maps to real HTTP calls

Under the hood, `supabase-js` turns each call into an HTTP request against
Supabase's own APIs:
- `supabase.from('<table>').select()/insert()/update()/delete()` → PostgREST,
  e.g. `GET/POST/PATCH/DELETE https://elcuoinxrcoxguopqsvf.supabase.co/rest/v1/<table>`
- `supabase.rpc('<fn>')` → `POST /rest/v1/rpc/<fn>`
- `supabase.auth.*` → Supabase's GoTrue auth server, e.g. `POST /auth/v1/token`, `/auth/v1/signup`, `/auth/v1/logout`

The app never constructs these URLs itself; they're entirely internal to the
`supabase-js` client. The verb/resource mapping in this document describes the
**logical** operation, not literal routes the app defines.

### Auth model

- Supabase Auth (email/password). A signed-in session is a JWT held by the
  `supabase-js` client and attached automatically to every request.
- **Row-Level Security (RLS)** is enabled on every table. This is enforced by
  Postgres itself, independent of anything in the JS layer:
  - `users` — a client can only ever `SELECT` its own row.
  - `groups`, `group_members`, `expenses`, `expense_participants`,
    `expense_splits`, `settlements` — a client only sees rows for groups it is
    a member of.
- `find_user_by_email` is a `SECURITY DEFINER` RPC (migration 020) — the one
  deliberate exception, letting a client resolve an arbitrary email to a
  registered user (name + id only) so group invites can recognize an already
  registered friend. It does not expose any other user data.
- Two mutations additionally assert ownership in application code
  (`assertIsGroupCreator` in `storage.js`), since RLS alone does not restrict
  *who within a group* may rename it or remove a member: `renameGroup` and
  `removeMember` throw unless the caller is the group's `created_by` user.

---

## Shared Data Types

```typescript
type UUID = string          // Postgres uuid, e.g. "a1b2c3d4-..."
type Email = string         // always normalized: trimmed + lowercased
type ISODateTime = string   // e.g. "2026-08-26T14:03:00.000Z"
type ISODate = string       // "YYYY-MM-DD"
type Cents = number         // integer, e.g. 1550 = $15.50

type Category =
  | 'Food & Drinks'
  | 'Transport'
  | 'Accommodation'
  | 'Activities'
  | 'Shopping'
  | 'Utilities'
  | 'Other'

type MemberStatus = 'active' | 'pending'

interface User {
  id: UUID                  // matches Supabase Auth user id
  name: string
  email: Email
  createdAt: ISODateTime
}

interface Member {
  email: Email               // key — not user id
  name: string
  status: MemberStatus       // 'pending' until they register
  userId: UUID | null        // null while pending
}

interface Group {
  id: UUID
  name: string
  createdBy: Email           // resolved from groups.created_by (uuid) via matching member row
  createdAt: ISODateTime
  members: Member[]
}

interface ExpenseSplit {
  email: Email
  cents: Cents
}

interface Expense {
  id: UUID
  groupId: UUID
  description: string
  amount: number             // dollars, e.g. 15.50 (converted from amount_cents)
  paidBy: Email
  participants: Email[]
  date: ISODate
  category: Category
  createdBy: Email
  createdAt: ISODateTime
  isDeleted: boolean
  notes?: string              // present only if set
  splitMode?: 'manual'         // absent = equal split
  splits?: ExpenseSplit[]      // present only if splitMode === 'manual'
}

interface Settlement {
  id: UUID
  groupId: UUID
  from: Email                 // who paid
  to: Email                   // who received
  cents: Cents
  createdBy: Email
  createdAt: ISODateTime
}

interface ExportRow {
  date: ISODate
  description: string
  category: Category
  amount: string               // pre-formatted currency string, e.g. "$15.50"
  paidBy: string                // display name, not email
  splitBetween: string          // display names joined "Alice, Bob, Carol"
  notes: string                 // "" if none
}

interface ApiError {
  message: string              // caught .message shown to the user via an Alert component
}
```

---

## Authentication API

Owned entirely by `src/context/AuthContext.jsx` — no other component calls
`supabase.auth.*` directly.

### `POST /auth/register`
Registers a new account and signs in.

- **Function:** `register({ name, email, password }): Promise<AuthResult>`
- **Request:**
  ```typescript
  { name: string, email: string, password: string }
  ```
- **Response:**
  ```typescript
  type AuthResult =
    | { ok: true, user: { id: UUID, name: string, email: Email } }
    | { ok: false, error: string }
  ```
- **Auth / RLS:** Public (no session required to call). Calls
  `supabase.auth.signUp`, then mirrors the new auth user into the `users`
  table (`syncLocalUser`) so group invites can resolve them by email.
- **Errors surfaced as `{ ok: false, error }`:** empty name, invalid email,
  empty password, "email already registered", or (if Supabase email
  confirmation is enabled) an explicit "confirm your email" message.

### `POST /auth/login`
- **Function:** `login(email: string, password: string): Promise<AuthResult>`
- **Request:** `email`, `password` as positional args.
- **Response:** same `AuthResult` shape as register.
- **Auth / RLS:** Public. Calls `supabase.auth.signInWithPassword`.
- **Errors:** "Incorrect email or password.", "Confirm your email before
  signing in.", or the raw Supabase error message as fallback.

### `POST /auth/logout`
- **Function:** `logout(): Promise<void>`
- **Request:** none.
- **Response:** none — clears the local session; call `supabase.auth.signOut`.
- **Auth / RLS:** Requires a session (no-op otherwise).

### `GET /auth/session`
- **Function:** `storage.getSessionUserId(): Promise<UUID | null>`
- **Response:** the signed-in user's id, or `null` if signed out.
- **Auth / RLS:** Reads the local Supabase session; no network round trip to
  a protected table.

---

## Users API

### `GET /users`
- **Function:** `storage.getUsers(): Promise<User[]>`
- **Response:** `User[]`
- **Auth / RLS:** RLS restricts this to the caller's own row — in practice
  this always returns an array of at most one `User`.

### `GET /users?email={email}`
Resolve an email to a registered account (used for invite previews).

- **Function:** `storage.findUserByEmail(email: string): Promise<User | null>`
- **Request:** `email: string` (normalized internally).
- **Response:** `User | null`
- **Auth / RLS:** Calls the `find_user_by_email` RPC (`SECURITY DEFINER`),
  the one endpoint allowed to look up another user's public info (id, name,
  email only) by email.

### `GET /users/{id}`
- **Function:** `storage.findUserById(id: UUID): Promise<User | null>`
- **Response:** `User | null`
- **Auth / RLS:** RLS-scoped — returns non-null only for the caller's own id.

### `POST /users`
Creates the `users` row for a just-registered/just-signed-in auth user.

- **Function:** `storage.createUser({ name, email }): Promise<User>`
- **Request:**
  ```typescript
  { name: string, email: Email }
  ```
- **Response:** `User`
- **Auth / RLS:** Requires an authenticated session; the row's `id` is taken
  from `supabase.auth.getUser()`, not from the request body.
- **Side effect:** flips any `group_members` rows with this email from
  `pending` → `active` (`activatePendingMemberships`).
- **Errors:** throws if called with no session (`"createUser requires an
  authenticated session"`).

---

## Groups API

### `GET /groups`
- **Function:** `storage.getGroups(): Promise<Group[]>`
- **Response:** `Group[]`, newest first (`created_at desc`).
- **Auth / RLS:** RLS restricts rows to groups the caller belongs to.

### `GET /groups/{id}`
- **Function:** `storage.getGroup(id: UUID): Promise<Group | null>`
- **Response:** `Group | null`
- **Auth / RLS:** `null` if the group doesn't exist or the caller isn't a
  member (RLS-enforced, indistinguishable from "not found").

### `GET /users/{email}/groups`
Derived, client-side filter — not a distinct query.

- **Function:** `storage.getGroupsForUser(email: string): Promise<Group[]>`
- **Response:** `Group[]` — the subset of `getGroups()` where `email` is a member.

### `POST /groups`
Creates a group and its initial member rows (creator + invitees) in one call.

- **Function:**
  `storage.createGroup({ name, creatorEmail, memberEmails }): Promise<Group>`
- **Request:**
  ```typescript
  { name: string, creatorEmail: Email, memberEmails?: Email[] }
  ```
- **Response:** `Group`
- **Auth / RLS:** Requires an authenticated session (`created_by` is taken
  from `supabase.auth.getUser()`). Each `memberEmails` entry is resolved
  against `users` — a match joins `active`, otherwise `pending` with a
  guessed display name (`nameFromEmail`).

### `PUT /groups/{id}`
Renames a group.

- **Function:** `storage.renameGroup(groupId: UUID, name: string): Promise<void>`
- **Request:** `name: string` (new group name; trimmed, must be non-empty).
- **Response:** `void`
- **Auth / RLS:** **Creator-only**, enforced in application code
  (`assertIsGroupCreator`) — RLS alone does not restrict this by member role.
- **Errors:** `"Give the group a name."` (empty name), `"Only the group's
  creator can rename this group."` (non-creator caller).

### `DELETE /groups/{id}/members/{email}`
Removes a member from a group.

- **Function:** `storage.removeMember(groupId: UUID, email: string): Promise<void>`
- **Response:** `void`
- **Auth / RLS:** **Creator-only**, enforced in application code
  (`assertIsGroupCreator`).
- **Errors:** `"Only the group's creator can remove members."` (non-creator
  caller); `"Cannot remove — member has existing expenses."` if the member is
  a payer or participant on any expense in the group, including soft-deleted
  ones (the DB foreign keys would otherwise reject the delete).

---

## Expenses API

### `GET /groups/{id}/expenses`
- **Function:** `storage.getExpenses(groupId: UUID): Promise<Expense[]>`
- **Response:** `Expense[]`, excluding soft-deleted rows
  (`is_deleted = false` filtered at the query level), sorted newest first
  (`date desc`, then `created_at desc`).
- **Auth / RLS:** RLS restricts to expenses of groups the caller belongs to.

### `POST /groups/{id}/expenses`
Creates an expense (also used to re-create one when "editing" — see note below).

- **Function:**
  ```typescript
  storage.addExpense({
    groupId: UUID,
    description: string,
    amount: number,          // dollars
    paidBy: Email,
    participants: Email[],
    date: ISODate,
    createdBy: Email,
    category?: Category,      // defaults to 'Other'
    notes?: string,
    splitMode?: 'manual',
    splits?: { email: Email, cents: Cents }[],
  }): Promise<Expense>
  ```
- **Response:** `Expense`
- **Auth / RLS:** RLS restricts inserts to groups the caller belongs to;
  Postgres check constraints additionally enforce `amount_cents > 0` and
  non-empty `description`.
- **Note — no dedicated edit endpoint:** there is no `PUT /expenses/{id}`.
  `GroupDetail.jsx`'s edit flow implements "edit" as
  `deleteExpense(old.id)` followed by `addExpense(newData)` — two calls, not
  an atomic update.

### `DELETE /expenses/{id}`
Soft-deletes an expense.

- **Function:** `storage.deleteExpense(expenseId: UUID): Promise<void>`
- **Response:** `void`
- **Auth / RLS:** RLS-scoped to the caller's groups. Sets `is_deleted = true`
  and `deleted_at = now()` — the row is never actually removed, so it can be
  recovered later and is excluded from `getExpenses()` and every balance
  calculation.

---

## Settlements API

### `GET /groups/{id}/settlements`
- **Function:** `storage.getSettlements(groupId: UUID): Promise<Settlement[]>`
- **Response:** `Settlement[]`, unfiltered/unsorted (all settlements ever recorded for the group).
- **Auth / RLS:** RLS-scoped to the caller's groups.

### `POST /groups/{id}/settlements`
Records that one member paid another to settle a balance.

- **Function:**
  ```typescript
  storage.addSettlement({
    groupId: UUID,
    from: Email,
    to: Email,
    cents: Cents,
    createdBy: Email,
  }): Promise<Settlement>
  ```
- **Response:** `Settlement`
- **Auth / RLS:** RLS-scoped to the caller's groups.
- **Note:** settlements are append-only — there is no update or delete
  endpoint; once recorded, a settlement cannot be edited or undone.

---

## Reports / Export API

Not Supabase calls directly — these compose the Expenses/Groups API above
into a report. Defined in `src/utils/groupExport.js`.

### `GET /groups/{id}/export`
Builds the full expense history for a group as structured rows.

- **Function:** `exportGroupHistory(groupId: UUID): Promise<ExportRow[]>`
- **Response:** `ExportRow[]`, sorted by `date` ascending (oldest first —
  the opposite order of `getExpenses()`), excluding soft-deleted expenses,
  with `paidBy`/`splitBetween` resolved to display names via the group's
  member list (falls back to the raw email if a member was since removed).
- **Auth / RLS:** Inherits the RLS restrictions of `getGroup`/`getExpenses`.

### `GET /groups/{id}/export/csv`
Triggers a client-side CSV file download — a UI side effect, not a value the
caller consumes.

- **Function:**
  `downloadGroupHistory(groupId: UUID, groupName: string): Promise<void>`
- **Response:** `void`. As a side effect, builds a CSV (header:
  `Date,Description,Category,Amount,Paid By,Split Between,Notes`, values
  RFC 4180-escaped) from `exportGroupHistory(groupId)` and downloads it via a
  `Blob` + temporary `<a download>` element.
- **Filename:** `` splitmate-{slug}-history.csv `` where `slug` is
  `groupName` lowercased, whitespace collapsed to hyphens, and any character
  outside `a-z0-9-` stripped (falls back to `"group"` if that leaves nothing).

---

## Error Handling Summary

- Supabase call failures: `storage.js`'s internal `unwrap({ data, error })`
  helper throws the raw Supabase/Postgres error whenever `error` is set (e.g.
  a check-constraint violation, a foreign-key violation, an RLS rejection).
- Explicit validation errors: thrown as plain `Error` objects with a
  human-readable `.message` (e.g. `"Give the group a name."`).
- Every caller in the page layer wraps these calls in `try/catch` and
  displays `err.message` via the shared `Alert` component — there is no
  centralized error-response envelope; the thrown error's `.message` **is**
  the API's error response.
