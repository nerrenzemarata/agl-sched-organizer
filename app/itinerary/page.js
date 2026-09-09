'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listItineraries, createItinerary, deleteItinerary } from '@/lib/itineraryStorage';
import CreateItineraryModal from '@/components/itinerary/CreateItineraryModal';

export default function StaffItineraryListPage() {
  const router = useRouter();
  const [itineraries, setItineraries] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setError('');
    try {
      const list = await listItineraries();
      setItineraries(list);
    } catch (err) {
      setError(err.message || 'Could not load the Staff Itineraries.');
    } finally {
      setReady(true);
    }
  }

  async function handleCreate(name) {
    setError('');
    try {
      const itinerary = await createItinerary(name);
      router.push(`/itinerary/${itinerary.id}`);
    } catch (err) {
      setError(err.message || 'Could not create the Staff Itinerary.');
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm('Delete this Staff Itinerary? Since it is shared by link, this deletes it for everyone with the link.')) return;
    setError('');
    try {
      await deleteItinerary(id);
      refresh();
    } catch (err) {
      setError(err.message || 'Could not delete this Staff Itinerary.');
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
          <h1>Staff Itinerary</h1>
          <p className="sub">
            Google-Calendar-style boards for shifts, trips, and appointments — shared with anyone who opens
            the link, no account needed.
          </p>
        </div>
        <div className="header-actions">
          <a href="/itinerary/overview" className="btn">
            View merged calendar
          </a>
          <button type="button" className="btn primary btn-create" onClick={() => setCreateOpen(true)}>
            <span className="btn-create-icon">+</span> Create your own Staff Itinerary
          </button>
        </div>
      </header>

      {error && (
        <p className="sub" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      {ready && itineraries.length === 0 && (
        <div className="empty-state">
          <p className="sub">No Staff Itineraries yet — use the button above to create the first one.</p>
        </div>
      )}

      <div className="org-list">
        {itineraries.map((it) => (
          <div key={it.id} className="org-card" onClick={() => router.push(`/itinerary/${it.id}`)}>
            <div className="org-card-icon">{(it.name.trim()[0] || '?').toUpperCase()}</div>
            <div className="org-card-body">
              <h2>{it.name}</h2>
              <p className="org-meta">Created {new Date(it.createdAt).toLocaleDateString()}</p>
            </div>
            <button
              type="button"
              className="btn ghost danger-hover"
              title="Delete this Staff Itinerary"
              onClick={(e) => handleDelete(e, it.id)}
            >
              &#10005;
            </button>
          </div>
        ))}
      </div>

      <CreateItineraryModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </div>
  );
}
