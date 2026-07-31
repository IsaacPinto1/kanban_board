import { NextResponse } from 'next/server';
import { supabase, getBoardByCode } from '../../../../../lib/db';

// POST /api/boards/[code]/prospects -> create a prospect
// body: { address, stage_id, property_name?, notes?, listing_url? }
export async function POST(request, { params }) {
  const board = await getBoardByCode(params.code);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const body = await request.json();
  if (!body.address || !body.stage_id) {
    return NextResponse.json(
      { error: 'address and stage_id are required' },
      { status: 400 }
    );
  }

  // New cards go to the end of their stage.
  const { data: existing } = await supabase
    .from('prospects')
    .select('sort_order')
    .eq('stage_id', body.stage_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder =
    existing && existing.length > 0
      ? existing[0].sort_order + 1000
      : 1000;

  const { data, error } = await supabase
    .from('prospects')
    .insert({
      board_id: board.id,
      stage_id: body.stage_id,
      address: body.address,
      property_name: body.property_name || null,
      notes: body.notes || null,
      listing_url: body.listing_url || null,
      rent: body.rent === undefined || body.rent === null ? null : body.rent,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ prospect: data }, { status: 201 });
}
