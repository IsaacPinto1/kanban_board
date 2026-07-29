import { createClient } from '@supabase/supabase-js';

// Server-side client used by API routes. Uses SUPABASE_SERVICE_ROLE_KEY,
// not the anon key -- schema.sql enables Row Level Security with no
// policies, so the anon/authenticated roles have zero table access by
// design. Only the service role (server-only, bypasses RLS) can read or
// write, which is correct here because the board-code auth check below is
// the actual gate, not anything enforced in SQL. See README.md
// "Security model" for the full reasoning. Never import this file from a
// client component -- it must only run in API routes / server code.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Centralized auth check referenced in DESIGN.md section 3 & 5.
// Every API route should call this first and bail out on `null`.
export async function getBoardByCode(code) {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !data) return null;
  return data;
}
