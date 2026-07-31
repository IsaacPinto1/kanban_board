'use client';

import { useState, useEffect, useRef } from 'react';

// Full-screen sheet on mobile (see DESIGN.md section 6 -- friendlier than a
// centered modal on small viewports).
//
// Opens in a clean read-only "view" layout: address as a title, property
// name as a smaller grey subtitle, then rent + a listing-link icon. Notes
// stays directly editable in both modes. The "Edit" button switches to the
// full editable form (the previous default layout) for property name,
// listing URL, and rent -- onSave is where the PATCH call goes once the DB
// is wired up (see README).
export default function CardDetailSheet({ prospect, onClose, onSave, onDelete }) {
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [propertyName, setPropertyName] = useState(prospect.property_name || '');
  const [listingUrl, setListingUrl] = useState(prospect.listing_url || '');
  const [rent, setRent] = useState(prospect.rent != null ? String(prospect.rent) : '');
  const [notes, setNotes] = useState(prospect.notes || '');
  // Tracks whether the mousedown that started this click also landed on the
  // overlay itself (as opposed to inside the sheet). Without this, dragging
  // a text selection or resizing the notes textarea and releasing the mouse
  // past the sheet's edge would fire a click on the overlay and close the
  // modal, even though the interaction started inside it.
  const mouseDownOnOverlay = useRef(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // Same drag-safe close behavior as the main overlay, applied to the
  // confirm dialog's own backdrop.
  const confirmMouseDownOnOverlay = useRef(false);

  useEffect(() => {
    setMode('view');
    setPropertyName(prospect.property_name || '');
    setListingUrl(prospect.listing_url || '');
    setRent(prospect.rent != null ? String(prospect.rent) : '');
    setNotes(prospect.notes || '');
    setConfirmDeleteOpen(false);
    // Deliberately keyed on the id, not the whole `prospect` object: a
    // background refresh can hand us a new object for the *same* card (e.g.
    // its position changed) and we don't want that to reset an in-progress
    // edit or flip back to view mode mid-edit. Only switching to a
    // genuinely different card should reset the draft. See page.js's
    // loadBoard for the other half of this -- it also avoids replacing the
    // currently-open prospect's object while this sheet is open, so in
    // practice this effect only re-runs on a real card change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospect.id]);

  function handleSave() {
    onSave(prospect.id, {
      property_name: propertyName,
      listing_url: listingUrl.trim() || null,
      rent: rent.trim() === '' ? null : Number(rent),
      notes: notes,
    });
    onClose();
  }

  return (
    <div
      className="sheet-overlay"
      onMouseDown={(e) => {
        mouseDownOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (mouseDownOnOverlay.current && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__header">
          <button
            className="button"
            onClick={() => setMode((m) => (m === 'edit' ? 'view' : 'edit'))}
          >
            {mode === 'edit' ? 'Done' : 'Edit'}
          </button>
          <button className="sheet__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {mode === 'view' ? (
          <div className="sheet__view">
            <div className="sheet__title-row">
              <h2 className="sheet__title">{prospect.address}</h2>
              {listingUrl && (
                <a
                  className="sheet__listing-link"
                  href={listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open listing for ${prospect.address}`}
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
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </a>
              )}
            </div>
            {propertyName && <p className="sheet__subtitle">{propertyName}</p>}

            {rent.trim() !== '' && (
              <div className="sheet__meta-row">
                <span className="sheet__rent">${Number(rent).toLocaleString()}</span>
              </div>
            )}
          </div>
        ) : (
          <>
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

            <label className="sheet__label" htmlFor="detail-rent">
              Rent
            </label>
            <input
              id="detail-rent"
              type="number"
              inputMode="numeric"
              className="sheet__input"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              placeholder="e.g. 2500"
            />
          </>
        )}

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
          <button
            className="button button--danger"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Delete
          </button>
          <button className="button button--primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>

      {confirmDeleteOpen && (
        <div
          className="confirm-overlay"
          onMouseDown={(e) => {
            confirmMouseDownOnOverlay.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            if (confirmMouseDownOnOverlay.current && e.target === e.currentTarget) {
              setConfirmDeleteOpen(false);
            }
          }}
        >
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog__message">
              Delete this prospect? This can&apos;t be undone.
            </p>
            <div className="confirm-dialog__actions">
              <button className="button" onClick={() => setConfirmDeleteOpen(false)}>
                Cancel
              </button>
              <button
                className="button button--danger"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  onDelete(prospect.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
