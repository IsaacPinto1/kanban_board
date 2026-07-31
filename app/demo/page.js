'use client';

import { useState } from 'react';
import Board from '../../components/Board';
import { mockStages, mockProspects } from '../../lib/mockData';

// No DB, no fetch -- pure static data so you can see the board render and
// interact with drag-and-drop / the detail sheet / stage editing before
// wiring anything up to Supabase. All mutations here are local React state
// only and will reset on refresh. See README.md "Wiring up the database"
// for how to swap this for the real thing.
export default function DemoPage() {
  const [stages, setStages] = useState(mockStages);
  const [prospects, setProspects] = useState(mockProspects);
  const [openProspectId, setOpenProspectId] = useState(null);

  function handleMoveProspect(prospectId, newStageId, newSortOrder) {
    setProspects((prev) =>
      prev.map((p) =>
        p.id === prospectId ? { ...p, stage_id: newStageId, sort_order: newSortOrder } : p
      )
    );
  }

  function handleUpdateProspect(prospectId, updates) {
    setProspects((prev) =>
      prev.map((p) => (p.id === prospectId ? { ...p, ...updates } : p))
    );
  }

  function handleDeleteProspect(prospectId) {
    setProspects((prev) => prev.filter((p) => p.id !== prospectId));
  }

  function handleRenameStage(stageId, newName) {
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, name: newName } : s)));
  }

  function handleAddStage(name) {
    const maxOrder = stages.reduce((max, s) => Math.max(max, s.sort_order), 0);
    const newStage = {
      id: `stage-${Date.now()}`,
      board_id: 'mock-board-id',
      name,
      color: '#94a3b8',
      sort_order: maxOrder + 1000,
    };
    setStages((prev) => [...prev, newStage]);
  }

  function handleRemoveStage(stageId) {
    const hasProspects = prospects.some((p) => p.stage_id === stageId);
    if (hasProspects) {
      alert('Move or delete the prospects in this stage first.');
      return;
    }
    setStages((prev) => prev.filter((s) => s.id !== stageId));
  }

  return (
    <Board
      stages={stages}
      prospects={prospects}
      openProspectId={openProspectId}
      onOpenProspect={setOpenProspectId}
      onCloseProspect={() => setOpenProspectId(null)}
      onMoveProspect={handleMoveProspect}
      onUpdateProspect={handleUpdateProspect}
      onDeleteProspect={handleDeleteProspect}
      onRenameStage={handleRenameStage}
      onAddStage={handleAddStage}
      onRemoveStage={handleRemoveStage}
    />
  );
}
