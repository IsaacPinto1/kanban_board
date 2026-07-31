-- Migration 0003: split the optimistic-concurrency check on prospects into
-- two independent timestamps instead of one shared `updated_at`.
--
-- Previously every PATCH (whether a drag-and-drop move or a details edit)
-- checked and bumped the same `updated_at`. That meant a stage move by one
-- person while someone else was mid-edit on the card's details would bump
-- `updated_at`, causing the details save to be rejected as a "conflict"
-- even though the details themselves were never touched.
--
-- `details_updated_at` is checked/bumped only by edits to address,
-- property_name, notes, or listing_url. `position_updated_at` is
-- checked/bumped only by edits to stage_id or sort_order (i.e. moves).
-- `updated_at` is left in place as a general "last touched by anything"
-- timestamp, but is no longer used for conflict detection.
alter table prospects
  add column details_updated_at timestamptz not null default now(),
  add column position_updated_at timestamptz not null default now();

-- Backfill both from the existing updated_at so current rows start
-- consistent with it.
update prospects
set details_updated_at = updated_at,
    position_updated_at = updated_at;
