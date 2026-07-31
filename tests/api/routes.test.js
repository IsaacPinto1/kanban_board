import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSupabase = {
  from: vi.fn(),
};

const mockGetBoardByCode = vi.fn();
const mockGenerateUniqueBoardCode = vi.fn();

vi.mock('../../lib/db', () => ({
  supabase: mockSupabase,
  getBoardByCode: mockGetBoardByCode,
}));

vi.mock('../../lib/generateCode', () => ({
  generateUniqueBoardCode: mockGenerateUniqueBoardCode,
}));

function createChain({
  data = null,
  error = null,
  count = null,
} = {}) {
  const chain = {};

  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'order',
    'limit',
  ];

  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }

  chain.single = vi.fn().mockResolvedValue({ data, error });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  chain.then = (resolve, reject) =>
    Promise.resolve({ data, error, count }).then(resolve, reject);

  return chain;
}

function mockFrom(table, result = {}) {
  const chain = createChain(result);
  mockSupabase.from.mockImplementation((requestedTable) => {
    if (requestedTable === table) {
      return chain;
    }

    return createChain();
  });

  return chain;
}

function jsonRequest(body) {
  return new Request('http://localhost', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function patchRequest(body) {
  return new Request('http://localhost', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function makeBoard(overrides = {}) {
  return {
    id: 'board-1',
    code: 'ABC123',
    name: 'My Rental Search',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeStage(overrides = {}) {
  return {
    id: 'stage-1',
    board_id: 'board-1',
    name: 'Contacted',
    color: '#94a3b8',
    sort_order: 1000,
    ...overrides,
  };
}

function makeProspect(overrides = {}) {
  return {
    id: 'prospect-1',
    board_id: 'board-1',
    stage_id: 'stage-1',
    address: '123 Main St',
    property_name: 'Nice Apartment',
    notes: 'Ask about pets',
    sort_order: 1000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

/*
 * ---------------------------------------------------------------------------
 * POST /api/boards
 * ---------------------------------------------------------------------------
 */

describe('POST /api/boards', () => {
  it('creates a board with a generated code and five default stages', async () => {
    mockGenerateUniqueBoardCode.mockResolvedValue('PK7F2X');

    const board = makeBoard({ code: 'PK7F2X' });

    const boardChain = createChain({
      data: board,
      error: null,
    });

    const stagesChain = createChain({
      data: null,
      error: null,
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'boards') return boardChain;
      if (table === 'stages') return stagesChain;
      return createChain();
    });

    const { POST } = await import('../../app/api/boards/route');

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.code).toBe('PK7F2X');
    expect(body.board).toEqual(board);

    expect(mockGenerateUniqueBoardCode).toHaveBeenCalledWith(mockSupabase);

    expect(boardChain.insert).toHaveBeenCalledWith({
      code: 'PK7F2X',
      name: 'My Rental Search',
    });

    expect(stagesChain.insert).toHaveBeenCalledWith([
      {
        board_id: 'board-1',
        name: 'Contacted',
        color: '#94a3b8',
        sort_order: 1000,
      },
      {
        board_id: 'board-1',
        name: 'Heard back',
        color: '#60a5fa',
        sort_order: 2000,
      },
      {
        board_id: 'board-1',
        name: 'Tour scheduled',
        color: '#fbbf24',
        sort_order: 3000,
      },
      {
        board_id: 'board-1',
        name: 'Toured',
        color: '#a78bfa',
        sort_order: 4000,
      },
      {
        board_id: 'board-1',
        name: 'Applying',
        color: '#34d399',
        sort_order: 5000,
      },
    ]);
  });

  it('returns 400 when board creation fails', async () => {
    mockGenerateUniqueBoardCode.mockResolvedValue('PK7F2X');

    const boardChain = createChain({
      error: { message: 'database error' },
    });

    mockSupabase.from.mockReturnValue(boardChain);

    const { POST } = await import('../../app/api/boards/route');

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('database error');
  });

  it('cleans up the board when stage creation fails', async () => {
    mockGenerateUniqueBoardCode.mockResolvedValue('PK7F2X');

    const board = makeBoard({ code: 'PK7F2X' });

    const boardChain = createChain({
      data: board,
      error: null,
    });

    const stagesChain = createChain({
        error: { message: 'stage insert failed' },
    });

    const cleanupChain = createChain();

    let boardCalls = 0;

    mockSupabase.from.mockImplementation((table) => {
        if (table === 'boards') {
            boardCalls += 1;

            // First boards call = INSERT
            // Second boards call = cleanup DELETE
            return boardCalls === 1 ? boardChain : cleanupChain;
        }

        if (table === 'stages') {
            return stagesChain;
        }

        return createChain();
    });

    const { POST } = await import('../../app/api/boards/route');

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('stage insert failed');

    expect(cleanupChain.delete).toHaveBeenCalled();
    expect(cleanupChain.eq).toHaveBeenCalledWith('id', 'board-1');
  });

  it('returns 500 when an unexpected exception occurs', async () => {
    mockGenerateUniqueBoardCode.mockRejectedValue(
      new Error('unexpected failure')
    );

    const { POST } = await import('../../app/api/boards/route');

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Could not create board');
  });
});

/*
 * ---------------------------------------------------------------------------
 * GET /api/boards/[code]
 * ---------------------------------------------------------------------------
 */

describe('GET /api/boards/[code]', () => {
  it('returns the board, stages, and prospects', async () => {
    const board = makeBoard();
    const stages = [
      makeStage(),
      makeStage({
        id: 'stage-2',
        name: 'Toured',
        sort_order: 2000,
      }),
    ];
    const prospects = [
      makeProspect(),
      makeProspect({
        id: 'prospect-2',
        sort_order: 2000,
      }),
    ];

    mockGetBoardByCode.mockResolvedValue(board);

    const stagesChain = createChain({ data: stages });
    const prospectsChain = createChain({ data: prospects });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'stages') return stagesChain;
      if (table === 'prospects') return prospectsChain;
      return createChain();
    });

    const { GET } = await import('../../app/api/boards/[code]/route');

    const response = await GET(
      new Request('http://localhost'),
      { params: { code: 'ABC123' } }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.board).toEqual(board);
    expect(body.stages).toEqual(stages);
    expect(body.prospects).toEqual(prospects);

    expect(mockGetBoardByCode).toHaveBeenCalledWith('ABC123');
    expect(stagesChain.eq).toHaveBeenCalledWith('board_id', 'board-1');
    expect(prospectsChain.eq).toHaveBeenCalledWith('board_id', 'board-1');
  });

  it('returns 404 for an unknown board code', async () => {
    mockGetBoardByCode.mockResolvedValue(null);

    const { GET } = await import('../../app/api/boards/[code]/route');

    const response = await GET(
      new Request('http://localhost'),
      { params: { code: 'NOPE12' } }
    );

    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Board not found');

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});

/*
 * ---------------------------------------------------------------------------
 * PATCH /api/boards/[code]
 * ---------------------------------------------------------------------------
 */

describe('PATCH /api/boards/[code]', () => {
  it('renames an existing board', async () => {
    const board = makeBoard();
    const updatedBoard = makeBoard({ name: 'New Apartment Search' });

    mockGetBoardByCode.mockResolvedValue(board);

    const chain = createChain({
      data: updatedBoard,
    });

    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import('../../app/api/boards/[code]/route');

    const response = await PATCH(
      patchRequest({ name: 'New Apartment Search' }),
      { params: { code: 'ABC123' } }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.board).toEqual(updatedBoard);

    expect(chain.update).toHaveBeenCalledWith({
      name: 'New Apartment Search',
    });

    expect(chain.eq).toHaveBeenCalledWith('id', 'board-1');
  });

  it('returns 404 when renaming an unknown board', async () => {
    mockGetBoardByCode.mockResolvedValue(null);

    const { PATCH } = await import('../../app/api/boards/[code]/route');

    const response = await PATCH(
      patchRequest({ name: 'Hacked Board' }),
      { params: { code: 'NOPE12' } }
    );

    expect(response.status).toBe(404);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns 400 when the database rejects the rename', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const chain = createChain({
      error: { message: 'rename failed' },
    });

    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import('../../app/api/boards/[code]/route');

    const response = await PATCH(
      patchRequest({ name: 'New Name' }),
      { params: { code: 'ABC123' } }
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('rename failed');
  });
});

/*
 * ---------------------------------------------------------------------------
 * POST /api/boards/[code]/stages
 * ---------------------------------------------------------------------------
 */

describe('POST /api/boards/[code]/stages', () => {
  it('creates a stage at the end of the board', async () => {
    const board = makeBoard();

    mockGetBoardByCode.mockResolvedValue(board);

    const existingChain = createChain({
      data: [{ sort_order: 3000 }],
    });

    const insertChain = createChain({
      data: makeStage({
        id: 'stage-4',
        name: 'Applied',
        sort_order: 4000,
      }),
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'stages') {
        // The route calls from('stages') twice.
        return mockSupabase.from.mock.calls.length === 1
          ? existingChain
          : insertChain;
      }

      return createChain();
    });

    const { POST } = await import(
      '../../app/api/boards/[code]/stages/route'
    );

    const response = await POST(
      jsonRequest({
        name: 'Applied',
        color: '#123456',
      }),
      { params: { code: 'ABC123' } }
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.stage.name).toBe('Applied');
    expect(body.stage.sort_order).toBe(4000);

    expect(insertChain.insert).toHaveBeenCalledWith({
      board_id: 'board-1',
      name: 'Applied',
      color: '#123456',
      sort_order: 4000,
    });
  });

  it('defaults the stage color when one is omitted', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const existingChain = createChain({ data: [] });
    const insertChain = createChain({
      data: makeStage({
        name: 'Applied',
        color: '#94a3b8',
      }),
    });

    let stageCalls = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'stages') {
        stageCalls += 1;
        return stageCalls === 1 ? existingChain : insertChain;
      }

      return createChain();
    });

    const { POST } = await import(
      '../../app/api/boards/[code]/stages/route'
    );

    const response = await POST(
      jsonRequest({ name: 'Applied' }),
      { params: { code: 'ABC123' } }
    );

    expect(response.status).toBe(201);

    expect(insertChain.insert).toHaveBeenCalledWith({
      board_id: 'board-1',
      name: 'Applied',
      color: '#94a3b8',
      sort_order: 1000,
    });
  });

  it('returns 400 when name is missing', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const { POST } = await import(
      '../../app/api/boards/[code]/stages/route'
    );

    const response = await POST(
      jsonRequest({ color: '#123456' }),
      { params: { code: 'ABC123' } }
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('name is required');

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown board', async () => {
    mockGetBoardByCode.mockResolvedValue(null);

    const { POST } = await import(
      '../../app/api/boards/[code]/stages/route'
    );

    const response = await POST(
      jsonRequest({ name: 'Applied' }),
      { params: { code: 'NOPE12' } }
    );

    expect(response.status).toBe(404);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});

/*
 * ---------------------------------------------------------------------------
 * PATCH /api/boards/[code]/stages/[stageId]
 * ---------------------------------------------------------------------------
 */

describe('PATCH /api/boards/[code]/stages/[stageId]', () => {
  it('renames, recolors, and reorders a stage', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const updatedStage = makeStage({
      name: 'Applied',
      color: '#123456',
      sort_order: 5000,
    });

    const chain = createChain({
      data: updatedStage,
    });

    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/stages/[stageId]/route'
    );

    const response = await PATCH(
      patchRequest({
        name: 'Applied',
        color: '#123456',
        sort_order: 5000,
      }),
      {
        params: {
          code: 'ABC123',
          stageId: 'stage-1',
        },
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stage).toEqual(updatedStage);

    expect(chain.update).toHaveBeenCalledWith({
      name: 'Applied',
      color: '#123456',
      sort_order: 5000,
    });

    expect(chain.eq).toHaveBeenCalledWith('id', 'stage-1');
    expect(chain.eq).toHaveBeenCalledWith('board_id', 'board-1');
  });

  it('returns 404 for an unknown board', async () => {
    mockGetBoardByCode.mockResolvedValue(null);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/stages/[stageId]/route'
    );

    const response = await PATCH(
      patchRequest({ name: 'Hacked' }),
      {
        params: {
          code: 'NOPE12',
          stageId: 'stage-1',
        },
      }
    );

    expect(response.status).toBe(404);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('does not allow a stage to be updated through another board code', async () => {
    mockGetBoardByCode.mockResolvedValue(
      makeBoard({
        id: 'board-2',
        code: 'OTHER2',
      })
    );

    const chain = createChain({
      data: null,
      error: { message: 'No rows updated' },
    });

    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/stages/[stageId]/route'
    );

    const response = await PATCH(
      patchRequest({ name: 'Hacked' }),
      {
        params: {
          code: 'OTHER2',
          stageId: 'stage-1',
        },
      }
    );

    expect(chain.eq).toHaveBeenCalledWith('board_id', 'board-2');
    expect(response.status).toBe(400);
  });
});

