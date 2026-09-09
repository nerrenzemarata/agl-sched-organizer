'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganizer, deleteOrganizer, listOrganizers } from '@/lib/storage';
import CreateOrganizerModal from '@/components/CreateOrganizerModal';

export default function AglPage() {
  const router = useRouter();
  const [organizers, setOrganizers] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setError('');
    try {
      const list = await listOrganizers();
      setOrganizers(list);
    } catch (err) {
      setError(err.message || 'Could not load Schedule Organizers.');
    } finally {
      setReady(true);
    }
  }

  async function handleCreate(name) {
    setError('');
    try {
      const organizer = await createOrganizer(name);
      router.push(`/o/${organizer.id}`);
    } catch (err) {
      setError(err.message || 'Could not create the Schedule Organizer.');
    }
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
          <p className="sub" style={{ marginBottom: 6 }}>
            <a href="/" className="crumb-back">
              ← Dashboard
            </a>
          </p>
          <h1>Action Group Schedule Organizer</h1>
          <p className="sub">
            Every Schedule Organizer below is shared with anyone who opens this site — no account needed.
            Create one for your group, or open an existing one to view or edit it.
          </p>
        </div>
        <button type="button" className="btn primary btn-create" onClick={() => setCreateOpen(true)}>
          <span className="btn-create-icon">+</span> Create your own Schedule Organizer
        </button>
      </header>

      {error && <p className="sub" style={{ color: 'var(--danger)' }}>{error}</p>}

      {ready && organizers.length === 0 && (
        <div className="empty-state">
          <p className="sub">
            No Schedule Organizers yet — use the button above to create the first one.
          </p>
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
