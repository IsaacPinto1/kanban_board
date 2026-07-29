# Rental Application Kanban — Design Document

Status: Draft v1 (MVP scope)
Audience: engineers/LLMs implementing this project. This doc is the source of truth for scope decisions; implementation details not specified here are left to the implementer's judgment but should stay consistent with the principles below.

## 1. Purpose

A personal tool to track rental applications as they move through a pipeline (contacted → applying), with lightweight sharing via a link/code instead of full user accounts. Single board per "tenant" for now; multi-board is a natural extension but not required for MVP.

## 2. Scope

### 2.1 In scope (MVP)
- One shared **board** containing **prospects** (rental listings you're pursuing).
- **Code-based access**: anyone with the board's link (which embeds a code) or who manually enters the code can view and edit the board. No accounts, no passwords, no per-user permissions.
- Board view: columns = **stages**, cards = **prospects**.
- Card (collapsed) shows: **address** only.
- Card (expanded / detail view): **property name** + **freeform notes** (plain text, user-authored). Opened by tapping/clicking the card.
- **Edit mode**: an explicit "Edit" toggle above the board. Only in edit mode can cards be dragged between/within stages. Outside edit mode, tapping a card opens the detail view instead of starting a drag. This avoids drag-vs-tap ambiguity on touch devices.
- **Stages are configurable**: default seed is `Contacted`, `Heard back`, `Tour scheduled`, `Toured`, `Applying`, but the data model must make renaming, reordering, adding, and removing stages trivial (i.e., stages are rows in a table, not an enum baked into code).
- **Mobile-first responsive frontend**. This is a hard requirement, not a nice-to-have — most usage will be on a phone while at a property or checking email.

### 2.2 Explicitly out of scope for MVP
- Fine-grained sharing / permissions (view-only links, per-person access, revocation) — noted as a future iteration on top of the code-access model.
- Map view (see §7, kept as a documented extension point).
- Auth accounts / login / password recovery.
- Email scanning / auto-populating prospects.
- Address geocoding, photos, or any external API enrichment.
- Multi-board support (schema should not actively prevent it, but no UI for it now).

## 3. Access model

- A **board** has a unique, unguessable **code** (e.g. a random slug like `f7k2-plum-otter`, or a shorter random token — exact format is an implementation detail, but it must not be sequential/guessable like an incrementing integer).
- The shareable **link** is simply `https://<app>/b/<code>`. Visiting it grants full read/write access to that board. No cookie/session state is required to *view*— the code in the URL is the credential.
- The app should also support manual code entry (a simple form: "Enter board code") for cases where someone has the code but not the link, landing on the same `/b/<code>` route after submission.
- Optionally, once a code has been entered, store it in `localStorage` (or a cookie) purely as a UX convenience (auto-redirect to last board) — this is not a security boundary, just a shortcut.
- Because this is a shared secret rather than a per-user credential, **do not** log the code in analytics, error messages, or anywhere it'd leak. Treat it like a password.
- **Future extension (not MVP):** layer on real accounts + per-link roles (viewer/editor), similar to Google Docs sharing. The schema should be able to grow into this — e.g. by later adding a `board_members` or `share_links` table — without a rewrite. Concretely, this means: don't hardcode "the code" as the only column that ever identifies board access; keep it as one row in a future `access_methods`-shaped concept rather than a special column on `boards` if that's easy to arrange. For MVP, a single `code` column on `boards` is fine — just avoid scattering "check the code" logic all over the codebase; centralize it in one auth-check function so it's easy to swap later.

## 4. Data model

Relational schema (Postgres via Supabase, or SQLite via Turso — either works; see §8):

```
boards
  id            uuid or serial, PK
  code          text, unique, indexed        -- the shareable secret
  name          text                          -- e.g. "My 2026 apartment search"
  created_at    timestamp

stages
  id            uuid or serial, PK
  board_id      FK -> boards.id
  name          text                          -- e.g. "Contacted"
  color         text                          -- hex or token, used for card/column accent AND future map pins
  sort_order    integer                       -- controls left-to-right column order
  created_at    timestamp

prospects
  id            uuid or serial, PK
  board_id      FK -> boards.id
  stage_id      FK -> stages.id
  address       text, required                -- shown on collapsed card
  property_name text, nullable                -- shown in expanded view
  notes         text, nullable                -- freeform, user-authored
  sort_order    integer                       -- position within its stage/column
  lat           double precision, nullable     -- unused in MVP; reserved for map view
  lng           double precision, nullable     -- unused in MVP; reserved for map view
  created_at    timestamp
  updated_at    timestamp
```

Notes:
- `stages.sort_order` and `prospects.sort_order` are plain integers (gaps of e.g. 1000 between initial values recommended) so reordering means updating one row's order value, not renumbering everything.
- `lat`/`lng` are included now even though unused, so the map extension (§7) doesn't require a schema migration later — cheap to add now, annoying to backfill later.
- Deleting a stage: decide (at implementation time) whether prospects in a deleted stage move to a default stage or block deletion if non-empty. Recommend: block deletion (or require confirmation) if the stage has prospects, to avoid silent data loss.

## 5. API surface

Implementation is Next.js API routes (see prior conversation — no separate Express server needed for this scope). All routes are scoped by board code.

```
GET    /api/boards/[code]                     -> board + stages + prospects (everything needed to render)
POST   /api/boards                            -> create a new board (name) -> returns generated code
PATCH  /api/boards/[code]                     -> rename board

GET    /api/boards/[code]/stages              -> list stages
POST   /api/boards/[code]/stages              -> create stage (name, color)
PATCH  /api/boards/[code]/stages/[stageId]    -> rename / recolor / reorder stage
DELETE /api/boards/[code]/stages/[stageId]    -> delete stage (see deletion note above)

POST   /api/boards/[code]/prospects                    -> create prospect (address, stage_id)
PATCH  /api/boards/[code]/prospects/[prospectId]        -> update address/property_name/notes/stage_id/sort_order
DELETE /api/boards/[code]/prospects/[prospectId]        -> delete prospect
```

A drag-and-drop move is just a `PATCH` on the prospect updating `stage_id` and `sort_order`.

Every route must verify the `code` in the URL matches a real board before touching data — this is the single centralized auth check referenced in §3.

## 6. Frontend structure

- **Board view** (default `/b/[code]` route): horizontally scrollable columns (one per stage, in `sort_order`), each showing its prospects as cards stacked vertically.
  - Mobile: columns scroll horizontally (snap-scroll recommended so one column roughly fills the viewport width); cards are full-width within their column and tap-friendly (generous hit targets, no hover-dependent affordances).
  - Card (collapsed): address text only, plus a small color accent tied to the stage.
- **Edit mode toggle**: a button/switch above the board ("Edit layout" or similar). When on:
  - Cards become draggable (drag-and-drop within and across columns).
  - Tapping a card does *not* open the detail view while in edit mode (avoids conflicting gestures).
  - Stage management UI (rename/add/remove/reorder columns) is only reachable from here.
- **Detail view**: opened by tapping a card outside edit mode. Shows property name (editable) and notes (editable, freeform text area). Simple modal or full-screen sheet on mobile — full-screen is usually friendlier on small viewports than a centered modal.
- **Stage management**: since stages must be easy to rename/add/remove, this should be a simple settings panel (list of stages with text input for name, color swatch, drag handles or up/down controls to reorder, add/delete buttons) rather than requiring a code change. Reachable only from edit mode.

Suggested component breakdown (non-binding, see README for actual scaffold):
```
Board.jsx           -- top-level layout, fetches board data, holds edit-mode state
Column.jsx           -- one stage's column, droppable target
Card.jsx             -- one prospect, draggable
CardDetailSheet.jsx  -- expanded view (property name + notes)
StageEditorPanel.jsx -- add/rename/remove/reorder stages
```

## 7. Future extension: Map view (not MVP)

Documented now so the schema/design doesn't box it out:
- A view toggle (Board ↔ Map) shows prospects as pins on a map instead of cards in columns.
- Each pin's color matches its current stage's `color` (hence `stages.color` existing from day one).
- Requires `prospects.lat`/`lng` to be populated — either entered manually or (later) geocoded automatically from `address` via a geocoding API call triggered on prospect create/update.
- No further schema changes anticipated; this is primarily a new frontend view plus one enrichment step (geocoding) on the backend.

## 8. Tech stack recap

- Frontend + backend: Next.js (App Router), API routes for all backend logic — no Express needed at this scope (long-running/streaming needs would be the trigger to reconsider, per earlier discussion).
- Drag-and-drop: `@hello-pangea/dnd`.
- Database: Postgres via Supabase **or** SQLite via Turso — either is free-tier friendly and sufficient; pick one before scaffolding (Supabase gives a nicer dashboard/GUI for manually poking at data, which can help while learning).
- Hosting: Vercel free tier, connected to GitHub for auto-deploy on push.

## 9. Decisions

- **Board code format:** 6-character, human-typeable, uppercase alphanumeric,
  with visually ambiguous characters (`0`/`O`, `1`/`I`/`L`) excluded from the
  alphabet. Generated app-side (see `lib/generateCode.js`) and checked for
  uniqueness before insert. This favors "a person can read it off a screen
  and type it on a phone" over maximal entropy — acceptable here since the
  threat model is "don't let it be guessed by casual brute force," not
  "protect against a targeted attacker."
- **Invalid/missing board code:** `GET /api/boards/[code]` returns a `404`
  with a JSON error body when the code doesn't match a board. The `/b/[code]`
  page is a client-rendered route that fetches this endpoint on mount and
  renders a plain "Board not found" state on a 404, rather than doing a
  server-side redirect or throwing an unhandled error. This keeps the
  not-found state fully within the frontend's control (easy to style,
  consistent with the rest of the mobile UI) rather than relying on Next's
  generic not-found page.
- Behavior when deleting a non-empty stage (block vs. migrate prospects): deferred to implementation.
- Whether `localStorage`-remembered codes are worth building in MVP: deferred to implementation.
