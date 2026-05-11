import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Categories.css";

export default function Categories({ categories }) {
  const navigate = useNavigate();

  if (!categories || categories.length === 0) return null;

  return (
    <section className="categories-section">
      <div className="section-title">
        <h2>Browse by Genre</h2>
        <p>Explore anime across every genre</p>
      </div>
      <div className="categories-grid">
        {categories.map((cat, i) => (
          <motion.button
            key={cat}
            className="category-chip"
            onClick={() => navigate(`/search?q=${encodeURIComponent(cat)}`)}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ y: -3, borderColor: "rgba(230, 54, 54, 0.4)" }}
          >
            {cat}
          </motion.button>
        ))}
      </div>
    </section>
  );
}
