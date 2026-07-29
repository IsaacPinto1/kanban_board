import { NextResponse } from 'next/server';
import { supabase, getBoardByCode } from '../../../../../../lib/db';

// PATCH /api/boards/[code]/prospects/[prospectId]
// body: any of { address, property_name, notes, stage_id, sort_order }
// A drag-and-drop move is just this endpoint updating stage_id + sort_order.
export async function PATCH(request, { params }) {
  const board = await getBoardByCode(params.code);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const body = await request.json();
  const updates = { updated_at: new Date().toISOString() };
  if (body.address !== undefined) updates.address = body.address;
  if (body.property_name !== undefined) updates.property_name = body.property_name;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.stage_id !== undefined) updates.stage_id = body.stage_id;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  const { data, error } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', params.prospectId)
    .eq('board_id', board.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
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
