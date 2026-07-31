'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [code, setCode] = useState('');
  const [newBoardCode, setNewBoardCode] = useState(null);
  const [creatingBoard, setCreatingBoard] = useState(false);

  const router = useRouter();

  const handleChange = (event) => {
    setCode(event.target.value);
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
            <span>or</span>
          </div>

          <button
            type="button"
            className="button landing__new-board"
            onClick={handleCreateBoard}
            disabled={creatingBoard}
          >
            {creatingBoard ? 'Creating board…' : '+ Start a new board'}
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
