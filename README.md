# Rental Kanban

A lightweight, code-access kanban board for tracking rental applications.
No accounts — anyone with the board code (or a link containing it) can
view and edit the board. Built to be usable one-handed on a phone while
standing outside a listing.

## Features

- Shareable board via a short code — either a random one (e.g. `PK7F2X`)
  or a custom one you pick yourself, checked for availability before creation
- Configurable pipeline stages (defaults: Contacted, Heard back, Tour
  scheduled, Toured, Applying) — rename, add, remove, or reorder anytime
- Drag-and-drop between stages, gated behind an explicit Edit mode so
  tapping a card on mobile always opens its details instead of starting a drag
- Per-property notes and property name in a tap-to-expand detail view
- Mobile-first responsive layout

## Tech stack

- [Next.js](https://nextjs.org) (App Router) — frontend and API routes, no separate backend server
- [Supabase](https://supabase.com) (Postgres) — free-tier database
- [`@hello-pangea/dnd`](https://github.com/hello-pangea/dnd) — drag and drop
- [Vercel](https://vercel.com) — free-tier hosting

## Running locally

### Try it with zero setup

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/demo` — this renders the board against static
mock data (`lib/mockData.js`), no Supabase project required. Drag cards,
open the detail sheet, edit stages — all changes are in-memory React state
and reset on refresh. This is the fastest way to see the UI working and to
poke at `components/Board.jsx` before touching the database.

### Full setup (with a real database)

**Prerequisites:** Node.js 18.18+, and a free [Supabase](https://supabase.com) project.

```bash
git clone <this-repo>
cd rental-kanban
npm install
cp .env.example .env.local
```

In your Supabase project's SQL editor, run the migrations in `migrations/`
**in order** (`0001_init.sql`, `0002_...`, etc.) — this creates the tables,
enables Row Level Security, and seeds a demo board (code `DEM042`). Then
fill in `.env.local` with your Supabase project URL and **service role
key** (Project Settings → API — not the anon key; see "Security model"
below for why).

```bash
npm run dev
```

Visit `http://localhost:3000/b/DEM042`.

### Tests

```bash
npm test
```

## Security model

Tables have Row Level Security enabled with **no policies attached** —
this is deliberate, not an oversight. It means the `anon` and
`authenticated` Postgres roles get zero access to `boards`, `stages`, and
`prospects`, full stop.

Access instead works like this: the Next.js API routes hold the
`SUPABASE_SERVICE_ROLE_KEY` (server-only, never shipped to the browser),
which bypasses RLS entirely. Every route checks the board code against the
database itself (`lib/db.js` → `getBoardByCode`) before touching any data.
That check — not a SQL policy — is what enforces "you need the code to see
this board."

A SQL policy can only see what the database connection itself proves (e.g.
"this is the `anon` role"), not a value a client happens to send in a
request — there's no way to write a policy that means "only if the caller
knows this specific board's code." Locking `anon`/`authenticated` out
entirely and funneling all access through server code that does the real
check is the correct shape for this access model.

Because a board code is a shared secret rather than a per-user credential,
avoid logging it in analytics or error messages — treat it like a
password.

**Implication:** never import `lib/db.js` into a client component, and
never expose `SUPABASE_SERVICE_ROLE_KEY` as a `NEXT_PUBLIC_` variable —
either would hand out a key that bypasses every protection this app has.

## Database migrations

Schema changes are tracked as numbered files in `migrations/`:

```
migrations/
  0001_init.sql   -- tables, indexes, RLS, seed data
  0002_...sql
  ...
```

When you need a schema change, add `migrations/000N_description.sql` with
just that change and run it in the Supabase SQL editor. Back up your data
(Supabase dashboard → Database → Backups, or `pg_dump`) before any
destructive change — the free tier doesn't do this automatically.

## Deployment

Deployed on [Vercel](https://vercel.com)'s free tier. Connect this repo,
add the same environment variables from `.env.local` in the project
settings, and every push to `main` deploys automatically.

## License

Personal project, no license specified.
