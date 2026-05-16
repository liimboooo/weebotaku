import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export default function TierCard({ id, item, isDragOverlay = false, onRemove }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: id || item.id, data: { item } });

  const style = isDragOverlay
    ? {
        opacity: 0.95,
        transform: 'scale(1.08) rotate(-2deg)',
        zIndex: 9999,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }
    : transform
      ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }
      : undefined;

  const genres = item.genres?.slice(0, 2) || [];

  const card = (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      className={`tier-card ${isDragging ? 'tier-card--dragging' : ''} ${imgLoaded ? 'tier-card--loaded' : ''}`}
      style={style}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
    >
      <div className={`tier-card-image ${!imgLoaded && !imgError ? 'tier-card-image--loading' : ''}`}>
        {item.image && !imgError ? (
          <img
            src={item.image}
            alt=""
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="tier-card-fallback">{item.name?.charAt(0) || '?'}</div>
        )}
        {genres.length > 0 && (
          <div className="tier-card-genres">
            {genres.join(' · ')}
          </div>
        )}
        {!isDragOverlay && onRemove && (
          <button className="tier-card-remove" onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} title="Remove">
            ×
          </button>
        )}
      </div>
    </div>
  );

  if (isDragOverlay) {
    return (
      <div className="tier-card-overlay">
        {card}
      </div>
    );
  }

  return card;
}
