'use client';

import { useEffect, useRef, useState } from 'react';
import { DAYS } from '@/lib/time';
import { PALETTE, colorForIndex } from '@/lib/colors';
import { readAndCompressImage } from '@/lib/storage';

function emptySchedule() {
  const s = {};
  DAYS.forEach((d) => {
    s[d] = [];
  });
  return s;
}

let rowKeySeq = 0;
function withKeys(rows) {
  return rows.map((r) => ({ ...r, _key: r._key ?? `r${rowKeySeq++}` }));
}

export default function MemberModal({ open, member, members, events, onClose, onSave, onDelete }) {
  const isEdit = !!member;
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null);
  const [color, setColor] = useState(PALETTE[0]);
  const [exact, setExact] = useState(true);
  const [schedule, setSchedule] = useState(emptySchedule());
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (member) {
      setName(member.name);
      setPhoto(member.photo || null);
      setColor(member.color);
      setExact(member.exact !== false);
      const base = emptySchedule();
      const existing = events[member.id] || {};
      DAYS.forEach((d) => {
        base[d] = withKeys((existing[d] || []).map((ev) => ({ ...ev })));
      });
      setSchedule(base);
    } else {
      setName('');
      setPhoto(null);
      setColor(colorForIndex(members.length));
      setExact(true);
      setSchedule(emptySchedule());
    }
    setError('');
  }, [open, member]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readAndCompressImage(file);
      setPhoto(dataUrl);
    } catch (err) {
      setError('Could not read that image file.');
    }
  }

  function addRow(day) {
    setSchedule((s) => ({
      ...s,
      [day]: [...s[day], { start: '09:00', end: '10:00', label: '', approx: false, _key: `r${rowKeySeq++}` }],
    }));
  }

  function updateRow(day, key, patch) {
    setSchedule((s) => ({
      ...s,
      [day]: s[day].map((r) => (r._key === key ? { ...r, ...patch } : r)),
    }));
  }

  function removeRow(day, key) {
    setSchedule((s) => ({ ...s, [day]: s[day].filter((r) => r._key !== key) }));
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }
    const cleanSchedule = {};
    DAYS.forEach((d) => {
      cleanSchedule[d] = schedule[d]
        .filter((r) => r.start && r.end && r.label.trim() && r.end > r.start)
        .map((r) => ({ start: r.start, end: r.end, label: r.label.trim(), approx: !!r.approx }));
    });
    onSave(
      { id: member?.id, name: trimmed, photo, color, exact },
      cleanSchedule
    );
  }

  function handleDelete() {
    if (member && window.confirm(`Remove ${member.name} and their schedule?`)) {
      onDelete(member.id);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{isEdit ? 'Edit member' : 'Add member'}</h2>
          <button type="button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maria Santos"
            />
          </div>

          <div className="field">
            <label>Photo</label>
            <div className="photo-row">
              {photo ? (
                <img className="photo-preview" src={photo} alt="Preview" />
              ) : (
                <div className="photo-preview placeholder">{(name.trim()[0] || '?').toUpperCase()}</div>
              )}
              <button type="button" className="btn small" onClick={() => fileInputRef.current?.click()}>
                {photo ? 'Change photo' : 'Upload photo'}
              </button>
              {photo && (
                <button type="button" className="btn small ghost" onClick={() => setPhoto(null)}>
                  Remove
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFile}
              />
            </div>
          </div>

          <div className="field">
            <label>Color</label>
            <div className="color-row">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={'color-swatch' + (c === color ? ' selected' : '')}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <label style={{ flexDirection: 'row', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={!exact}
                onChange={(e) => setExact(!e.target.checked)}
                style={{ width: 'auto' }}
              />
              Schedule times are approximate
            </label>
          </div>

          <div className="field">
            <label>Weekly schedule</label>
            <div className="sched-editor">
              {DAYS.map((day) => (
                <details className="sched-day" key={day} open={schedule[day].length > 0}>
                  <summary>
                    {day}
                    <span className="count">
                      {schedule[day].length} {schedule[day].length === 1 ? 'class' : 'classes'}
                    </span>
                  </summary>
                  {schedule[day].map((row) => (
                    <div className="event-row" key={row._key}>
                      <input
                        type="time"
                        value={row.start}
                        onChange={(e) => updateRow(day, row._key, { start: e.target.value })}
                      />
                      <input
                        type="time"
                        value={row.end}
                        onChange={(e) => updateRow(day, row._key, { end: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Subject / label"
                        value={row.label}
                        onChange={(e) => updateRow(day, row._key, { label: e.target.value })}
                      />
                      <label className="approx-toggle">
                        <input
                          type="checkbox"
                          checked={!!row.approx}
                          onChange={(e) => updateRow(day, row._key, { approx: e.target.checked })}
                        />
                        ~approx
                      </label>
                      <button
                        type="button"
                        className="remove-row"
                        title="Remove"
                        onClick={() => removeRow(day, row._key)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button type="button" className="add-row-btn" onClick={() => addRow(day)}>
                    + Add class
                  </button>
                </details>
              ))}
            </div>
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <div>
            {isEdit && (
              <button type="button" className="btn danger" onClick={handleDelete}>
                Delete member
              </button>
            )}
          </div>
          <div className="right">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
