import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import TierCard from './TierCard';

export default function DroppableTier({ id, label, color, items, delay = 0, pulse = false }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const rowStyle = isOver
    ? { borderColor: 'rgba(255,255,255,0.15)' }
    : undefined;

  return (
    <motion.div
      className={`tier-row ${isOver ? 'tier-row--hover' : ''} ${pulse ? 'tier-row--pulse' : ''}`}
      style={rowStyle}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 28, mass: 0.5 }}
    >
      <div className="tier-label" style={{ backgroundColor: color }}>
        <span>{label}</span>
      </div>
      <div ref={setNodeRef} className="tier-items">
        {items.length === 0 && !isOver && (
          <span className="tier-placeholder">DROP ANIME HERE</span>
        )}
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.85, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.4 }}
            >
              <TierCard id={item.id} item={item} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
