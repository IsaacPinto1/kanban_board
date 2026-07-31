'use client';

import { useState, useEffect } from 'react';

// Full-screen sheet on mobile (see DESIGN.md section 6 -- friendlier than a
// centered modal on small viewports). Local-only edits for now; onSave is
// where the PATCH call goes once the DB is wired up (see README).
export default function CardDetailSheet({ prospect, onClose, onSave, onDelete }) {
  const [propertyName, setPropertyName] = useState(prospect.property_name || '');
  const [listingUrl, setListingUrl] = useState('');
  const [notes, setNotes] = useState(prospect.notes || '');

  useEffect(() => {
    setPropertyName(prospect.property_name || '');
    setListingUrl(prospect.listing_url || '');
    setNotes(prospect.notes || '');
    // Deliberately keyed on the id, not the whole `prospect` object: a
    // background refresh can hand us a new object for the *same* card (e.g.
    // its position changed) and we don't want that to reset an in-progress
    // edit. Only switching to a genuinely different card should reset the
    // draft. See page.js's loadBoard for the other half of this -- it also
    // avoids replacing the currently-open prospect's object while this sheet
    // is open, so in practice this effect only re-runs on a real card change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospect.id]);

  function handleSave() {
    onSave(prospect.id, { 
      property_name: propertyName,
      listing_url: listingUrl.trim() || null,
      notes: notes,
    });
    onClose();
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__header">
          <button className="sheet__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="sheet__address">{prospect.address}</p>

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
        <label className="sheet__label" htmlFor="detail-listing-url">
          Listing URL
        </label>
        <input
          id="detail-listing-url"
          type="url"
          className="sheet__input"
          value={listingUrl}
          onChange={(e) => setListingUrl(e.target.value)}
          placeholder="https://streeteasy.com/..."
        />

        <label className="sheet__label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          className="sheet__textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          placeholder="Anything worth remembering about this one..."
        />

        <div className="sheet__actions">
          <button className="button button--danger" onClick={() => onDelete(prospect.id)}>
            Delete
          </button>
          <button className="button button--primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
