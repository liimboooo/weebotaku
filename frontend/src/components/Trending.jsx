import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import "./Trending.css";

export default function Trending() {
  const navigate = useNavigate();

  const trendingItems = [
    { id: 2, name: "One Piece", img: "/beta-2.jpg", rating: 9.1 },
    { id: 6, name: "Jujutsu Kaisen", img: "/beta-3.jpg", rating: 8.95 },
    { id: 4, name: "Attack on Titan", img: "/beta-1.jpg", rating: 9.0 },
    { id: 12, name: "Spy x Family", img: "/beta-3.jpg", rating: 8.6 },
  ];

  return (
    <div className="trending-row">
      {trendingItems.map((item, i) => (
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
          <img src={item.img} alt={item.name} />
          <div className="trending-info">
            <h4>{item.name}</h4>
            <span><TrendingUp size={12} color="#e63636" /> {item.rating}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