/*
 * ---------------------------------------------------------------------------
 * DELETE /api/boards/[code]/stages/[stageId]
 * ---------------------------------------------------------------------------
 */

describe('DELETE /api/boards/[code]/stages/[stageId]', () => {
  it('deletes an empty stage', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const countChain = createChain({
      count: 0,
    });

    const deleteChain = createChain();

    let stageCalls = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'prospects') {
        return countChain;
      }

      if (table === 'stages') {
        stageCalls += 1;
        return deleteChain;
      }

      return createChain();
    });

    const { DELETE } = await import(
      '../../app/api/boards/[code]/stages/[stageId]/route'
    );

    const response = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      {
        params: {
          code: 'ABC123',
          stageId: 'stage-1',
        },
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(deleteChain.delete).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'stage-1');
    expect(deleteChain.eq).toHaveBeenCalledWith('board_id', 'board-1');
  });

  it('blocks deletion when the stage contains prospects', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const countChain = createChain({
      count: 2,
    });

    mockSupabase.from.mockReturnValue(countChain);

    const { DELETE } = await import(
      '../../app/api/boards/[code]/stages/[stageId]/route'
    );

    const response = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      {
        params: {
          code: 'ABC123',
          stageId: 'stage-1',
        },
      }
    );

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe(
      'Move or delete the 2 prospect(s) in this stage first'
    );

    expect(countChain.select).toHaveBeenCalledWith('id', {
      count: 'exact',
      head: true,
    });
  });

  it('returns 404 for an unknown board', async () => {
    mockGetBoardByCode.mockResolvedValue(null);

    const { DELETE } = await import(
      '../../app/api/boards/[code]/stages/[stageId]/route'
    );

    const response = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      {
        params: {
          code: 'NOPE12',
          stageId: 'stage-1',
        },
      }
    );

    expect(response.status).toBe(404);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});

