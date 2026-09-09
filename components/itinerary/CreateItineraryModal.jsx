'use client';

import { useEffect, useRef, useState } from 'react';

export default function CreateItineraryModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setError('');
    setSaving(false);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onCreate(trimmed);
    } catch (err) {
      setError(err.message || 'Could not create the Staff Itinerary.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className="modal modal-narrow" onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>Create a Staff Itinerary</h2>
          <button type="button" onClick={onClose} disabled={saving}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Front Desk Team, September Shifts"
              disabled={saving}
            />
            <p className="field-hint">
              This becomes its own calendar with a shareable link — anyone with the link can view and edit it.
            </p>
          </div>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <div />
          <div className="right">
            <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
