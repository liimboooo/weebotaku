import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';

export default function SearchResultCard({ item, onAdd }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: item.id, data: { item } });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className="tierlists-search-card"
      style={style}
      {...listeners}
      {...attributes}
    >
      <div className="tierlists-search-card-img">
        {item.image ? (
          <img src={item.image} alt={item.name} draggable={false} loading="lazy" />
        ) : (
          <div className="tierlists-search-card-fallback">{item.name.charAt(0)}</div>
        )}
      </div>

      <button
        className="tierlists-search-card-add"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        title="Add to unranked"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
