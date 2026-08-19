# Splitmate

Shared expenses for a group — who paid, who shared, and the fewest payments
that clear the balance.

All data lives in the browser's `localStorage`. There is no backend, no server,
and no network calls for data. Supabase comes later.

## Running it

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
npm run lint
```

## Test accounts

Created automatically the first time the app loads. The password for all four
is `password`.

| Email              |
| ------------------ |
| shubham@test.com   |
| bob@test.com       |
| rahul@test.com     |
| eva@test.com       |

To start over, clear the `splitmate.*` keys in `localStorage` and reload.

## How it is put together

```
src/
  data/storage.js        the ONLY module that touches localStorage
  context/               all authentication logic
  utils/                 balance engine, money maths, member colours
  components/            shell, modal, split bar, avatars, primitives
  pages/                 landing, login, register, dashboard, group pages
```

**Storage boundary.** Every read and write goes through `src/data/storage.js`.
Nothing else in the app references `localStorage`.

**Auth.** `AuthContext` owns seeding, register, login, session restore, and
logout. Passwords are compared in plain text — this build is local only.

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
