import { NextResponse } from 'next/server';
import { supabase, getBoardByCode } from '../../../../../../lib/db';

// PATCH /api/boards/[code]/stages/[stageId] -> rename / recolor / reorder
// body: any of { name, color, sort_order }
export async function PATCH(request, { params }) {
  const board = await getBoardByCode(params.code);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const body = await request.json();
  const updates = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.color !== undefined) updates.color = body.color;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  const { data, error } = await supabase
    .from('stages')
    .update(updates)
    .eq('id', params.stageId)
    .eq('board_id', board.id) // guard against editing a stage on someone else's board
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ stage: data });
}

// DELETE /api/boards/[code]/stages/[stageId]
// Per DESIGN.md section 4: blocks deletion if the stage still has prospects,
// rather than silently migrating/deleting their cards.
export async function DELETE(request, { params }) {
  const board = await getBoardByCode(params.code);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const { count } = await supabase
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('stage_id', params.stageId);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Move or delete the ${count} prospect(s) in this stage first` },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('stages')
    .delete()
    .eq('id', params.stageId)
    .eq('board_id', board.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
