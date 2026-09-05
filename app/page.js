'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganizer, deleteOrganizer, listOrganizers } from '@/lib/storage';
import CreateOrganizerModal from '@/components/CreateOrganizerModal';

export default function HomePage() {
  const router = useRouter();
  const [organizers, setOrganizers] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    const list = listOrganizers().slice().sort((a, b) => b.createdAt - a.createdAt);
    setOrganizers(list);
    setReady(true);
  }

  async function handleCreate(name) {
    const organizer = await createOrganizer(name);
    router.push(`/o/${organizer.id}`);
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm('Delete this Schedule Organizer? Since boards are shared by link, this deletes it for everyone with the link.')) return;
    setError('');
    try {
      await deleteOrganizer(id);
      refresh();
    } catch (err) {
      setError(err.message || 'Could not delete the Schedule Organizer.');
    }
  }

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Action Group Schedule Organizer</h1>
          <p className="sub">
            Each Schedule Organizer is its own private board — create one for your group and it stays
            separate from everyone else's.
          </p>
        </div>
        <button type="button" className="btn primary btn-create" onClick={() => setCreateOpen(true)}>
          <span className="btn-create-icon">+</span> Create your own Schedule Organizer
        </button>
      </header>

      {error && <p className="sub" style={{ color: 'var(--danger)' }}>{error}</p>}

      {ready && organizers.length === 0 && (
        <div className="empty-state">
          <p className="sub">No Schedule Organizers yet on this browser.</p>
          <button type="button" className="btn primary" onClick={() => setCreateOpen(true)}>
            + Create your first Schedule Organizer
          </button>
        </div>
      )}

      <div className="org-list">
        {organizers.map((o) => (
          <div key={o.id} className="org-card" onClick={() => router.push(`/o/${o.id}`)}>
            <div className="org-card-icon">{(o.name.trim()[0] || '?').toUpperCase()}</div>
            <div className="org-card-body">
              <h2>{o.name}</h2>
              <p className="org-meta">Created {new Date(o.createdAt).toLocaleDateString()}</p>
            </div>
            <button
              type="button"
              className="btn ghost danger-hover"
              title="Delete this Schedule Organizer"
              onClick={(e) => handleDelete(e, o.id)}
            >
              &#10005;
            </button>
          </div>
        ))}
      </div>

      <CreateOrganizerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
