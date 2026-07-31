import { NextResponse } from 'next/server';
import { supabase, getBoardByCode } from '../../../../../../lib/db';

// GET /api/boards/[code]/prospects/[prospectId]
// Used by the frontend to refetch a single prospect after a rejected PATCH,
// rather than reloading the whole board.
export async function GET(request, { params }) {
  const board = await getBoardByCode(params.code);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', params.prospectId)
    .eq('board_id', board.id)
    .single();

  if (error) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  return NextResponse.json({ prospect: data });
}

const DETAIL_FIELDS = ['address', 'property_name', 'notes', 'listing_url'];
const POSITION_FIELDS = ['stage_id', 'sort_order'];

// PATCH /api/boards/[code]/prospects/[prospectId]
// body: any of { address, property_name, notes, stage_id, sort_order }.
// A drag-and-drop move is just this endpoint updating stage_id + sort_order;
// the detail sheet is just this endpoint updating the other fields. The two
// are treated as independent concerns for concurrency purposes (see below),
// so callers should only ever send one kind of field per request.
//
// Required conflict-check fields (required, not optional, precisely because
// it'd otherwise be easy for some future caller to forget one and silently
// reintroduce the race this exists to prevent):
//   expected_details_updated_at  -- required if any of
//                                   address/property_name/notes/listing_url
//                                   is present in the body
//   expected_position_updated_at -- required if stage_id or sort_order is
//                                   present in the body
//
// These are deliberately separate from each other (rather than one shared
// `updated_at`) so that someone dragging a card to a new stage doesn't
// invalidate someone else's in-progress edit to that card's notes, and vice
// versa. Since `id` is a primary key, an `.eq('..._updated_at', expected)`
// condition can only match 0 or 1 rows -- so if `.single()` comes back with
// "no rows" (PGRST116), it means someone else wrote to that same concern
// (position or details) after the client last fetched it, and we tell the
// client to treat this as a stale-write conflict rather than a generic
// error.
export async function PATCH(request, { params }) {
  const board = await getBoardByCode(params.code);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const body = await request.json();
  const touchesDetails = DETAIL_FIELDS.some((field) => body[field] !== undefined);
  const touchesPosition = POSITION_FIELDS.some((field) => body[field] !== undefined);

  if (touchesDetails && body.expected_details_updated_at === undefined) {
    return NextResponse.json(
      { error: 'expected_details_updated_at is required when updating card details' },
      { status: 400 }
    );
  }
  if (touchesPosition && body.expected_position_updated_at === undefined) {
    return NextResponse.json(
      { error: 'expected_position_updated_at is required when updating stage_id/sort_order' },
      { status: 400 }
    );
  }

  const updates = { updated_at: new Date().toISOString() };
  if (body.address !== undefined) updates.address = body.address;
  if (body.property_name !== undefined) updates.property_name = body.property_name;
  if (body.listing_url !== undefined) {updates.listing_url = body.listing_url;}
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.stage_id !== undefined) updates.stage_id = body.stage_id;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  if (touchesDetails) updates.details_updated_at = updates.updated_at;
  if (touchesPosition) updates.position_updated_at = updates.updated_at;

  let query = supabase
    .from('prospects')
    .update(updates)
    .eq('id', params.prospectId)
    .eq('board_id', board.id);

  if (touchesDetails) query = query.eq('details_updated_at', body.expected_details_updated_at);
  if (touchesPosition) query = query.eq('position_updated_at', body.expected_position_updated_at);

  const { data, error } = await query.select().single();

  if (error) {
    if ((touchesDetails || touchesPosition) && error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'conflict', message: 'This card was changed by someone else.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ prospect: data });
}

// DELETE /api/boards/[code]/prospects/[prospectId]
export async function DELETE(request, { params }) {
  const board = await getBoardByCode(params.code);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('prospects')
    .delete()
    .eq('id', params.prospectId)
    .eq('board_id', board.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
