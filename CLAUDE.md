# Splitmate — Developer Guide

A lightweight expense-splitting app for groups. Track who paid what, who owes whom, and settle up fairly.

## Tech Stack

- **Framework:** React 19 with Vite
- **Routing:** React Router 7
- **Styling:** Tailwind CSS 4 (via @tailwindcss/vite) with custom theme variables
- **State:** React Context + Supabase (Postgres + Auth), no localStorage
- **Data Persistence:** Supabase Postgres, all reads/writes async via `@supabase/supabase-js` (project "SM Website", `elcuoinxrcoxguopqsvf`)
- **Auth:** Supabase Auth (email/password), session persisted by the SDK itself
- **Build Tool:** Vite 8
- **Linting:** oxlint

## Project Structure

```
src/
├── main.jsx                 # Entry point (BrowserRouter + AuthProvider setup)
├── App.jsx                  # Route definitions
├── index.css                # Tailwind + custom design tokens
├── components/              # Reusable UI components
│   ├── AddExpenseModal.jsx  # Modal to add/edit expenses (with category support)
│   ├── AppShell.jsx         # Layout wrapper for authenticated pages
│   ├── AuthLayout.jsx       # Layout for auth pages (login/register)
│   ├── Avatar.jsx           # User avatar with initials
│   ├── Logo.jsx             # Logo component
│   ├── RequireAuth.jsx      # Route guard & auth provider wrapper
│   ├── SplitBar.jsx         # Visual bar chart of expense splits
│   ├── Wordmark.jsx         # Splitmate wordmark
│   └── ui.jsx               # Base UI primitives (Button, Field, Alert, etc.)
├── pages/                   # Page-level components (one per route)
│   ├── Landing.jsx          # Marketing page (/)
│   ├── Login.jsx            # Login form (/login)
│   ├── Register.jsx         # Signup form (/register)
│   ├── Dashboard.jsx        # Group list (/dashboard)
│   ├── CreateGroup.jsx      # New group form (/group/new)
│   ├── GroupDetail.jsx      # Group expense list & settlement (/group/:id)
│   └── GroupSettings.jsx    # Rename group, remove members (/group/:id/settings, creator-only)
├── context/                 # React Context providers
│   ├── auth-context.js      # AuthContext definition (hook + context object)
│   └── AuthContext.jsx      # AuthProvider component (login/register/logout)
├── data/
│   ├── supabaseClient.js    # Supabase client instance (reads VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)
│   └── storage.js           # Centralized Supabase data API (all CRUD, async) — only module that queries tables
├── utils/                   # Pure utility functions
│   ├── balances.js          # Expense split calculation (who owes whom)
│   ├── money.js             # Currency formatting + cent/dollar conversion
│   └── palette.js           # Color assignment for group members
└── hooks/                   # Custom React hooks (currently empty)
```

## Data Models

All data lives in Supabase Postgres (project **SM Website**, ref `elcuoinxrcoxguopqsvf`, `public` schema). Every table has row-level security enabled — a client only ever sees rows for groups/expenses it belongs to, and `users` only ever returns its own row (see `find_user_by_email` RPC note below). `storage.js` maps these rows to the JS shapes below; nothing outside `storage.js` queries a table directly.

