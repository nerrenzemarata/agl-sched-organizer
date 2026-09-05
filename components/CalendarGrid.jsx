'use client';

import {
  DAYS,
  DAY_START,
  DAY_END,
  GRID_H,
  PX_PER_MIN,
  computeFreeWindows,
  fmt,
  toMin,
  layoutClusters,
} from '@/lib/time';

const HOURS = [];
for (let h = 6; h <= 22; h++) HOURS.push(h);

export default function CalendarGrid({ members, events, visible }) {
  return (
    <div className="calshell">
      <div className="scrollarea">
        <div className="grid">
          <div className="cell-head corner" />
          {DAYS.map((day) => {
            const { busy } = computeFreeWindows(members, events, day);
            return (
              <div className="cell-head" key={day}>
                <div className="dname">{day}</div>
                <div className="availbar" title="Green = everyone free">
                  {busy.map((b, i) => (
                    <i key={i} className={b ? '' : 'free'} />
                  ))}
                </div>
              </div>
            );
          })}

          <div className="gutter">
            <div className="gutter-inner" style={{ height: GRID_H }}>
              {HOURS.map((h) => (
                <div
                  className="hr"
                  key={h}
                  style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }}
                >
                  {fmt(h * 60)}
                </div>
              ))}
            </div>
          </div>

          {DAYS.map((day) => {
            let evs = [];
            members.forEach((p) => {
              if (!visible[p.id]) return;
              (events[p.id]?.[day] || []).forEach((ev) => {
                evs.push({
                  start: toMin(ev.start),
                  end: toMin(ev.end),
                  label: ev.label,
                  approx: !!ev.approx,
                  color: p.color,
                  person: p.name,
                });
              });
            });
            evs = layoutClusters(evs);
            return (
              <div className="daycol" style={{ height: GRID_H }} key={day}>
                {evs.map((ev, i) => {
                  const top = (ev.start - DAY_START) * PX_PER_MIN;
                  const height = Math.max((ev.end - ev.start) * PX_PER_MIN - 2, 16);
                  const widthPct = 100 / ev.cols;
                  const leftPct = ev.col * widthPct;
                  return (
                    <div
                      key={i}
                      className={'ev' + (ev.approx ? ' approx' : '')}
                      style={{
                        top,
                        height,
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        background: ev.color,
                      }}
                      title={`${ev.person} · ${fmt(ev.start)}–${fmt(ev.end)} · ${ev.label}`}
                    >
                      <b>{ev.label}</b>
                      <span>
                        {fmt(ev.start)}–{fmt(ev.end)} · {ev.person.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
