'use client';

import { DAYS, DAY_END, DAY_START, computeFreeWindows, fmt } from '@/lib/time';

export default function FreeGrid({ members, events }) {
  return (
    <section className="summary">
      <h2>Everyone's free at the same time</h2>
      <p className="hint">Merged gaps where all {members.length} schedules are clear, 6:00 AM–10:00 PM.</p>
      <div className="freegrid">
        {DAYS.map((day) => {
          const { ranges, nSlots } = computeFreeWindows(members, events, day);
          const totalFreeMin = ranges.reduce((a, r) => a + (r[1] - r[0]), 0);
          const allFree = totalFreeMin >= DAY_END - DAY_START - 1;
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
                    {fmt(r[0])}–{fmt(r[1])}
                  </span>
                ))}
              </div>
            );
          }
          return (
            <div className={cls} key={day}>
              <div className="day">{day}</div>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
