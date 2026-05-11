import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import "./Slider.css";

export default function Slider({ sliderData }) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
    }
  };

  if (!sliderData || sliderData.length === 0) return null;

  return (
    <section className="slider-section">
      <div className="slider-header">
        <h2>Featured Collection</h2>
        <div className="slider-arrows">
          <button onClick={() => scroll(-1)}><ChevronLeft size={18} /></button>
          <button onClick={() => scroll(1)}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="slider-track" ref={scrollRef}>
        {sliderData.map((item) => (
          <motion.div
            key={item.id}
            className="slider-card"
            onClick={() => navigate(`/anime/${item.id}`)}
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="slider-card-img">
              <img src={item.img} alt={item.name} />
              <div className="slider-card-overlay" />
            </div>
            <div className="slider-card-info">
              <h3>{item.name}</h3>
              <div className="slider-card-meta">
                <span><Star size={12} fill="#ffd700" color="#ffd700" /> {item.rating}</span>
                <span>{item.year}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
