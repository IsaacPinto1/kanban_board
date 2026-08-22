'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Mirrors the CUSTOM_CODE_PATTERN in app/api/boards/route.js.
const CUSTOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

const CUSTOM_CODE_HINTS = {
  invalid: 'Use exactly 6 letters and numbers.',
  checking: 'Checking availability…',
  taken: 'That code is already taken.',
  available: 'Code is available!',
};

export default function Home() {
  const [code, setCode] = useState('');
  const [newBoardCode, setNewBoardCode] = useState(null);
  const [creatingBoard, setCreatingBoard] = useState(false);

  const [customCode, setCustomCode] = useState('');
  // idle | invalid | checking | available | taken
  const [customCodeState, setCustomCodeState] = useState('idle');
  const [creatingCustomBoard, setCreatingCustomBoard] = useState(false);

  const router = useRouter();

  const handleChange = (event) => {
    setCode(event.target.value);
  };

  const handleCustomCodeChange = (event) => {
    // Sanitize as they type: uppercase, letters/digits only, matching what
    // the backend will accept.
    const sanitized = event.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    setCustomCode(sanitized);
  };

  // Debounced availability check: reuses GET /api/boards/[code], the same
  // endpoint the "open a board" form uses, since a 200 there just means
  // "a board with this code exists".
  useEffect(() => {
    if (!customCode) {
      setCustomCodeState('idle');
      return;
    }

    if (!CUSTOM_CODE_PATTERN.test(customCode)) {
      setCustomCodeState('invalid');
      return;
    }

    setCustomCodeState('checking');

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/boards/${customCode}`, {
          method: 'GET',
        });
        setCustomCodeState(res.ok ? 'taken' : 'available');
      } catch {
        setCustomCodeState('idle');
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [customCode]);

  const canCreateCustomBoard =
    customCodeState === 'available' && !creatingCustomBoard;

  const handleCreateCustomBoard = async () => {
    if (!canCreateCustomBoard) return;

    setCreatingCustomBoard(true);

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: customCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Someone may have grabbed the code between our availability check
        // and this submit -- re-check state so the message is accurate.
        if (res.status === 409) {
          setCustomCodeState('taken');
        }
        throw new Error(data.error || 'Could not create board');
      }

      setNewBoardCode(data.code);
    } catch (error) {
      alert(error.message);
    } finally {
      setCreatingCustomBoard(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const res = await fetch(`/api/boards/${code.toUpperCase()}`, {
      method: 'GET',
    });

    if (res.ok) {
      router.push(`/b/${code.toUpperCase()}`);
    } else {
      alert('Board not found');
    }
  };

  const handleCreateBoard = async () => {
    setCreatingBoard(true);

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Could not create board');
      }

      setNewBoardCode(data.code);
    } catch (error) {
      alert(error.message);
    } finally {
      setCreatingBoard(false);
    }
  };

  const handleNewBoardOkay = () => {
    router.push(`/b/${newBoardCode}`);
  };

  return (
    <main className="landing">
      <div className="landing__content">
        <p className="landing__eyebrow">No accounts. Just a code.</p>
        <h1 className="landing__title">Rental Kanban</h1>
        <p className="landing__subtitle">
          Track every rental from first contact to move-in — built to run
          one-handed on your phone while you&apos;re standing outside a listing.
        </p>

        <div className="landing__ticket">
          <form className="landing__code-form" onSubmit={handleSubmit}>
            <label className="landing__code-label" htmlFor="board-code">
              Board code
            </label>
            <div className="landing__code-row">
              <input
                id="board-code"
                type="text"
                className="landing__code-input"
                value={code}
                onChange={handleChange}
                placeholder="ABCDEF"
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
              />
              <button type="submit" className="button button--primary landing__code-submit">
                Open
              </button>
            </div>
          </form>

          <div className="landing__divider">
            <span>or start a new board</span>
          </div>

          <div className="landing__custom-code">
            <label className="landing__code-label" htmlFor="custom-board-code">
              Pick your own code
            </label>
            <div className="landing__code-row">
              <input
                id="custom-board-code"
                type="text"
                className="landing__code-input"
                value={customCode}
                onChange={handleCustomCodeChange}
                placeholder="MYCODE"
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
              />
              <button
                type="button"
                className="button button--primary landing__code-submit"
                onClick={handleCreateCustomBoard}
                disabled={!canCreateCustomBoard}
              >
                {creatingCustomBoard ? 'Creating…' : 'Create'}
              </button>
            </div>
            {customCodeState !== 'idle' && (
              <p
                className={`landing__code-status landing__code-status--${customCodeState}`}
              >
                {CUSTOM_CODE_HINTS[customCodeState]}
              </p>
            )}
          </div>

          <div className="landing__divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="button landing__new-board"
            onClick={handleCreateBoard}
            disabled={creatingBoard}
          >
            {creatingBoard ? 'Creating board…' : '+ Generate a random code'}
          </button>
        </div>
      </div>

      {newBoardCode && (
        <div className="new-board-modal">
          <div className="new-board-modal__content">
            <p className="new-board-modal__eyebrow">Your board is ready</p>
            <p className="new-board-modal__code">{newBoardCode}</p>
            <p className="new-board-modal__hint">
              Save this code — it&apos;s the only way back in.
            </p>

            <button
              type="button"
              className="button button--primary"
              onClick={handleNewBoardOkay}
            >
              Take me there
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
