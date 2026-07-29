import { NextResponse } from 'next/server';
import { supabase, getBoardByCode } from '../../../../lib/db';

// GET /api/boards/[code] -> board + stages + prospects
export async function GET(request, { params }) {
  const board = await getBoardByCode(params.code);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const { data: stages } = await supabase
    .from('stages')
    .select('*')
    .eq('board_id', board.id)
    .order('sort_order', { ascending: true });

  const { data: prospects } = await supabase
    .from('prospects')
    .select('*')
    .eq('board_id', board.id)
    .order('sort_order', { ascending: true });

  return NextResponse.json({ board, stages, prospects });
}

// PATCH /api/boards/[code] -> rename board
export async function PATCH(request, { params }) {
  const board = await getBoardByCode(params.code);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const body = await request.json();
  const { data, error } = await supabase
    .from('boards')
    .update({ name: body.name })
    .eq('id', board.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ board: data });
}
