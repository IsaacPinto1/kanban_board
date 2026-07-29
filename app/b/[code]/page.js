'use client';

import { useEffect, useState } from 'react';
import Board from '../../../components/Board';

// See DESIGN.md section 9: fetches client-side and renders its own
// "Board not found" state on a 404, rather than a server-side redirect.
export default function BoardPage({ params }) {
  const { code } = params;
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'not-found' | 'error'
  const [board, setBoard] = useState(null);
  const [stages, setStages] = useState([]);
  const [prospects, setProspects] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/boards/${code}`);
        if (cancelled) return;

        if (res.status === 404) {
          setStatus('not-found');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          return;
        }

        const json = await res.json();
        setBoard(json.board);
        setStages(json.stages);
        setProspects(json.prospects);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // --- Mutation handlers: optimistic local update + API call. ---
  // Each mirrors one of the routes in app/api/boards/[code]/.

  async function handleCreateProspect(newProspect) {
    const res = await fetch(`/api/boards/${code}/prospects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProspect),
    });
    if (res.ok) {
      const { prospect } = await res.json();
      setProspects((prev) => [...prev, prospect]);
    } else {
      const { error } = await res.json();
      alert(error);
    }
  }

  async function handleMoveProspect(prospectId, newStageId, newSortOrder) {
    setProspects((prev) =>
      prev.map((p) =>
        p.id === prospectId ? { ...p, stage_id: newStageId, sort_order: newSortOrder } : p
      )
    );
    await fetch(`/api/boards/${code}/prospects/${prospectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage_id: newStageId, sort_order: newSortOrder }),
    });
    // TODO: on failure, consider reverting local state and surfacing an error.
  }

  async function handleUpdateProspect(prospectId, updates) {
    setProspects((prev) => prev.map((p) => (p.id === prospectId ? { ...p, ...updates } : p)));
    await fetch(`/api/boards/${code}/prospects/${prospectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }

  async function handleDeleteProspect(prospectId) {
    setProspects((prev) => prev.filter((p) => p.id !== prospectId));
    await fetch(`/api/boards/${code}/prospects/${prospectId}`, { method: 'DELETE' });
  }

  async function handleRenameStage(stageId, newName) {
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, name: newName } : s)));
    await fetch(`/api/boards/${code}/stages/${stageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
  }

  async function handleAddStage(name) {
    const res = await fetch(`/api/boards/${code}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const { stage } = await res.json();
      setStages((prev) => [...prev, stage]);
    }
  }

  async function handleRemoveStage(stageId) {
    const res = await fetch(`/api/boards/${code}/stages/${stageId}`, { method: 'DELETE' });
    if (res.ok) {
      setStages((prev) => prev.filter((s) => s.id !== stageId));
    } else {
      const { error } = await res.json();
      alert(error);
    }
  }

  if (status === 'loading') {
    return (
      <main>
        <p>Loading board…</p>
      </main>
    );
  }

  if (status === 'not-found') {
    return (
      <main>
        <h1>Board not found</h1>
        <p>Double-check the code and try again.</p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main>
        <h1>Something went wrong</h1>
        <p>Try refreshing the page.</p>
      </main>
    );
  }

  return (
    <Board
      stages={stages}
      prospects={prospects}
      onMoveProspect={handleMoveProspect}
      onUpdateProspect={handleUpdateProspect}
      onDeleteProspect={handleDeleteProspect}
      onCreateProspect={handleCreateProspect}
      onRenameStage={handleRenameStage}
      onAddStage={handleAddStage}
      onRemoveStage={handleRemoveStage}
    />
  );
}
