'use client';

import { useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import Column from './Column';
import CardDetailSheet from './CardDetailSheet';
import StageEditorPanel from './StageEditorPanel';
import AddProspectModal from './AddProspectModal';
import { useRouter } from 'next/navigation';



// Renders entirely from props -- no fetch/DB calls in here. The parent page
// owns the data and passes callbacks, so this component works the same
// whether the data came from mockData.js or a real API. See README.md
// "Wiring up the database" for how the parent page changes, not this file.
export default function Board({
  stages,
  prospects,
  openProspectId,
  onOpenProspect,
  onCloseProspect,
  onMoveProspect,
  onUpdateProspect,
  onDeleteProspect,
  onCreateProspect,
  onRenameStage,
  onAddStage,
  onRemoveStage,
}) {
  const [editMode, setEditMode] = useState(false);
  const [stageEditorOpen, setStageEditorOpen] = useState(false);
  const [addProspectOpen, setAddProspectOpen] = useState(false);

  const router = useRouter();

  const sortedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order);
  const openProspect = prospects.find((p) => p.id === openProspectId) || null;

  function prospectsForStage(stageId) {
    return prospects
      .filter((p) => p.stage_id === stageId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  function handleDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return; // dropped outside any column
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Compute a new sort_order for the dropped card based on its neighbors
    // in the destination column. Simple approach: place it between the
    // surrounding cards' sort_order values (or +/- 1000 at the ends).
    const destStageId = destination.droppableId;
    const destList = prospectsForStage(destStageId).filter((p) => p.id !== draggableId);
    const before = destList[destination.index - 1];
    const after = destList[destination.index];

    let newSortOrder;
    if (before && after) newSortOrder = (before.sort_order + after.sort_order) / 2;
    else if (before) newSortOrder = before.sort_order + 1000;
    else if (after) newSortOrder = after.sort_order - 1000;
    else newSortOrder = 1000;

    onMoveProspect(draggableId, destStageId, newSortOrder);
  }

  return (
    <div className="board">
      <div className="board__toolbar">
        <button className="button button--primary" onClick={() => setAddProspectOpen(true)}>
          + Add prospect
        </button>
        <button
          className={`button${editMode ? ' button--primary' : ''}`}
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? 'Done editing' : 'Edit'}
        </button>
        {editMode && (
          <button className="button" onClick={() => setStageEditorOpen(true)}>
            Edit stages
          </button>
        )}
        <button className="button board__back-button" onClick={() => router.push("/")}>
          Back
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board__columns">
          {sortedStages.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              prospects={prospectsForStage(stage.id)}
              editMode={editMode}
              onOpenCard={(p) => onOpenProspect(p.id)}
            />
          ))}
        </div>
      </DragDropContext>

      {openProspect && (
        <CardDetailSheet
          prospect={openProspect}
          onClose={onCloseProspect}
          onSave={onUpdateProspect}
          onDelete={async (id) => {
            await onDeleteProspect(id);
            onCloseProspect();
          }}
        />
      )}

      {stageEditorOpen && (
        <StageEditorPanel
          stages={sortedStages}
          onRename={onRenameStage}
          onAdd={onAddStage}
          onRemove={onRemoveStage}
          onClose={() => setStageEditorOpen(false)}
        />
      )}

      {addProspectOpen && (
        <AddProspectModal
          stages={sortedStages}
          onClose={() => setAddProspectOpen(false)}
          onCreate={onCreateProspect}
        />
      )}
    </div>
  );
}
