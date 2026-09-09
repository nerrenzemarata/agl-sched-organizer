'use client';

import { useEffect, useRef, useState } from 'react';
import { PALETTE } from '@/lib/colors';

export default function ItineraryLegend({ itineraries, visible, onToggle, onOpen, onChangeColor }) {
  const [pickerFor, setPickerFor] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!pickerFor) return;
    function handleClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setPickerFor(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [pickerFor]);

  return (
    <div className="legend" ref={rootRef}>
      {itineraries.map((it) => (
        <div
          key={it.id}
          className={'chip' + (visible[it.id] ? '' : ' off')}
          style={{ '--chip-color': it.color, position: 'relative' }}
          onClick={() => onToggle(it.id)}
        >
          <span
            className="dot"
            style={{ background: it.color, cursor: 'pointer' }}
            title="Change color"
            onClick={(e) => {
              e.stopPropagation();
              setPickerFor(pickerFor === it.id ? null : it.id);
            }}
          />
          <span>{it.name}</span>
          <button
            type="button"
            className="iconbtn"
            title="Open this itinerary's board"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(it.id);
            }}
          >
            &#8599;
          </button>

          {pickerFor === it.id && (
            <div className="color-popover" onClick={(e) => e.stopPropagation()}>
              <div className="color-row">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={'color-swatch' + (c === it.color ? ' selected' : '')}
                    style={{ background: c }}
                    title={c}
                    onClick={() => {
                      onChangeColor(it.id, c);
                      setPickerFor(null);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
