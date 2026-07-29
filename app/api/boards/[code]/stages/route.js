import { NextResponse } from 'next/server';
import { supabase, getBoardByCode } from '../../../../../lib/db';

// POST /api/boards/[code]/stages -> create a stage
// body: { name, color }
export async function POST(request, { params }) {
  const board = await getBoardByCode(params.code);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const body = await request.json();
  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // Put new stages at the end: find the current max sort_order and add 1000.
  const { data: existing } = await supabase
    .from('stages')
    .select('sort_order')
    .eq('board_id', board.id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1000 : 1000;

  const { data, error } = await supabase
    .from('stages')
    .insert({
      board_id: board.id,
      name: body.name,
      color: body.color || '#94a3b8',
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ stage: data }, { status: 201 });
}
