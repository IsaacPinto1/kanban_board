'use client';

import { useCallback, useEffect, useState } from 'react';
import Board from '../../../components/Board';

// See DESIGN.md section 9: fetches client-side and renders its own
// "Board not found" state on a 404, rather than a server-side redirect.
export default function BoardPage({ params }) {
  const { code } = params;
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'not-found' | 'error'
  const [board, setBoard] = useState(null);
  const [stages, setStages] = useState([]);
  const [prospects, setProspects] = useState([]);

  // Pulled out of the effect so it can also be called on window focus
  // (see below) -- not just on the initial mount.
  const loadBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${code}`);
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
      setStatus('error');
    }
  }, [code]);

  // Initial load.
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Refetch whenever the tab regains focus. This is the main defence against
  // staleness: if the board was left open (e.g. on a phone) while someone
  // else made changes, coming back to the tab catches it up before the user
  // acts on outdated info, rather than relying only on conflicts being
  // caught at write time.
  useEffect(() => {
    function handleFocus() {
      loadBoard();
    }
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadBoard]);

  // Refetch a single prospect and merge it into local state. Used when a
  // PATCH is rejected (most commonly a 409 because someone else changed this
  // prospect first -- see handleMoveProspect / handleUpdateProspect) so the
  // optimistic update we made gets corrected without reloading the board.
  async function refetchProspect(prospectId) {
    const res = await fetch(`/api/boards/${code}/prospects/${prospectId}`);
    if (res.ok) {
      const { prospect } = await res.json();
      setProspects((prev) => prev.map((p) => (p.id === prospectId ? prospect : p)));
    }
    // A 404 here means the card was deleted elsewhere; leave it in state for
    // now, the next focus-triggered board reload will drop it.
  }

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
    const previous = prospects.find((p) => p.id === prospectId);
    setProspects((prev) =>
      prev.map((p) =>
        p.id === prospectId ? { ...p, stage_id: newStageId, sort_order: newSortOrder } : p
      )
    );
    const res = await fetch(`/api/boards/${code}/prospects/${prospectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage_id: newStageId,
        sort_order: newSortOrder,
        expected_updated_at: previous?.updated_at,
      }),
    });
    if (res.ok) {
      const { prospect } = await res.json();
      setProspects((prev) => prev.map((p) => (p.id === prospectId ? prospect : p)));
    } else {
      // Most likely a 409: someone else moved/edited this card first, so
      // our optimistic guess above is wrong -- pull the real state instead.
      await refetchProspect(prospectId);
    }
  }

  async function handleUpdateProspect(prospectId, updates) {
    const previous = prospects.find((p) => p.id === prospectId);
    setProspects((prev) => prev.map((p) => (p.id === prospectId ? { ...p, ...updates } : p)));
    const res = await fetch(`/api/boards/${code}/prospects/${prospectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, expected_updated_at: previous?.updated_at }),
    });
    if (res.ok) {
      const { prospect } = await res.json();
      setProspects((prev) => prev.map((p) => (p.id === prospectId ? prospect : p)));
    } else {
      await refetchProspect(prospectId);
    }
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
