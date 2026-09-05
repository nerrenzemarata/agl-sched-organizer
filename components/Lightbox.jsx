'use client';

export default function Lightbox({ src, onClose }) {
  return (
    <div className={'lightbox' + (src ? ' open' : '')} onClick={(e) => e.target.classList.contains('lightbox') && onClose()}>
      <button className="close" onClick={onClose}>
        &times;
      </button>
      {src && <img src={src} alt="Member photo" />}
    </div>
  );
}
