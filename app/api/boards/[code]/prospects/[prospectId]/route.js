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

// PATCH /api/boards/[code]/prospects/[prospectId]
// body: any of { address, property_name, notes, stage_id, sort_order },
// plus an optional `expected_updated_at` -- the `updated_at` value the
// client last saw for this prospect. A drag-and-drop move is just this
// endpoint updating stage_id + sort_order.
//
// When `expected_updated_at` is supplied, the update is conditioned on the
// row's current `updated_at` still matching it. Since `id` is a primary
// key, that condition can only match 0 or 1 rows -- so if `.single()` comes
// back with "no rows" (PGRST116) here, it means someone else updated this
// prospect after the client last fetched it, and we tell the client to
// treat this as a stale-write conflict rather than a generic error.
export async function PATCH(request, { params }) {
  const board = await getBoardByCode(params.code);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const body = await request.json();
  const updates = { updated_at: new Date().toISOString() };
  if (body.address !== undefined) updates.address = body.address;
  if (body.property_name !== undefined) updates.property_name = body.property_name;
  if (body.listing_url !== undefined) {updates.listing_url = body.listing_url;}
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.stage_id !== undefined) updates.stage_id = body.stage_id;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  let query = supabase
    .from('prospects')
    .update(updates)
    .eq('id', params.prospectId)
    .eq('board_id', board.id);

  const hasExpectedUpdatedAt = body.expected_updated_at !== undefined;
  if (hasExpectedUpdatedAt) {
    query = query.eq('updated_at', body.expected_updated_at);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (hasExpectedUpdatedAt && error.code === 'PGRST116') {
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
