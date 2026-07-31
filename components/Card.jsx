'use client';

import { Draggable } from '@hello-pangea/dnd';

// Collapsed card: shows the address, rent (when available, in small text),
// and a link to the external rental listing (when available).
export default function Card({ prospect, index, editMode, stageColor, onOpen }) {
  return (
    <Draggable
      draggableId={prospect.id}
      index={index}
      isDragDisabled={!editMode}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card${snapshot.isDragging ? ' card--dragging' : ''}`}
          style={{
            borderLeftColor: stageColor,
            ...provided.draggableProps.style,
          }}
          onClick={() => {
            if (!editMode) onOpen(prospect);
          }}
          role={editMode ? undefined : 'button'}
          tabIndex={editMode ? undefined : 0}
        >
          <div className="card__body">
            <span className="card__address">{prospect.address}</span>
            {prospect.rent != null && (
              <span className="card__rent">${Number(prospect.rent).toLocaleString()}</span>
            )}
          </div>

          {prospect.listing_url && (
            <a
              className="card__listing-link"
              href={prospect.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open listing for ${prospect.address}`}
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 3h7v7" />
                <path d="M10 14L21 3" />
                <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
              </svg>
            </a>
          )}
        </div>
      )}
    </Draggable>
  );
}
