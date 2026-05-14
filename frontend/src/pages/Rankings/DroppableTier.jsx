import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import TierCard from './TierCard';

export default function DroppableTier({ id, label, color, items, delay = 0, isUnranked = false }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <motion.div
      className={`tier-row ${isOver ? 'tier-row--hover' : ''} ${isUnranked ? 'tier-row--unranked' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      {!isUnranked && (
        <div className="tier-label" style={{ backgroundColor: color }}>
          <span>{label}</span>
        </div>
      )}
      <div ref={setNodeRef} className="tier-items">
        {items.length === 0 && !isOver && (
          <span className="tier-placeholder">
            {isUnranked ? 'Drag anime here to unrank them' : 'Drop anime here'}
          </span>
        )}
        {items.map((item) => (
          <TierCard key={item.id} id={item.id} item={item} />
        ))}
      </div>
    </motion.div>
  );
}
