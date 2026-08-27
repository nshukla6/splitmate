# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + Vite, React Router 7, Tailwind CSS 4. State via React Context + localStorage (no backend database). Client-side only; all data persisted locally under `splitmate.*` keys.

## Users

Friends or informal groups splitting expenses during trips, outings, or shared events. Users need to quickly track who paid what and see settlement amounts without friction.

## Product Purpose

Splitmate makes it fast and frictionless to track group expenses and calculate fair splits. Success means: add an expense in seconds, assign participants, and immediately see who owes whom.

## Positioning

Lightweight, local-first expense splitter with no signup overhead. All data stays on the user's device; no account creation required for invited members to use a shared group (pending invites persist via email).

## Operating Context

- **Workflow:** Create a group → invite members → add expenses as they happen → review balances → settle up
- **Participants:** Can range from 2–10+ people per group
- **Expense tracking:** Supports equal or manual splits across participants; filterable by category
- **Settlement:** Shows net balances (who owes whom and how much) to help coordinate payments

## Capabilities and Constraints

**Supported:**
- Create groups and invite members by email
- Add expenses with amount, description, date, payer, and participants
- Categorize expenses (Food & Drinks, Transport, Accommodation, Activities, Shopping, Utilities, Other)
- Manual split mode for unequal divisions (by exact cents per person)
- View group balances and settlement amounts
- Soft-delete expenses (not fully removed, allows recovery)

**Technical constraints:**
- localStorage persistence only; no cloud sync or multi-device
- Client-side validation; no backend enforcement
- Plain text passwords stored locally (not production-grade security)
- No authentication server; credentials checked against local user store
- Single-user session per browser

## Brand Commitments

- **Primary color:** Violet (#5B2BE6)
- **Success/positive state:** Green (#0B7A52) for "owed to you"
- **Alert/negative state:** Red (#C22B52) for "you owe"
- **Typefaces:** Bricolage Grotesque (display), Instrument Sans (body), Martian Mono (mono)
- **Voice:** Clear, direct, helpful; supports users in completing a task efficiently
- **Name:** Splitmate (one word, lowercase when unhighlighted)

## Evidence on Hand

- Working app with test data (4 preseeded accounts: shubham, bob, rahul, eva)
- Design system tokens and component library defined in Tailwind config and index.css
- Landing page, auth flows (login/register), group list, group detail with expense management
- Category field recently added and integrated into expense tracking UI

## Product Principles

1. **Frictionless entry:** Adding an expense should feel instant; minimize required fields and confirmation steps.
2. **Transparency:** Every user sees the complete picture: who paid, who participated, and the settlement math.
3. **Local & private:** User data never leaves their device; no tracking, sync, or central account required.
4. **Fair by default:** Equal splits work out of the box; manual mode handles special cases without complexity.
5. **Recovery, not destruction:** Soft deletes and local storage allow users to undo and restore without risk.
