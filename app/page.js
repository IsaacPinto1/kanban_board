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
    <main>
      <h1>Rental Kanban</h1>

      <p>Enter a board code to get started.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={code}
          onChange={handleChange}
          placeholder="ABCDEF"
        />

        <button type="submit">Submit</button>
      </form>

      <button
        type="button"
        onClick={handleCreateBoard}
        disabled={creatingBoard}
      >
        {creatingBoard ? 'Creating board...' : 'make me a new board'}
      </button>

      {newBoardCode && (
        <div className="new-board-modal">
          <div className="new-board-modal__content">
            <p>your new code is: {newBoardCode}</p>

            <button
              type="button"
              onClick={handleNewBoardOkay}
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
