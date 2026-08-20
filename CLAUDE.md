# Splitmate — Developer Guide

A lightweight expense-splitting app for groups. Track who paid what, who owes whom, and settle up fairly.

## Tech Stack

- **Framework:** React 19 with Vite
- **Routing:** React Router 7
- **Styling:** Tailwind CSS 4 (via @tailwindcss/vite) with custom theme variables
- **State:** React Context + localStorage (no external DB)
- **Data Persistence:** localStorage (all state persisted under `splitmate.*` keys)
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
│   └── GroupDetail.jsx      # Group expense list & settlement (/group/:id)
├── context/                 # React Context providers
│   ├── auth-context.js      # AuthContext definition (hook + context object)
│   └── AuthContext.jsx      # AuthProvider component (login/register/logout)
├── data/
│   └── storage.js           # Centralized localStorage API (all CRUD operations)
├── utils/                   # Pure utility functions
│   ├── balances.js          # Expense split calculation (who owes whom)
│   ├── money.js             # Currency formatting + cent/dollar conversion
│   └── palette.js           # Color assignment for group members
└── hooks/                   # Custom React hooks (currently empty)
```

## Data Models

All data lives in localStorage under these keys: `splitmate.users`, `splitmate.groups`, `splitmate.expenses`, `splitmate.session`.

### User
```javascript
{
  id,                     // uid('usr')
  name,                   // string
  email,                  // normalized lowercase
  password,               // plain text (local-only, not production)
  createdAt               // ISO string
}
```

### Group
```javascript
{
  id,                     // uid('grp')
  name,                   // string
  createdBy,              // email (creator's email)
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
  id,                     // uid('exp')
  groupId,                // group id
  description,            // string
  amount,                 // number (dollars, e.g. 15.50)
  paidBy,                 // email of payer
  participants,           // array of emails who share this expense
  date,                   // YYYY-MM-DD string
  category,               // 'Food & Drinks' | 'Transport' | 'Accommodation' | 'Activities' | 'Shopping' | 'Utilities' | 'Other'
  createdBy,              // email of who created it
  createdAt,              // ISO string
  isDeleted,              // boolean (soft delete)
  
  // Only for unequal splits:
  splitMode,              // 'manual' (absent = equal split)
  splits: [
    { email, cents }      // exact amount per person (cents)
  ]
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
- **Auth:** Stored in AuthContext (user, login, register, logout)
- **Page state:** Local useState in each page component (no external store needed)
- **Persistence:** Direct localStorage API via `storage.js`
- **No re-renders needed:** Components read from storage and refresh manually via `useState` + callback

### Storage API
All localStorage reads/writes go through `src/data/storage.js`:
- `getUsers()`, `findUserByEmail()`, `findUserById()`, `createUser()`
- `getSessionUserId()`, `setSessionUserId()`, `clearSession()`
- `getGroups()`, `getGroup()`, `getGroupsForUser()`, `createGroup()`
- `getExpenses()`, `addExpense()`, `deleteExpense()` (soft delete)
- Utility: `normalizeEmail()`, `nameFromEmail()`, `seed()` (test accounts)

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

### Design System
- **Primary color:** Violet (#5B2BE6)
- **Success:** Green (#0B7A52) — used for "owed to you"
- **Alert:** Red (#C22B52) — used for "you owe"
- **Neutral:** Grays (ink, ink-soft, ink-faint)
- **Backgrounds:** paper (page bg), surface (card bg), line (borders)
- **Fonts:** Bricolage Grotesque (display), Instrument Sans (body), Martian Mono (mono)

### Testing Data
On first app load, `seed()` creates 4 test accounts (if not already seeded):
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
- Balances calculated on-the-fly via `groupBalance()` in utils/balances.js

### Soft Deletes
- Expenses marked `isDeleted: true` instead of removed
- Balances exclude deleted expenses automatically
- Allows undo/recovery in future without data loss

### Forms & Validation
- Client-side only (no server)
- Validation in handlers before calling storage API
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
1. Update JSDoc shape in `storage.js`
2. Update addExpense/createUser/etc. to handle new field
3. Set a sensible default (old records won't have it)
4. Read with `?.` optional chaining where needed

### Styling tips
- Check `src/index.css` for available color + font tokens
- Use Tailwind's bg-*, text-*, border-* utilities
- Dark mode: Not implemented yet (fully light theme)
- Animations: Check Tailwind for built-in classes (scale, opacity, etc.)

---

**Last updated:** August 2026  
**Branch:** main  
**Feature branches:** expense_category (category support added)
