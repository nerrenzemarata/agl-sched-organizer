'use client';

import { useEffect, useRef, useState } from 'react';
import { DAYS } from '@/lib/time';
import { PALETTE, colorForIndex } from '@/lib/colors';
import { readAndCompressImage } from '@/lib/storage';
import { mergeScheduleReadings } from '@/lib/scheduleParser';
import { preprocessForOCR, renderColorCanvas } from '@/lib/imagePreprocess';
import { parseGridSchedule } from '@/lib/gridScheduleParser';

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
  const [photo, setPhoto] = useState(null);
  const [schedulePhoto, setSchedulePhoto] = useState(null);
  const [color, setColor] = useState(PALETTE[0]);
  const [exact, setExact] = useState(true);
  const [schedule, setSchedule] = useState(emptySchedule());
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanNotice, setScanNotice] = useState('');
  const [scanStage, setScanStage] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (member) {
      setName(member.name);
      setPhoto(member.photo || null);
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
      setPhoto(null);
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
    setScanProgress(0);
    setScanStage('Enhancing photo…');
    try {
      // Free, on-device analysis — runs entirely in the browser (tesseract.js),
      // no API key, no server call, no cost. Two different photo shapes need two
      // different strategies:
      //  - a typed/printed list ("Monday 9-10:30 Calculus") → read the text and
      //    parse lines directly.
      //  - a spreadsheet-style weekly grid (day columns × time rows, colored
      //    class blocks) → OCR alone can't see the table structure, so we also
      //    sample pixel colors on the photo itself to find where each colored
      //    block starts/ends, then attach whatever label sits inside it.
      // We try the grid reading first (it's the harder photo type to get right);
      // if the photo doesn't look like a grid, we fall back to the list reading.
      const { dataUrl: cleanedPhoto, width, height } = await preprocessForOCR(photoDataUrl);
      const colorCtx = await renderColorCanvas(photoDataUrl, width, height);

      const { createWorker, PSM } = await import('tesseract.js');
      setScanStage('Loading recognition engine…');
      const worker = await createWorker('eng', undefined, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setScanProgress(Math.round(m.progress * 100));
          }
        },
      });

      let found = [];
      let usedGridReading = false;
      try {
        setScanStage('Analyzing photo — checking for a weekly grid layout…');
        setScanProgress(0);
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
        const gridResult = await worker.recognize(cleanedPhoto, {}, { blocks: true, text: true });

        const gridRows = parseGridSchedule({
          page: gridResult?.data,
          colorCtx,
          imageWidth: width,
          imageHeight: height,
        });

        if (gridRows.length >= 3) {
          found = gridRows;
          usedGridReading = true;
        } else {
          setScanStage('Analyzing photo — reading it as a plain list…');
          setScanProgress(0);
          await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
          const listResult = await worker.recognize(cleanedPhoto);
          found = mergeScheduleReadings([gridResult?.data?.text || '', listResult?.data?.text || '']);
        }
      } finally {
        await worker.terminate();
      }

      setScanStage('Matching days & times…');

      if (found.length === 0) {
        setScanNotice(
          'Analyzed the photo but couldn’t confidently match any classes to specific times. Try cropping tightly to just the schedule, reducing glare, or straightening the photo — or add classes manually below.'
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
        `${usedGridReading ? 'Detected a weekly grid layout and read the colored blocks' : 'Analyzed the photo'} — found ${found.length} class${found.length === 1 ? '' : 'es'}. Please double-check each one below, times and labels can still come out wrong.`
      );
    } catch {
      setScanError('Could not read that photo. Try again, or add classes manually below.');
    } finally {
      setScanning(false);
      setScanStage('');
      setScanProgress(0);
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

  async function handleProfileFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readAndCompressImage(file, 480, 0.85);
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
      { id: member?.id, name: trimmed, photo, schedulePhoto, color, exact },
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
            <label>Profile photo (optional)</label>
            <div className="photo-row">
              {photo ? (
                <img className="photo-preview" src={photo} alt="Profile" />
              ) : (
                <div className="photo-preview placeholder">{(name.trim()[0] || '?').toUpperCase()}</div>
              )}
              <button type="button" className="btn small" onClick={() => profileInputRef.current?.click()}>
                {photo ? 'Change photo' : 'Upload photo'}
              </button>
              {photo && (
                <button type="button" className="btn small ghost" onClick={() => setPhoto(null)}>
                  Remove
                </button>
              )}
              <input ref={profileInputRef} type="file" accept="image/*" hidden onChange={handleProfileFile} />
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
            <label>Schedule photo</label>
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
                {scanning && (
                  <div className="scan-progress">
                    <p className="field-hint">{scanStage || 'Analyzing photo…'}</p>
                    <div className="scan-progress-track">
                      <div className="scan-progress-fill" style={{ width: `${scanProgress}%` }} />
                    </div>
                  </div>
                )}
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
