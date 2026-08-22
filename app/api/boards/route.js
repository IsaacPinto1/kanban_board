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

// Custom codes: 6 uppercase letters/digits, matching the length of
// auto-generated codes (CODE_LENGTH in lib/generateCode.js) so custom and
// random codes are interchangeable everywhere a code is displayed, typed,
// or validated (e.g. the 6-char board-code input on the "open a board"
// form). A bit more permissive on alphabet than generation -- a human
// picking their own code should be able to use any letter or digit,
// including the visually-ambiguous ones (0/O, 1/I/L) that generation
// avoids.
const CUSTOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

// POST /api/boards -> create a board.
// JSON body: { code: 'MYCODE' } to request a specific board code, or
// { code: '' } / an empty object to get a randomly generated one. The
// frontend always sends a body now, so we can parse it directly.
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

      // The frontend already checks availability before submitting, but we
      // re-check here too: that check and this request are two separate
      // round trips, so another request can claim the code in between
      // (TOCTOU). Without this, the insert below would still fail on the
      // DB's unique constraint, but with a raw Postgres error instead of a
      // clean 409.
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