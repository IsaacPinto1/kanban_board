'use client';

import { useState } from 'react';

// Opened from Board.jsx's "Add prospect" button. address is required
// (schema: not null); property_name and notes are optional.
export default function AddProspectModal({ stages, onClose, onCreate }) {
  const [address, setAddress] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [notes, setNotes] = useState('');
  const [stageId, setStageId] = useState(stages[0]?.id || '');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!address.trim()) {
      setError('Address is required');
      return;
    }
    if (!stageId) {
      setError('Pick a stage');
      return;
    }
    onCreate({
      address: address.trim(),
      property_name: propertyName.trim() || null,
      notes: notes.trim() || null,
      stage_id: stageId,
    });
    onClose();
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__header">
          <h2 style={{ margin: 0, fontSize: 16 }}>Add prospect</h2>
          <button className="sheet__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <label className="sheet__label" htmlFor="address">
          Address *
        </label>
        <input
          id="address"
          className="sheet__input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="12 Wattle St, Subiaco WA"
          autoFocus
        />

        <label className="sheet__label" htmlFor="property_name">
          Property name
        </label>
        <input
          id="property_name"
          className="sheet__input"
          value={propertyName}
          onChange={(e) => setPropertyName(e.target.value)}
          placeholder="e.g. Wattle St Apartment"
        />

        <label className="sheet__label" htmlFor="stage">
          Stage
        </label>
        <select
          id="stage"
          className="sheet__input"
          value={stageId}
          onChange={(e) => setStageId(e.target.value)}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <label className="sheet__label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          className="sheet__textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Anything worth remembering about this one..."
        />

        {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: -8, marginBottom: 12 }}>{error}</p>}

        <div className="sheet__actions">
          <button className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button--primary" onClick={handleSubmit}>
            Add prospect
          </button>
        </div>
      </div>
    </div>
  );
}