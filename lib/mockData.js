// Static stand-in for what GET /api/boards/[code] will eventually return.
// Shapes match the `stages` and `prospects` tables in schema.sql exactly,
// so swapping this for a real fetch later is a drop-in replacement --
// see the "Wiring up the database" section in README.md.

export const mockBoard = {
  id: 'mock-board-id',
  code: 'DEM042',
  name: 'Demo Rental Search',
};

export const mockStages = [
  { id: 'stage-1', board_id: 'mock-board-id', name: 'Contacted', color: '#94a3b8', sort_order: 1000 },
  { id: 'stage-2', board_id: 'mock-board-id', name: 'Heard back', color: '#60a5fa', sort_order: 2000 },
  { id: 'stage-3', board_id: 'mock-board-id', name: 'Tour scheduled', color: '#fbbf24', sort_order: 3000 },
  { id: 'stage-4', board_id: 'mock-board-id', name: 'Toured', color: '#a78bfa', sort_order: 4000 },
  { id: 'stage-5', board_id: 'mock-board-id', name: 'Applying', color: '#34d399', sort_order: 5000 },
];

export const mockProspects = [
  {
    id: 'prospect-1',
    board_id: 'mock-board-id',
    stage_id: 'stage-1',
    address: '12 Wattle St, Subiaco WA',
    property_name: 'Wattle St Apartment',
    notes: 'Emailed agent Tuesday, no reply yet.',
    sort_order: 1000,
  },
  {
    id: 'prospect-2',
    board_id: 'mock-board-id',
    stage_id: 'stage-2',
    address: '4/88 Rokeby Rd, Subiaco WA',
    property_name: 'Rokeby Rd Unit 4',
    notes: 'Agent said pets ok. Wants proof of income before booking a tour.',
    sort_order: 1000,
  },
  {
    id: 'prospect-3',
    board_id: 'mock-board-id',
    stage_id: 'stage-3',
    address: '21 Hay St, East Perth WA',
    property_name: '',
    notes: 'Tour booked Saturday 10am. Bring photo ID.',
    sort_order: 1000,
  },
  {
    id: 'prospect-4',
    board_id: 'mock-board-id',
    stage_id: 'stage-5',
    address: '9 Mounts Bay Rd, Perth WA',
    property_name: 'Mounts Bay Rd Riverside',
    notes: 'Application submitted 24 July. References: Sarah (prev landlord), Tom (employer).',
    sort_order: 1000,
  },
];