/*
 * ---------------------------------------------------------------------------
 * POST /api/boards/[code]/prospects
 * ---------------------------------------------------------------------------
 */

describe('POST /api/boards/[code]/prospects', () => {
  it('creates a prospect with the supplied fields', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const existingChain = createChain({
      data: [{ sort_order: 2000 }],
    });

    const prospect = makeProspect({
      sort_order: 3000,
    });

    const insertChain = createChain({
      data: prospect,
    });

    let calls = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'prospects') {
        calls += 1;
        return calls === 1 ? existingChain : insertChain;
      }

      return createChain();
    });

    const { POST } = await import(
      '../../app/api/boards/[code]/prospects/route'
    );

    const response = await POST(
      jsonRequest({
        address: '123 Main St',
        stage_id: 'stage-1',
        property_name: 'Nice Apartment',
        notes: 'Ask about pets',
      }),
      { params: { code: 'ABC123' } }
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.prospect).toEqual(prospect);

    expect(insertChain.insert).toHaveBeenCalledWith({
      board_id: 'board-1',
      stage_id: 'stage-1',
      address: '123 Main St',
      property_name: 'Nice Apartment',
      notes: 'Ask about pets',
      listing_url: null,
      sort_order: 3000,
    });
  });

  it('starts sort_order at 1000 when the stage is empty', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const existingChain = createChain({
      data: [],
    });

    const insertChain = createChain({
      data: makeProspect({ sort_order: 1000 }),
    });

    let calls = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'prospects') {
        calls += 1;
        return calls === 1 ? existingChain : insertChain;
      }

      return createChain();
    });

    const { POST } = await import(
      '../../app/api/boards/[code]/prospects/route'
    );

    const response = await POST(
      jsonRequest({
        address: '123 Main St',
        stage_id: 'stage-1',
      }),
      { params: { code: 'ABC123' } }
    );

    expect(response.status).toBe(201);

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        sort_order: 1000,
      })
    );
  });

  it('rejects a prospect without an address', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const { POST } = await import(
      '../../app/api/boards/[code]/prospects/route'
    );

    const response = await POST(
      jsonRequest({
        stage_id: 'stage-1',
      }),
      { params: { code: 'ABC123' } }
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('address and stage_id are required');

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('rejects a prospect without a stage', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const { POST } = await import(
      '../../app/api/boards/[code]/prospects/route'
    );

    const response = await POST(
      jsonRequest({
        address: '123 Main St',
      }),
      { params: { code: 'ABC123' } }
    );

    expect(response.status).toBe(400);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown board', async () => {
    mockGetBoardByCode.mockResolvedValue(null);

    const { POST } = await import(
      '../../app/api/boards/[code]/prospects/route'
    );

    const response = await POST(
      jsonRequest({
        address: '123 Main St',
        stage_id: 'stage-1',
      }),
      { params: { code: 'NOPE12' } }
    );

    expect(response.status).toBe(404);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});

/*
 * ---------------------------------------------------------------------------
 * PATCH /api/boards/[code]/prospects/[prospectId]
 * ---------------------------------------------------------------------------
 */

describe('PATCH /api/boards/[code]/prospects/[prospectId]', () => {
  it('updates address, property name, notes, stage, and sort order', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const updatedProspect = makeProspect({
      address: '456 New St',
      property_name: 'Updated Apartment',
      notes: 'Updated notes',
      stage_id: 'stage-2',
      sort_order: 5000,
    });

    const chain = createChain({
      data: updatedProspect,
    });

    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    const response = await PATCH(
      patchRequest({
        address: '456 New St',
        property_name: 'Updated Apartment',
        notes: 'Updated notes',
        stage_id: 'stage-2',
        sort_order: 5000,
      }),
      {
        params: {
          code: 'ABC123',
          prospectId: 'prospect-1',
        },
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.prospect).toEqual(updatedProspect);

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '456 New St',
        property_name: 'Updated Apartment',
        notes: 'Updated notes',
        stage_id: 'stage-2',
        sort_order: 5000,
      })
    );

    expect(chain.eq).toHaveBeenCalledWith('id', 'prospect-1');
    expect(chain.eq).toHaveBeenCalledWith('board_id', 'board-1');
  });

  it('updates only the fields supplied', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const chain = createChain({
      data: makeProspect({
        notes: 'New notes',
      }),
    });

    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    await PATCH(
      patchRequest({
        notes: 'New notes',
      }),
      {
        params: {
          code: 'ABC123',
          prospectId: 'prospect-1',
        },
      }
    );

    const update = chain.update.mock.calls[0][0];

    expect(update.notes).toBe('New notes');
    expect(update.address).toBeUndefined();
    expect(update.property_name).toBeUndefined();
    expect(update.stage_id).toBeUndefined();
    expect(update.sort_order).toBeUndefined();
    expect(update.updated_at).toEqual(expect.any(String));
  });

  it('does not allow updating a prospect through another board code', async () => {
    mockGetBoardByCode.mockResolvedValue(
      makeBoard({
        id: 'board-2',
        code: 'OTHER2',
      })
    );

    const chain = createChain({
      error: { message: 'No rows updated' },
    });

    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    const response = await PATCH(
      patchRequest({
        notes: 'Hacked notes',
      }),
      {
        params: {
          code: 'OTHER2',
          prospectId: 'prospect-1',
        },
      }
    );

    expect(chain.eq).toHaveBeenCalledWith('board_id', 'board-2');
    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown board', async () => {
    mockGetBoardByCode.mockResolvedValue(null);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    const response = await PATCH(
      patchRequest({ notes: 'test' }),
      {
        params: {
          code: 'NOPE12',
          prospectId: 'prospect-1',
        },
      }
    );

    expect(response.status).toBe(404);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('checks details_updated_at against expected_details_updated_at for a details edit', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const updatedProspect = makeProspect({ notes: 'Fresh notes' });
    const chain = createChain({ data: updatedProspect });
    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    await PATCH(
      patchRequest({
        notes: 'Fresh notes',
        expected_details_updated_at: '2026-01-01T00:00:00.000Z',
      }),
      { params: { code: 'ABC123', prospectId: 'prospect-1' } }
    );

    expect(chain.eq).toHaveBeenCalledWith('details_updated_at', '2026-01-01T00:00:00.000Z');
    expect(chain.eq).not.toHaveBeenCalledWith('position_updated_at', expect.anything());
  });

  it('checks position_updated_at against expected_position_updated_at for a move', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const chain = createChain({ data: makeProspect({ stage_id: 'stage-2' }) });
    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    await PATCH(
      patchRequest({
        stage_id: 'stage-2',
        sort_order: 5000,
        expected_position_updated_at: '2026-01-01T00:00:00.000Z',
      }),
      { params: { code: 'ABC123', prospectId: 'prospect-1' } }
    );

    expect(chain.eq).toHaveBeenCalledWith('position_updated_at', '2026-01-01T00:00:00.000Z');
    expect(chain.eq).not.toHaveBeenCalledWith('details_updated_at', expect.anything());
  });

  it('returns 409 when expected_details_updated_at is stale', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    // .single() surfaces "no rows matched" as a PGRST116 error -- the
    // details_updated_at filter matched nothing because someone else wrote
    // to this prospect's details first.
    const chain = createChain({
      error: { code: 'PGRST116', message: 'No rows found' },
    });
    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    const response = await PATCH(
      patchRequest({
        notes: 'My stale edit',
        expected_details_updated_at: '2026-01-01T00:00:00.000Z',
      }),
      { params: { code: 'ABC123', prospectId: 'prospect-1' } }
    );

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('conflict');
  });

  it('returns 409 when expected_position_updated_at is stale', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const chain = createChain({
      error: { code: 'PGRST116', message: 'No rows found' },
    });
    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    const response = await PATCH(
      patchRequest({
        stage_id: 'stage-2',
        sort_order: 5000,
        expected_position_updated_at: '2026-01-01T00:00:00.000Z',
      }),
      { params: { code: 'ABC123', prospectId: 'prospect-1' } }
    );

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('conflict');
  });

  it('a details-only edit never checks position_updated_at, even if position changed concurrently', async () => {
    // Someone dragged this card to a new stage (bumping position_updated_at)
    // while we were editing its notes. A details-only PATCH never includes
    // expected_position_updated_at, so that concurrent move can't cause our
    // notes save to conflict.
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const chain = createChain({ data: makeProspect({ notes: 'Updated notes' }) });
    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    const response = await PATCH(
      patchRequest({
        notes: 'Updated notes',
        expected_details_updated_at: '2026-01-01T00:00:00.000Z',
      }),
      { params: { code: 'ABC123', prospectId: 'prospect-1' } }
    );

    expect(response.status).toBe(200);
    expect(chain.eq).not.toHaveBeenCalledWith('position_updated_at', expect.anything());
  });

  it('does not apply a version filter when no expected_*_updated_at is supplied', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const chain = createChain({ data: makeProspect() });
    mockSupabase.from.mockReturnValue(chain);

    const { PATCH } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    await PATCH(
      patchRequest({ notes: 'No version check here' }),
      { params: { code: 'ABC123', prospectId: 'prospect-1' } }
    );

    expect(chain.eq).not.toHaveBeenCalledWith('details_updated_at', expect.anything());
    expect(chain.eq).not.toHaveBeenCalledWith('position_updated_at', expect.anything());
  });
});

