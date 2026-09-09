'use client';

import { computeDayFreeWindows, toISODate, WEEKDAY_LABELS } from '@/lib/calendarUtils';
import { fmt } from '@/lib/time';

function fmtEnd(min, dayEnd) {
  return fmt(min === dayEnd ? 0 : min);
}

export default function ItineraryFreeGrid({ days, events, count }) {
  return (
    <section className="summary">
      <h2>Everyone's free at the same time</h2>
      <p className="hint">
        Merged gaps where all {count} visible itinerar{count === 1 ? 'y is' : 'ies are'} clear, this week.
      </p>
      <div className="freegrid">
        {days.map((day) => {
          const iso = toISODate(day);
          const { ranges, dayStart, dayEnd } = computeDayFreeWindows(events, iso);
          const totalFreeMin = ranges.reduce((a, r) => a + (r[1] - r[0]), 0);
          const allFree = totalFreeMin >= dayEnd - dayStart - 1;
          const cls = 'freecard' + (allFree ? ' allday' : '');
          let body;
          if (ranges.length === 0) {
            body = <div className="none">No shared gap</div>;
          } else if (allFree) {
            body = (
              <div className="win">
                Wide open
                <span className="range">all day</span>
              </div>
            );
          } else {
            body = (
              <div className="win">
                {ranges.map((r, i) => (
                  <span className="range" key={i}>
                    {fmt(r[0])}–{fmtEnd(r[1], dayEnd)}
                  </span>
                ))}
              </div>
            );
          }
          return (
            <div className={cls} key={iso}>
              <div className="day">
                {WEEKDAY_LABELS[day.getDay()]} {day.getMonth() + 1}/{day.getDate()}
              </div>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
