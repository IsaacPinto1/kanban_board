-- Migration 0004: track monthly rent for each prospect.
-- Whole-dollar amount (integer), nullable -- same "just don't show it" pattern
-- as listing_url when it hasn't been filled in yet.
alter table prospects add column rent integer;
