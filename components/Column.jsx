'use client';

import { Droppable } from '@hello-pangea/dnd';
import Card from './Card';

export default function Column({ stage, prospects, editMode, onOpenCard }) {
  return (
    <div className="column">
      <div className="column__header" style={{ borderTopColor: stage.color }}>
        <span className="column__dot" style={{ backgroundColor: stage.color }} />
        <h2 className="column__title">{stage.name}</h2>
        <span className="column__count">{prospects.length}</span>
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column__list${snapshot.isDraggingOver ? ' column__list--over' : ''}`}
          >
            {prospects.map((prospect, index) => (
              <Card
                key={prospect.id}
                prospect={prospect}
                index={index}
                editMode={editMode}
                stageColor={stage.color}
                onOpen={onOpenCard}
              />
            ))}
            {provided.placeholder}
            {prospects.length === 0 && (
              <p className="column__empty">No prospects here yet.</p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
