'use client';

import { addDays, startOfWeek, toISODate, isSameDay, WEEKDAY_LABELS } from '@/lib/calendarUtils';
import { fmt, toMin, layoutClusters } from '@/lib/time';
import { useDragSelect } from './useDragSelect';

const DAY_START = 0;
const DAY_END = 24 * 60;
const PX_PER_MIN = 0.8;
const GRID_H = (DAY_END - DAY_START) * PX_PER_MIN;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function timedEventsForDay(events, iso) {
  return events.filter((e) => !e.allDay && e.startDate === iso && e.endDate === iso);
}

function allDayEventsForDay(events, iso) {
  return events.filter((e) => e.allDay || e.startDate !== e.endDate).filter((e) => e.startDate <= iso && e.endDate >= iso);
}

function DayColumn({ day, evs, onSlotClick, onEventClick }) {
  const { colRef, drag, handleMouseDown, DEFAULT_DURATION } = useDragSelect({
    pxPerMin: PX_PER_MIN,
    dayStart: DAY_START,
    dayEnd: DAY_END,
    onSelect: (startTime, endTime) => onSlotClick(day, startTime, endTime),
  });

  return (
    <div
      className="daycol day-draggable"
      style={{ height: GRID_H }}
      ref={colRef}
      onMouseDown={handleMouseDown}
    >
      {drag && (
        <div
          className="day-drag-select"
          style={{
            top: (drag.start - DAY_START) * PX_PER_MIN,
            height: Math.max((drag.end - drag.start) * PX_PER_MIN, 4),
          }}
        >
          {fmt(drag.start)}–{fmt(drag.end > drag.start ? drag.end : drag.start + DEFAULT_DURATION)}
        </div>
      )}
      {evs.map((ev) => {
        const top = (ev.start - DAY_START) * PX_PER_MIN;
        const height = Math.max((ev.end - ev.start) * PX_PER_MIN - 2, 16);
        const widthPct = 100 / ev.cols;
        const leftPct = ev.col * widthPct;
        return (
          <div
            key={ev.raw.id}
            className="ev"
            style={{
              top,
              height,
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
              background: ev.raw.color,
            }}
            title={`${ev.raw.title} · ${fmt(ev.start)}–${fmt(ev.end)}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(ev.raw);
            }}
          >
            <b>{ev.raw.title}</b>
            <span>
              {fmt(ev.start)}–{fmt(ev.end)}
              {ev.raw.sourceLabel ? ` · ${ev.raw.sourceLabel}` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function WeekView({ cursor, events, onSlotClick, onEventClick }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();
  const hasAllDay = days.some((d) => allDayEventsForDay(events, toISODate(d)).length > 0);

  return (
    <div className="calshell">
      <div className="scrollarea">
        <div className="grid">
          <div className="cell-head corner" />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div className={'cell-head' + (isToday ? ' is-today' : '')} key={toISODate(day)}>
                <div className="dname">{WEEKDAY_LABELS[day.getDay()]}</div>
                <div className={'dnum' + (isToday ? ' today-badge' : '')}>{day.getDate()}</div>
              </div>
            );
          })}

          {hasAllDay && (
            <>
              <div className="gutter allday-gutter">all-day</div>
              {days.map((day) => {
                const iso = toISODate(day);
                const evs = allDayEventsForDay(events, iso);
                return (
                  <div className="allday-col" key={iso} onClick={() => onSlotClick(day)}>
                    {evs.map((ev) => (
                      <div
                        key={ev.id}
                        className="allday-chip"
                        style={{ background: ev.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(ev);
                        }}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}

          <div className="gutter">
            <div className="gutter-inner" style={{ height: GRID_H }}>
              {HOURS.map((h) => (
                <div className="hr" key={h} style={{ top: h * 60 * PX_PER_MIN }}>
                  {fmt(h * 60)}
                </div>
              ))}
            </div>
          </div>

          {days.map((day) => {
            const iso = toISODate(day);
            let evs = timedEventsForDay(events, iso).map((ev) => {
              const s = toMin(ev.startTime || '00:00');
              const e = toMin(ev.endTime || '23:59');
              return { start: s, end: Math.max(e, s + 15), raw: ev };
            });
            evs = layoutClusters(evs);
            return (
              <DayColumn key={iso} day={day} evs={evs} onSlotClick={onSlotClick} onEventClick={onEventClick} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
