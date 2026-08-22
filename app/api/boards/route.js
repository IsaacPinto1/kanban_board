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

// Custom codes: 3-20 uppercase letters/digits. A bit more permissive than
// the auto-generated alphabet (lib/generateCode.js) since a human picking
// their own code should be able to use any letter or digit, including the
// visually-ambiguous ones (0/O, 1/I/L) that generation avoids.
const CUSTOM_CODE_PATTERN = /^[A-Z0-9]{3,20}$/;

// POST /api/boards -> create a board.
// Optional JSON body: { code: 'MYCODE' } to request a specific board code
// instead of a randomly generated one. If omitted (or no body at all,
// preserving the previous no-argument behavior), a unique code is generated.
export async function POST(request) {
  try {
    let requestedCode = null;

    if (request) {
      try {
        const body = await request.json();
        if (body && typeof body.code === 'string' && body.code.trim() !== '') {
          requestedCode = body.code.trim().toUpperCase();
        }
      } catch {
        // No body, or not valid JSON -- treat as "no custom code requested".
      }
    }

    let code;

    if (requestedCode) {
      if (!CUSTOM_CODE_PATTERN.test(requestedCode)) {
        return NextResponse.json(
          { error: 'Board code must be 3-20 letters and numbers' },
          { status: 400 }
        );
      }

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