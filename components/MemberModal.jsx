'use client';

import { useEffect, useRef, useState } from 'react';
import { DAYS } from '@/lib/time';
import { PALETTE, colorForIndex } from '@/lib/colors';
import { readAndCompressImage } from '@/lib/storage';
import { parseScheduleText } from '@/lib/scheduleParser';

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

export default function MemberModal({ open, member, members, events, onClose, onSave, onDelete, onViewPhoto }) {
  const isEdit = !!member;
  const [name, setName] = useState('');
  const [schedulePhoto, setSchedulePhoto] = useState(null);
  const [color, setColor] = useState(PALETTE[0]);
  const [exact, setExact] = useState(true);
  const [schedule, setSchedule] = useState(emptySchedule());
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanNotice, setScanNotice] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (member) {
      setName(member.name);
      setSchedulePhoto(member.schedulePhoto || null);
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
      setSchedulePhoto(null);
      setColor(colorForIndex(members.length));
      setExact(true);
      setSchedule(emptySchedule());
    }
    setError('');
    setScanError('');
    setScanNotice('');
  }, [open, member]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  async function scanPhoto(photoDataUrl) {
    if (!photoDataUrl) return;
    setScanning(true);
    setScanError('');
    setScanNotice('');
    try {
      // Free, on-device text recognition (tesseract.js) — runs entirely in the
      // browser, no API key, no server call, no cost. It reads text, not table
      // layout, so it works best on plain typed/printed schedule lists and is
      // much less reliable on photographed calendar-app grid screenshots.
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      let text = '';
      try {
        const result = await worker.recognize(photoDataUrl);
        text = result?.data?.text || '';
      } finally {
        await worker.terminate();
      }

      const found = parseScheduleText(text);
      if (found.length === 0) {
        setScanNotice(
          'Couldn’t confidently read any classes off that photo — this works best on a clear, typed schedule list. Add classes manually below instead, or try re-scanning a cropped/clearer photo.'
        );
        return;
      }
      setSchedule((s) => {
        const next = { ...s };
        found.forEach((c) => {
          next[c.day] = [
            ...next[c.day],
            { start: c.start, end: c.end, label: c.label, approx: !!c.approx, _key: `r${rowKeySeq++}` },
          ];
        });
        return next;
      });
      setScanNotice(
        `Best-effort read: added ${found.length} class${found.length === 1 ? '' : 'es'} from the photo — please check each one below, times and labels can come out wrong.`
      );
    } catch {
      setScanError('Could not read that photo. Try again, or add classes manually below.');
    } finally {
      setScanning(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Higher resolution than a typical avatar — this is a reference document,
      // so keep enough detail to read times/labels back off it later.
      const dataUrl = await readAndCompressImage(file, 1100, 0.85);
      setSchedulePhoto(dataUrl);
      scanPhoto(dataUrl);
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
      { id: member?.id, name: trimmed, schedulePhoto, color, exact },
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
            <label>Schedule photo</label>
            <p className="field-hint">
              Upload a photo of their schedule and it's scanned for free, on-device (no account, no upload to
              any server) to try to fill in the classes below. Works best on a clear, typed schedule list —
              screenshots of calendar-app grids are much harder to read automatically, so double-check the
              results either way. No photo, or scanning comes up empty? Just add classes manually further down.
            </p>
            {schedulePhoto ? (
              <div className="schedule-photo-block">
                <img
                  className="schedule-photo-preview"
                  src={schedulePhoto}
                  alt="Schedule reference"
                  onClick={() => onViewPhoto(schedulePhoto)}
                  title="Click to view full size"
                />
                <div className="schedule-photo-actions">
                  <button type="button" className="btn small" onClick={() => onViewPhoto(schedulePhoto)}>
                    View full size
                  </button>
                  <button
                    type="button"
                    className="btn small primary"
                    disabled={scanning}
                    onClick={() => scanPhoto(schedulePhoto)}
                  >
                    {scanning ? 'Scanning…' : 'Re-scan photo'}
                  </button>
                  <button type="button" className="btn small" onClick={() => fileInputRef.current?.click()}>
                    Replace
                  </button>
                  <button type="button" className="btn small ghost" onClick={() => setSchedulePhoto(null)}>
                    Remove
                  </button>
                </div>
                {scanning && <p className="field-hint">Reading the photo on-device (free, no upload)…</p>}
                {!scanning && scanNotice && <p className="field-hint scan-ok">{scanNotice}</p>}
                {!scanning && scanError && <p className="field-hint scan-error">{scanError}</p>}
              </div>
            ) : (
              <button type="button" className="btn small" onClick={() => fileInputRef.current?.click()}>
                Upload schedule photo
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFile} />
          </div>

          <div className="field">
            <label>Weekly schedule {schedulePhoto ? '— review the scanned classes below' : '— add classes manually'}</label>
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
