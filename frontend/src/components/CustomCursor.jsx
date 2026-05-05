import React, { useEffect, useState, useRef } from 'react';
import './CustomCursor.css';

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dotPosition, setDotPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const requestRef = useRef();
  const lastPosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Disable on touch devices for performance
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    const updatePosition = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);

    const handleMouseOver = (e) => {
      if (
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'A' ||
        e.target.closest('.search-result-card') ||
        e.target.closest('.genre-pill') ||
        e.target.style.cursor === 'pointer'
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  // Smooth follow for the larger circle - only animate when position changes
  useEffect(() => {
    // Skip if position hasn't changed significantly
    const dx = Math.abs(position.x - lastPosition.current.x);
    const dy = Math.abs(position.y - lastPosition.current.y);
    
    if (dx < 1 && dy < 1) return;
    
    lastPosition.current = position;

    const animate = () => {
      setDotPosition(prev => ({
        x: prev.x + (position.x - prev.x) * 0.15,
        y: prev.y + (position.y - prev.y) * 0.15
      }));
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [position.x, position.y]);

  if (!isVisible) return null;

  return (
    <>
      <div 
        className={`custom-cursor-dot ${isHovering ? 'hovering' : ''} ${isMouseDown ? 'active' : ''}`}
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      />
      <div 
        className={`custom-cursor-outline ${isHovering ? 'hovering' : ''} ${isMouseDown ? 'active' : ''}`}
        style={{ left: `${dotPosition.x}px`, top: `${dotPosition.y}px` }}
      />
    </>
  );
};

export default CustomCursor;
