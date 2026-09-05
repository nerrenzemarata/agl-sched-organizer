'use client';

export default function Legend({ members, visible, onToggle, onViewPhoto, onEdit, onAddClick }) {
  return (
    <div className="legend">
      {members.map((m) => (
        <div
          key={m.id}
          className={'chip' + (visible[m.id] ? '' : ' off')}
          onClick={() => onToggle(m.id)}
        >
          <span className="dot" style={{ background: m.color }} />
          <span>{m.name}</span>
          {m.exact ? null : <span className="tag">~approx</span>}
          {m.schedulePhoto && (
            <button
              type="button"
              className="iconbtn"
              title="View original schedule photo"
              onClick={(e) => {
                e.stopPropagation();
                onViewPhoto(m);
              }}
            >
              &#128247;
            </button>
          )}
          <button
            type="button"
            className="iconbtn"
            title="Edit member"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(m);
            }}
          >
            &#9998;
          </button>
        </div>
      ))}
      <button type="button" className="chip add-chip" onClick={onAddClick}>
        + Add member
      </button>
    </div>
  );
}
