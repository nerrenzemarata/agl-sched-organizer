'use client';

import { useEffect, useState } from 'react';
import { PALETTE } from '@/lib/colors';
import { toISODate } from '@/lib/calendarUtils';

export default function EventModal({ open, event, defaultDate, defaultTime, onClose, onSave, onDelete }) {
  const isEdit = !!event;
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setAllDay(event.allDay);
      setDate(event.startDate);
      setEndDate(event.endDate);
      setStartTime(event.startTime || '09:00');
      setEndTime(event.endTime || '10:00');
      setLocation(event.location || '');
      setDescription(event.description || '');
      setColor(event.color || PALETTE[0]);
    } else {
      const iso = toISODate(defaultDate || new Date());
      setTitle('');
      setAllDay(false);
      setDate(iso);
      setEndDate(iso);
      setStartTime(defaultTime?.startTime || '09:00');
      setEndTime(defaultTime?.endTime || '10:00');
      setLocation('');
      setDescription('');
      setColor(PALETTE[0]);
    }
    setError('');
  }, [open, event, defaultDate, defaultTime]);

  if (!open) return null;

  function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Please enter a title.');
      return;
    }
    if (allDay) {
      if (endDate < date) {
        setError('End date must be on or after the start date.');
        return;
      }
      onSave({
        title: trimmed,
        allDay: true,
        startDate: date,
        endDate,
        startTime: null,
        endTime: null,
        location: location.trim(),
        description: description.trim(),
        color,
      });
    } else {
      if (endTime <= startTime) {
        setError('End time must be after the start time.');
        return;
      }
      onSave({
        title: trimmed,
        allDay: false,
        startDate: date,
        endDate: date,
        startTime,
        endTime,
        location: location.trim(),
        description: description.trim(),
        color,
      });
    }
  }

  function handleDelete() {
    if (event && window.confirm(`Delete "${event.title}"?`)) {
      onDelete(event.id);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-narrow">
        <div className="modal-head">
          <h2>{isEdit ? 'Edit event' : 'Add event'}</h2>
          <button type="button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning shift — Front desk"
            />
          </div>

          <div className="field">
            <label style={{ flexDirection: 'row', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                style={{ width: 'auto' }}
              />
              All-day event
            </label>
          </div>

          {allDay ? (
            <div className="field-row">
              <div className="field">
                <label>Start date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (endDate < e.target.value) setEndDate(e.target.value);
                  }}
                />
              </div>
              <div className="field">
                <label>End date</label>
                <input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          ) : (
            <>
              <div className="field">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Start time</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="field">
                  <label>End time</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="field">
            <label>Location (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Main office"
            />
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Any details worth noting"
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

          {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <div>
            {isEdit && (
              <button type="button" className="btn danger" onClick={handleDelete}>
                Delete event
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
