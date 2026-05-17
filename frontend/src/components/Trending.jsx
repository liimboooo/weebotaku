import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { getTrendingAnime } from "../data/animeData";
import "./Trending.css";

export default function Trending() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    getTrendingAnime().then(setItems).catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="trending-row">
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          className="trending-card"
          onClick={() => navigate(`/anime/${item.id}`)}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          whileHover={{ y: -6, scale: 1.02 }}
        >
          <div className="trending-rank">#{i + 1}</div>
          <div className="trending-card-img">
            <img src={item.img} alt={item.name} loading="lazy" />
          </div>
          <div className="trending-card-info">
            <div className="trending-card-title">{item.name}</div>
            <div className="trending-card-rating">
              <TrendingUp size={12} /> {item.rating.toFixed(1)}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