### Tables

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id` (uuid, = `auth.users.id`), `name`, `email` (citext, unique), `created_at` | One row per registered account, created on first login/register |
| `groups` | `id` (uuid), `name`, `created_by` (uuid → `users.id`), `created_at` | |
| `group_members` | PK `(group_id, email)`, `name`, `status` (`active`\|`pending`), `user_id` (nullable), `joined_at` | Keyed by **email**, not user id — pending invites persist across registration |
| `expenses` | `id` (uuid), `group_id`, `description`, `amount_cents` (int), `paid_by` (citext), `date`, `category`, `created_by` (citext), `created_at`, `is_deleted`, `deleted_at`, `notes`, `split_mode` (`'manual'`\|null) | Amounts stored as integer cents; `storage.js` converts to/from dollars |
| `expense_participants` | PK `(expense_id, email)`, `group_id` | Who shares an expense |
| `expense_splits` | PK `(expense_id, email)`, `group_id`, `cents` | Only populated when `split_mode = 'manual'` |
| `settlements` | `id` (uuid), `group_id`, `from_email`, `to_email`, `cents`, `created_by`, `created_at` | One row per "settle up" payment; folded into `netBalances()` alongside expenses |

### User (JS shape from `storage.js`)
```javascript
{
  id,                     // uuid, matches Supabase Auth user id
  name,                   // string
  email,                  // normalized lowercase
  createdAt               // ISO string
}
```
No `password` field — auth (including credential storage) is handled entirely by Supabase Auth, not this table.

### Group
```javascript
{
  id,                     // uuid
  name,                   // string
  createdBy,              // email (resolved from created_by uuid via matching member row)
  createdAt,              // ISO string
  members: [
    {
      email,              // normalized lowercase, used as key
      name,               // string (updated when user registers)
      status,             // 'active' | 'pending' (pending = invited but not registered)
      userId              // user id when active, null when pending
    }
  ]
}
```

### Expense
```javascript
{
  id,                     // uuid
  groupId,                // group id
  description,            // string
  amount,                 // number (dollars, e.g. 15.50 — converted from amount_cents)
  paidBy,                 // email of payer
  participants,           // array of emails who share this expense
  date,                   // YYYY-MM-DD string
  category,               // 'Food & Drinks' | 'Transport' | 'Accommodation' | 'Activities' | 'Shopping' | 'Utilities' | 'Other'
  createdBy,              // email of who created it
  createdAt,              // ISO string
  isDeleted,              // boolean (soft delete)
  notes,                  // string, only present if set

  // Only for unequal splits:
  splitMode,              // 'manual' (absent = equal split)
  splits: [
    { email, cents }      // exact amount per person (cents)
  ]
}
```

### Settlement
```javascript
{
  id,                     // uuid
  groupId,                // group id
  from,                   // email of who paid
  to,                     // email of who received
  cents,                  // amount settled, in cents
  createdBy,              // email of who recorded it
  createdAt               // ISO string
}
```

## Routes & Page Flows

### Public Routes
- `/` — Landing page (marketing)
- `/login` — Login form
- `/register` — Signup form

### Protected Routes (behind RequireAuth)
- `/dashboard` — List of groups user is in
- `/group/new` — Create a new group
- `/group/:id` — View group expenses and balances
- `/group/:id/settings` — Rename the group and remove members; creator-only (others get a locked-out message)

RequireAuth redirects to `/login` if not signed in and wraps the page in AppShell.

## Key Conventions

### Naming
- **Components:** PascalCase (e.g., `AddExpenseModal.jsx`)
- **Pages:** PascalCase (e.g., `GroupDetail.jsx`)
- **Utils/Hooks:** camelCase (e.g., `balances.js`)
- **Context API:** Named exports (e.g., `useAuth()` hook)

### Styling
- **Utility-first:** Use Tailwind classes; minimal custom CSS in index.css
- **Color tokens:** All colors are CSS custom properties (--color-*) defined in @theme block of index.css
- **Responsive:** Use Tailwind's `sm:`, `lg:` prefixes for breakpoints
- **Focus:** Auto-applied outline via :focus-visible in index.css

### State Management
- **Auth:** Stored in AuthContext, backed by Supabase Auth (`AuthContext.jsx` is the only place that calls `supabase.auth.*`)
- **Page state:** Local useState in each page component (no external store needed)
- **Persistence:** All reads/writes go through `storage.js`, which is **async** (every function returns a Promise) — pages load data in `useEffect` + `useState`, not at render time
- **No client cache:** Components refetch from Supabase and refresh manually via `refresh()`/`load()` callbacks; nothing is cached across navigations

### Storage API
All Supabase table access goes through `src/data/storage.js` (async — every call returns a Promise):
- `getUsers()`, `findUserByEmail()` (via `find_user_by_email` RPC — see below), `findUserById()`, `createUser()`
- `getSessionUserId()`, `setSessionUserId()` (no-op, Supabase Auth persists sessions itself), `clearSession()`
- `getGroups()`, `getGroup()`, `getGroupsForUser()`, `createGroup()`, `renameGroup(groupId, name)`, `removeMember(groupId, email)` (throws if the member has any expenses — as payer or participant — in the group)
- `getExpenses()`, `addExpense()`, `deleteExpense()` (soft delete)
- `getSettlements(groupId)`, `addSettlement({ groupId, from, to, cents, createdBy })`
- Utility: `normalizeEmail()`, `nameFromEmail()`, `seed()` (no-op now — data is central in Supabase, nothing to bootstrap client-side)

### Auth & Supabase Setup
- `src/data/supabaseClient.js` creates the client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (in `.env`, gitignored) via `@supabase/supabase-js`
- `AuthContext.jsx` wraps Supabase Auth (`signInWithPassword`, `signUp`, `signOut`, `onAuthStateChange`) and mirrors every signed-in auth user into the `users` table via `syncLocalUser`, so group invites can resolve them by email
- RLS scopes every table to the signed-in user; `findUserByEmail` can't select other users' rows directly, so it calls the `find_user_by_email` SECURITY DEFINER RPC (migration 020) instead — this is what lets inviting an already-registered friend recognize them immediately instead of leaving them 'pending'
- Supabase project: **SM Website** (`elcuoinxrcoxguopqsvf`, `ap-northeast-1`) — manage via the `supabase` MCP server (configured in `.mcp.json`)

### Development Workflow
1. Run `npm run dev` — Vite dev server on localhost:5173+
2. Run `npm run build` — Production build to ./dist
3. Run `npm run lint` — oxlint check
4. Branch convention: Feature branches off `main` (e.g., `expense_category`)

### Feature: Categories
- Added to expenses, displayed as violet badge tags in expense rows
- 7 predefined categories + "Other" (default)
- Only show category tag if not "Other"
- Editable via the Add/Edit Expense modal
- Category stored on each expense record for persistence

### Feature: Settlements
- "Settle up" button next to each suggested payment in GroupDetail's balance summary
- Recording a settlement writes a `settlements` row and is folded into `netBalances()` (from-payer's balance moves up, to-payee's moves down) alongside expenses
- Settlements are never edited or deleted once recorded — no undo yet

### Feature: Group Settings
- `/group/:id/settings`, linked from a gear icon next to "Add expense" — visible only to the group's creator
- Rename the group (`storage.renameGroup`)
- Remove a member (`storage.removeMember`) — blocked with a friendly error if that member is a payer or participant on any expense in the group (including soft-deleted ones), since the DB foreign keys would otherwise reject the delete

### Design System
- **Primary color:** Violet (#5B2BE6)
- **Success:** Green (#0B7A52) — used for "owed to you"
- **Alert:** Red (#C22B52) — used for "you owe"
- **Neutral:** Grays (ink, ink-soft, ink-faint)
- **Backgrounds:** paper (page bg), surface (card bg), line (borders)
- **Fonts:** Bricolage Grotesque (display), Instrument Sans (body), Martian Mono (mono)

### Testing Data
Test accounts now live in Supabase Auth + the `users` table (not client-seeded — `seed()` is a no-op):
- Shubham (shubham@test.com) — password: "password"
- Bob (bob@test.com) — password: "password"
- Rahul (rahul@test.com) — password: "password"
- Eva (eva@test.com) — password: "password"

## Key Implementation Details

### Email Handling
- All emails normalized to lowercase via `normalizeEmail()` before storage
- Members keyed by email (not user ID) so pending invites persist across registration

### Expense Splits
- Default: equal split across all participants
- Unequal split: set splitMode='manual' with splits array of {email, cents}
- Balances calculated on-the-fly via `groupBalance(members, expenses, settlements)` in utils/balances.js — `netBalances()`/`balanceForMember()` take the same optional `settlements` array (default `[]`)

### Soft Deletes
- Expenses marked `is_deleted: true` (+ `deleted_at`) instead of removed
- `getExpenses()` filters `is_deleted = false` at the query level
- Allows undo/recovery in future without data loss

### Forms & Validation
- Client-side validation in handlers before calling the (async) storage API
- Server-side constraints also enforced by Postgres check constraints (e.g. `amount_cents > 0`, non-empty `name`/`description`, `status` enum) — a caught error's `.message` is what gets shown to the user
- Error states stored in local component state, displayed via Alert components

## Common Tasks

### Add a new page
1. Create `src/pages/MyPage.jsx`
2. Add route in `src/App.jsx`
3. Wrap in `<RequireAuth>` if protected
4. Use `useAuth()` hook to access user

### Add a new component
1. Create `src/components/MyComponent.jsx`
2. Export as default
3. Use Tailwind classes for styling
4. No local storage reads — pass data as props

### Modify data model
1. Add/alter the column via a Supabase migration (through the `supabase` MCP server or SQL editor) — include a default so existing rows aren't broken
2. Update the JSDoc shape comment at the top of `storage.js`
3. Update the relevant `toX()` mapper and `addX`/`createX` function in `storage.js` to read/write the new field
4. Read with `?.` optional chaining where needed on the JS side

### Styling tips
- Check `src/index.css` for available color + font tokens
- Use Tailwind's bg-*, text-*, border-* utilities
- Dark mode: Not implemented yet (fully light theme)
- Animations: Check Tailwind for built-in classes (scale, opacity, etc.)
### Commit and Push tips
- Please do not commit or push changes without my approval


---

**Last updated:** August 2026  
**Branch:** main  
**Feature branches:** expense_category (category support added; also migrated storage from localStorage to Supabase — Postgres + Auth + RLS)