/*
 * ---------------------------------------------------------------------------
 * GET /api/boards/[code]/prospects/[prospectId]
 * ---------------------------------------------------------------------------
 */

describe('GET /api/boards/[code]/prospects/[prospectId]', () => {
  it('returns the current prospect', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const prospect = makeProspect({ notes: 'Someone else already updated this' });
    const chain = createChain({ data: prospect });
    mockSupabase.from.mockReturnValue(chain);

    const { GET } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    const response = await GET(new Request('http://localhost'), {
      params: { code: 'ABC123', prospectId: 'prospect-1' },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.prospect).toEqual(prospect);
    expect(chain.eq).toHaveBeenCalledWith('id', 'prospect-1');
    expect(chain.eq).toHaveBeenCalledWith('board_id', 'board-1');
  });

  it('returns 404 when the prospect does not exist on this board', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const chain = createChain({ error: { code: 'PGRST116', message: 'No rows found' } });
    mockSupabase.from.mockReturnValue(chain);

    const { GET } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    const response = await GET(new Request('http://localhost'), {
      params: { code: 'ABC123', prospectId: 'missing-prospect' },
    });

    expect(response.status).toBe(404);
  });

  it('returns 404 for an unknown board', async () => {
    mockGetBoardByCode.mockResolvedValue(null);

    const { GET } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    const response = await GET(new Request('http://localhost'), {
      params: { code: 'NOPE12', prospectId: 'prospect-1' },
    });

    expect(response.status).toBe(404);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});

/*
 * ---------------------------------------------------------------------------
 * DELETE /api/boards/[code]/prospects/[prospectId]
 * ---------------------------------------------------------------------------
 */

describe('DELETE /api/boards/[code]/prospects/[prospectId]', () => {
  it('deletes a prospect belonging to the board', async () => {
    mockGetBoardByCode.mockResolvedValue(makeBoard());

    const chain = createChain();

    mockSupabase.from.mockReturnValue(chain);

    const { DELETE } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    const response = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      {
        params: {
          code: 'ABC123',
          prospectId: 'prospect-1',
        },
      }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'prospect-1');
    expect(chain.eq).toHaveBeenCalledWith('board_id', 'board-1');
  });

  it('returns 404 for an unknown board', async () => {
    mockGetBoardByCode.mockResolvedValue(null);

    const { DELETE } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    const response = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      {
        params: {
          code: 'NOPE12',
          prospectId: 'prospect-1',
        },
      }
    );

    expect(response.status).toBe(404);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('does not delete before the board code has been validated', async () => {
    mockGetBoardByCode.mockResolvedValue(null);

    const { DELETE } = await import(
      '../../app/api/boards/[code]/prospects/[prospectId]/route'
    );

    await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      {
        params: {
          code: 'WRONG1',
          prospectId: 'prospect-1',
        },
      }
    );

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});