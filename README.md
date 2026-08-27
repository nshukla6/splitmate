# Splitmate

Shared expenses for a group — who paid, who shared, and the fewest payments
that clear the balance.

Data lives in Supabase (Postgres + Auth), reached through
`@supabase/supabase-js`. Every table has row-level security enabled, so a
client only ever sees the groups and expenses it belongs to.

## Running it

Needs a `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
for the Supabase project (see `src/data/supabaseClient.js`).

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
npm run lint
```

## Test accounts

Already seeded in the Supabase project (Auth + the `users` table), not
created client-side. The password for all four is `password`.

| Email              |
| ------------------ |
| shubham@test.com   |
| bob@test.com       |
| rahul@test.com     |
| eva@test.com       |

## How it is put together

```
src/
  data/supabaseClient.js  the Supabase client instance (env-configured)
  data/storage.js         the ONLY module that queries Supabase tables
  context/                all authentication logic
  utils/                  balance engine, money maths, member colours
  components/             shell, modal, split bar, avatars, primitives
  pages/                  landing, login, register, dashboard, group pages
```

**Storage boundary.** Every read and write goes through `src/data/storage.js`,
and every function there is async. Nothing else in the app queries Supabase
directly.

**Auth.** `AuthContext` wraps Supabase Auth (`signInWithPassword`, `signUp`,
`signOut`, session restore via `onAuthStateChange`) and mirrors each signed-in
user into the `users` table so group invites can resolve them by email.
Credentials never touch app code — Supabase Auth handles that entirely.

**Members are keyed by email, not by user id.** Someone can be added to a group
before they have an account; they join as `pending` and keep their place in
every expense. When they register, `createUser` flips those memberships to
`active` and attaches their real name.

**Balances are never stored.** `utils/balances.js` recomputes from the expense
list on every render. Deleting an expense is a soft delete (`isDeleted: true`,
the record stays), so the calculation simply stops counting it.

**Settlement.** Net positions are reduced to the fewest payments by repeatedly
matching the largest debtor against the largest creditor. Each payment fully
settles at least one person, so a group of N needs at most N-1 transfers rather
than one per expense. Money is reasoned about in cents and uneven splits
distribute the odd pennies, so shares always add back to the total.
