'use client';

import { getMonthGrid, toISODate, isSameDay, WEEKDAY_LABELS } from '@/lib/calendarUtils';
import { fmt, toMin } from '@/lib/time';

const MAX_VISIBLE = 3;

function eventsForDay(events, iso) {
  return events
    .filter((e) => e.startDate <= iso && e.endDate >= iso)
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
}

export default function MonthView({ cursor, events, onDayClick, onEventClick }) {
  const days = getMonthGrid(cursor);
  const today = new Date();
  const month = cursor.getMonth();

  return (
    <div className="monthshell">
      <div className="month-weekdays">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="month-weekday">
            {d}
          </div>
        ))}
      </div>
      <div className="month-grid">
        {days.map((day) => {
          const iso = toISODate(day);
          const dayEvents = eventsForDay(events, iso);
          const inMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const visible = dayEvents.slice(0, MAX_VISIBLE);
          const hidden = dayEvents.length - visible.length;
          return (
            <div
              key={iso}
              className={'month-cell' + (inMonth ? '' : ' dim') + (isToday ? ' today' : '')}
              onClick={() => onDayClick(day)}
            >
              <div className="month-cell-num">{day.getDate()}</div>
              <div className="month-cell-events">
                {visible.map((ev) => (
                  <div
                    key={ev.id}
                    className="month-event"
                    style={{ background: ev.color }}
                    title={ev.sourceLabel ? `${ev.title} · ${ev.sourceLabel}` : ev.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                  >
                    {!ev.allDay && ev.startTime && (
                      <span className="month-event-time">{fmt(toMin(ev.startTime))}</span>
                    )}
                    <span className="month-event-title">{ev.title}</span>
                  </div>
                ))}
                {hidden > 0 && <div className="month-more">+{hidden} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
