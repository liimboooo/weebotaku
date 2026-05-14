import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Star } from 'lucide-react';

export default function TierCard({ id, item, isDragOverlay = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: id || item.id, data: { item } });

  const style = isDragOverlay
    ? { opacity: 0.9, transform: 'scale(1.05)', zIndex: 9999 }
    : transform
      ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
      : undefined;

  const card = (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      className={`tier-card ${isDragging ? 'tier-card--dragging' : ''}`}
      style={style}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
    >
      <div className="tier-card-image">
        {item.image ? (
          <img src={item.image} alt={item.name} draggable={false} />
        ) : (
          <div className="tier-card-fallback">{item.name.charAt(0)}</div>
        )}
      </div>
      <div className="tier-card-body">
        <span className="tier-card-name">{item.name}</span>
        <div className="tier-card-meta">
          {item.rating > 0 && (
            <span className="tier-card-rating">
              <Star size={10} />
              {item.rating.toFixed(1)}
            </span>
          )}
          {item.studio && (
            <span className="tier-card-studio">{item.studio}</span>
          )}
        </div>
      </div>
    </div>
  );

  if (isDragOverlay) {
    return (
      <div className="tier-card-overlay" style={{ transform: 'scale(1.05)', zIndex: 9999 }}>
        {card}
      </div>
    );
  }

  return card;
}
