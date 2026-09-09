'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EventModal from '@/components/itinerary/EventModal';
import MonthView from '@/components/itinerary/MonthView';
import WeekView from '@/components/itinerary/WeekView';
import DayView from '@/components/itinerary/DayView';
import {
  getItinerary,
  renameItinerary,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '@/lib/itineraryStorage';
import { addDays, addMonths, formatMonthYear, formatWeekRange, formatDayHeading } from '@/lib/calendarUtils';

const VIEWS = ['month', 'week', 'day'];

export default function StaffItineraryPage() {
  const { id } = useParams();
  const router = useRouter();

  const [itinerary, setItinerary] = useState(null);
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [draftDate, setDraftDate] = useState(null);
  const [draftTime, setDraftTime] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError('');
    (async () => {
      try {
        const [it, evs] = await Promise.all([getItinerary(id), listEvents(id)]);
        if (cancelled) return;
        setItinerary(it);
        setEvents(evs);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load this Staff Itinerary.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function refreshEvents() {
    try {
      const evs = await listEvents(id);
      setEvents(evs);
    } catch (err) {
      setError(err.message || 'Could not load events.');
    }
  }

  async function handleRename() {
    const next = window.prompt('Rename this Staff Itinerary', itinerary?.name || '');
    if (next === null) return;
    const name = next.trim();
    if (!name) return;
    try {
      await renameItinerary(id, name);
      setItinerary((it) => (it ? { ...it, name } : it));
    } catch (err) {
      window.alert(err.message || 'Could not rename this Staff Itinerary.');
    }
  }

  function goToday() {
    setCursor(new Date());
  }
  function goPrev() {
    setCursor((d) => (view === 'month' ? addMonths(d, -1) : view === 'week' ? addDays(d, -7) : addDays(d, -1)));
  }
  function goNext() {
    setCursor((d) => (view === 'month' ? addMonths(d, 1) : view === 'week' ? addDays(d, 7) : addDays(d, 1)));
  }

  function openAdd(date, startTime, endTime) {
    setEditingEvent(null);
    setDraftDate(date || cursor);
    setDraftTime(startTime && endTime ? { startTime, endTime } : null);
    setModalOpen(true);
  }
  function openEdit(ev) {
    setEditingEvent(ev);
    setDraftDate(null);
    setDraftTime(null);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditingEvent(null);
    setDraftDate(null);
    setDraftTime(null);
  }

  async function handleSave(payload) {
    setError('');
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, payload);
      } else {
        await createEvent(id, payload);
      }
      closeModal();
      refreshEvents();
    } catch (err) {
      setError(err.message || 'Could not save this event.');
    }
  }

  async function handleDelete(eventId) {
    setError('');
    try {
      await deleteEvent(eventId);
      closeModal();
      refreshEvents();
    } catch (err) {
      setError(err.message || 'Could not delete this event.');
    }
  }

  if (ready && (loadError || !itinerary)) {
    return (
      <div className="wrap">
        <header className="top">
          <div>
            <h1>{loadError ? 'Could not load this board' : 'Itinerary not found'}</h1>
            <p className="sub">
              {loadError || "This Staff Itinerary doesn't exist, or its link is wrong."}
            </p>
          </div>
          <button type="button" className="btn primary" onClick={() => router.push('/itinerary')}>
            ← All Staff Itineraries
          </button>
        </header>
      </div>
    );
  }

  const label =
    view === 'month' ? formatMonthYear(cursor) : view === 'week' ? formatWeekRange(cursor) : formatDayHeading(cursor);

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <p className="sub" style={{ marginBottom: 6 }}>
            <a href="/itinerary" className="crumb-back">
              ← All Staff Itineraries
            </a>
          </p>
          <h1>{itinerary?.name || 'Staff Itinerary'}</h1>
          <p className="sub">A shared calendar for shifts, trips, and appointments.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn" onClick={handleRename}>
            Rename
          </button>
          <button type="button" className="btn primary" onClick={() => openAdd(cursor)}>
            + Add event
          </button>
        </div>
      </header>

      {error && (
        <p className="sub" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <div className="cal-toolbar">
        <div className="cal-nav">
          <button type="button" className="btn small" onClick={goToday}>
            Today
          </button>
          <button type="button" className="btn ghost small" onClick={goPrev} aria-label="Previous">
            ‹
          </button>
          <button type="button" className="btn ghost small" onClick={goNext} aria-label="Next">
            ›
          </button>
          <span className="cal-label">{label}</span>
        </div>
        <div className="cal-view-switch">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              className={'btn small' + (view === v ? ' primary' : ' ghost')}
              onClick={() => setView(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {ready && view === 'month' && (
        <MonthView cursor={cursor} events={events} onDayClick={openAdd} onEventClick={openEdit} />
      )}
      {ready && view === 'week' && (
        <WeekView cursor={cursor} events={events} onSlotClick={openAdd} onEventClick={openEdit} />
      )}
      {ready && view === 'day' && (
        <DayView cursor={cursor} events={events} onSlotClick={openAdd} onEventClick={openEdit} />
      )}

      <EventModal
        open={modalOpen}
        event={editingEvent}
        defaultDate={draftDate}
        defaultTime={draftTime}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
