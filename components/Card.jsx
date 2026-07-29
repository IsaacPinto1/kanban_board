'use client';

import { Draggable } from '@hello-pangea/dnd';

// Collapsed card: shows only the address (DESIGN.md section 2/6).
// In edit mode it's a drag handle; outside edit mode, tapping opens the detail view.
export default function Card({ prospect, index, editMode, stageColor, onOpen }) {
  return (
    <Draggable draggableId={prospect.id} index={index} isDragDisabled={!editMode}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card${snapshot.isDragging ? ' card--dragging' : ''}`}
          style={{ borderLeftColor: stageColor, ...provided.draggableProps.style }}
          onClick={() => {
            if (!editMode) onOpen(prospect);
          }}
          role={editMode ? undefined : 'button'}
          tabIndex={editMode ? undefined : 0}
        >
          <span className="card__address">{prospect.address}</span>
        </div>
      )}
    </Draggable>
  );
}
