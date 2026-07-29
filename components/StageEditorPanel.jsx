'use client';

import { useState } from 'react';

// Reachable only from edit mode (DESIGN.md section 6). Local-only for now --
// onRename/onAdd/onRemove are where the stage API calls go once wired up.
export default function StageEditorPanel({ stages, onRename, onAdd, onRemove, onClose }) {
  const [newStageName, setNewStageName] = useState('');

  function handleAdd() {
    if (!newStageName.trim()) return;
    onAdd(newStageName.trim());
    setNewStageName('');
  }

  return (
    <div className="stage-editor">
      <div className="stage-editor__header">
        <h2>Edit stages</h2>
        <button className="sheet__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <ul className="stage-editor__list">
        {stages.map((stage) => (
          <li key={stage.id} className="stage-editor__row">
            <span className="column__dot" style={{ backgroundColor: stage.color }} />
            <input
              className="stage-editor__input"
              value={stage.name}
              onChange={(e) => onRename(stage.id, e.target.value)}
            />
            <button
              className="stage-editor__remove"
              onClick={() => onRemove(stage.id)}
              aria-label={`Remove ${stage.name}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="stage-editor__add">
        <input
          className="stage-editor__input"
          placeholder="New stage name"
          value={newStageName}
          onChange={(e) => setNewStageName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="button button--primary" onClick={handleAdd}>
          Add stage
        </button>
      </div>
    </div>
  );
}
