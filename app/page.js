'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganizer, deleteOrganizer, listOrganizers } from '@/lib/storage';

export default function HomePage() {
  const router = useRouter();
  const [organizers, setOrganizers] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    const list = listOrganizers().slice().sort((a, b) => b.createdAt - a.createdAt);
    setOrganizers(list);
    setReady(true);
  }

  async function handleCreate() {
    const name = window.prompt('Name your Schedule Organizer (e.g. a section or team name)');
    if (name === null) return;
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
          <h1>Action Group Schedule Organizer</h1>
          <p className="sub">
            Each Schedule Organizer is its own private board — create one for your group and it stays
            separate from everyone else's.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={handleCreate}>
          + Create your own Schedule Organizer
        </button>
      </header>

      {error && <p className="sub" style={{ color: 'var(--danger)' }}>{error}</p>}

      {ready && organizers.length === 0 && (
        <p className="sub">
          No Schedule Organizers yet on this browser. Create one to start tracking a group's weekly schedule.
        </p>
      )}

      <div className="org-list">
        {organizers.map((o) => (
          <div key={o.id} className="org-card" onClick={() => router.push(`/o/${o.id}`)}>
            <div>
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
    </div>
  );
}
