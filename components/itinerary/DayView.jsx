'use client';

import { toISODate } from '@/lib/calendarUtils';
import { fmt, toMin, layoutClusters } from '@/lib/time';
import { useDragSelect } from './useDragSelect';

const DAY_START = 0;
const DAY_END = 24 * 60;
const PX_PER_MIN = 1;
const GRID_H = (DAY_END - DAY_START) * PX_PER_MIN;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function timedEvents(events, iso) {
  return events.filter((e) => !e.allDay && e.startDate === iso && e.endDate === iso);
}

function allDayEvents(events, iso) {
  return events.filter((e) => e.allDay || e.startDate !== e.endDate).filter((e) => e.startDate <= iso && e.endDate >= iso);
}

export default function DayView({ cursor, events, onSlotClick, onEventClick }) {
  const iso = toISODate(cursor);
  const allDay = allDayEvents(events, iso);
  let evs = timedEvents(events, iso).map((ev) => {
    const s = toMin(ev.startTime || '00:00');
    const e = toMin(ev.endTime || '23:59');
    return { start: s, end: Math.max(e, s + 15), raw: ev };
  });
  evs = layoutClusters(evs);

  const { colRef, drag, handleMouseDown, DEFAULT_DURATION } = useDragSelect({
    pxPerMin: PX_PER_MIN,
    dayStart: DAY_START,
    dayEnd: DAY_END,
    onSelect: (startTime, endTime) => onSlotClick(cursor, startTime, endTime),
  });

  return (
    <div className="calshell">
      {allDay.length > 0 && (
        <div className="day-allday">
          {allDay.map((ev) => (
            <div
              key={ev.id}
              className="allday-chip"
              style={{ background: ev.color }}
              onClick={() => onEventClick(ev)}
            >
              {ev.title}
            </div>
          ))}
        </div>
      )}
      <div className="scrollarea">
        <div className="day-grid">
          <div className="gutter">
            <div className="gutter-inner" style={{ height: GRID_H }}>
              {HOURS.map((h) => (
                <div className="hr" key={h} style={{ top: h * 60 * PX_PER_MIN }}>
                  {fmt(h * 60)}
                </div>
              ))}
            </div>
          </div>
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
              const height = Math.max((ev.end - ev.start) * PX_PER_MIN - 2, 18);
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
                    {ev.raw.location ? ` · ${ev.raw.location}` : ''}
                    {ev.raw.sourceLabel ? ` · ${ev.raw.sourceLabel}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
