import { NextResponse } from 'next/server';

import { supabase } from '../../../lib/db';
import { generateUniqueBoardCode } from '../../../lib/generateCode';

const DEFAULT_STAGES = [
  { name: 'Contacted', color: '#94a3b8', sort_order: 1000 },
  { name: 'Heard back', color: '#60a5fa', sort_order: 2000 },
  { name: 'Tour scheduled', color: '#fbbf24', sort_order: 3000 },
  { name: 'Toured', color: '#a78bfa', sort_order: 4000 },
  { name: 'Applying', color: '#34d399', sort_order: 5000 },
];

export async function POST() {
  try {
    const code = await generateUniqueBoardCode(supabase);

    const { data: board, error: boardError } = await supabase
      .from('boards')
      .insert({
        code,
        name: 'My Rental Search',
      })
      .select()
      .single();

    if (boardError) {
      return NextResponse.json(
        { error: boardError.message },
        { status: 400 }
      );
    }

    const stages = DEFAULT_STAGES.map((stage) => ({
      ...stage,
      board_id: board.id,
    }));

    const { error: stagesError } = await supabase
      .from('stages')
      .insert(stages);

    if (stagesError) {
      // Clean up the board if stage creation fails.
      await supabase
        .from('boards')
        .delete()
        .eq('id', board.id);

      return NextResponse.json(
        { error: stagesError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { code, board },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating board:', error);

    return NextResponse.json(
      { error: 'Could not create board' },
      { status: 500 }
    );
  }
}