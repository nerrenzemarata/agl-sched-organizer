'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ItineraryLegend from '@/components/itinerary/ItineraryLegend';
import ItineraryFreeGrid from '@/components/itinerary/ItineraryFreeGrid';
import MonthView from '@/components/itinerary/MonthView';
import WeekView from '@/components/itinerary/WeekView';
import DayView from '@/components/itinerary/DayView';
import { listItineraries, listAllEvents, updateItineraryColor } from '@/lib/itineraryStorage';
import { colorForIndex } from '@/lib/colors';
import {
  addDays,
  addMonths,
  startOfWeek,
  formatMonthYear,
  formatWeekRange,
  formatDayHeading,
} from '@/lib/calendarUtils';

const VIEWS = ['month', 'week', 'day'];

export default function ItineraryOverviewPage() {
  const router = useRouter();

  const [itineraries, setItineraries] = useState([]);
  const [rawEvents, setRawEvents] = useState([]);
  const [visible, setVisible] = useState({});
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError('');
    (async () => {
      try {
        const [its, evs] = await Promise.all([listItineraries(), listAllEvents()]);
        if (cancelled) return;
        const sorted = [...its].sort((a, b) => a.createdAt - b.createdAt);
        setItineraries(sorted);
        setRawEvents(evs);
        setVisible((v) => {
          const next = { ...v };
          sorted.forEach((it) => {
            if (!(it.id in next)) next[it.id] = true;
          });
          return next;
        });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load the merged calendar.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const coloredItineraries = useMemo(
    () => itineraries.map((it, i) => ({ ...it, color: it.color || colorForIndex(i) })),
    [itineraries]
  );

  const colorById = useMemo(() => {
    const m = {};
    coloredItineraries.forEach((it) => {
      m[it.id] = it.color;
    });
    return m;
  }, [coloredItineraries]);

  const nameById = useMemo(() => {
    const m = {};
    itineraries.forEach((it) => {
      m[it.id] = it.name;
    });
    return m;
  }, [itineraries]);

  const events = useMemo(
    () =>
      rawEvents
        .filter((ev) => visible[ev.itineraryId])
        .map((ev) => ({
          ...ev,
          color: colorById[ev.itineraryId] || ev.color,
          sourceLabel: nameById[ev.itineraryId] || '',
        })),
    [rawEvents, visible, colorById, nameById]
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const visibleCount = coloredItineraries.filter((it) => visible[it.id]).length;

  function toggleVisible(id) {
    setVisible((v) => ({ ...v, [id]: !v[id] }));
  }

  function openItinerary(id) {
    router.push(`/itinerary/${id}`);
  }

  async function handleChangeColor(id, color) {
    setItineraries((its) => its.map((it) => (it.id === id ? { ...it, color } : it)));
    try {
      await updateItineraryColor(id, color);
    } catch (err) {
      setError(err.message || 'Could not save that color.');
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
          <h1>All Itineraries</h1>
          <p className="sub">
            Every Staff Itinerary's events in one calendar, color-coded by itinerary — so you can see
            everything at a glance. Tap a name below to hide/show it, or click an event to open its board and
            edit it there.
          </p>
        </div>
      </header>

      {error && (
        <p className="sub" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      {ready && itineraries.length === 0 && (
        <div className="empty-state">
          <p className="sub">No Staff Itineraries yet — create one first.</p>
        </div>
      )}

      {itineraries.length > 0 && (
        <>
          <ItineraryLegend
            itineraries={coloredItineraries}
            visible={visible}
            onToggle={toggleVisible}
            onOpen={openItinerary}
            onChangeColor={handleChangeColor}
          />

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

          <ItineraryFreeGrid days={weekDays} events={events} count={visibleCount} />

          {ready && view === 'month' && (
            <MonthView cursor={cursor} events={events} onDayClick={() => {}} onEventClick={(ev) => openItinerary(ev.itineraryId)} />
          )}
          {ready && view === 'week' && (
            <WeekView cursor={cursor} events={events} onSlotClick={() => {}} onEventClick={(ev) => openItinerary(ev.itineraryId)} />
          )}
          {ready && view === 'day' && (
            <DayView cursor={cursor} events={events} onSlotClick={() => {}} onEventClick={(ev) => openItinerary(ev.itineraryId)} />
          )}
        </>
      )}
    </div>
  );
}
