import { NextResponse } from 'next/server';

import { supabase, getBoardByCode } from '../../../lib/db';
import { generateUniqueBoardCode } from '../../../lib/generateCode';

const DEFAULT_STAGES = [
  { name: 'Contacted', color: '#94a3b8', sort_order: 1000 },
  { name: 'Heard back', color: '#60a5fa', sort_order: 2000 },
  { name: 'Tour scheduled', color: '#fbbf24', sort_order: 3000 },
  { name: 'Toured', color: '#a78bfa', sort_order: 4000 },
  { name: 'Applying', color: '#34d399', sort_order: 5000 },
];

// Custom codes are 6 digits to match lib/generateCode.js. Slightly more
// permissive than random, since users might want to use 0/O or 1/I/L which
// are excluded from the random codes for visibility
const CUSTOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

// POST /api/boards -> create a board.
// JSON body: { code: 'MYCODE' } to request a specific board code, or
// { code: '' } / an empty object to get a randomly generated one.
// This always expects a body so the frontend should always send one
export async function POST(request) {
  try {
    const body = await request.json();
    const requestedCode =
      typeof body.code === 'string' && body.code.trim() !== ''
        ? body.code.trim().toUpperCase()
        : null;

    let code;

    if (requestedCode) {
      if (!CUSTOM_CODE_PATTERN.test(requestedCode)) {
        return NextResponse.json(
          { error: 'Board code must be exactly 6 letters and numbers' },
          { status: 400 }
        );
      }

      // Already checked on frontend but checked again here so that we get
      // a clean 409 in a race instead of a raw Postgres error from the DB's unique constraint
      const existingBoard = await getBoardByCode(requestedCode);
      if (existingBoard) {
        return NextResponse.json(
          { error: 'That code is already taken' },
          { status: 409 }
        );
      }

      code = requestedCode;
    } else {
      code = await generateUniqueBoardCode(supabase);
    }

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