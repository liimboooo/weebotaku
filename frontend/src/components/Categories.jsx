import React from "react";
import { motion } from "framer-motion";
import { Drama } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Categories.css";

export default function Categories({ categories }) {
  const navigate = useNavigate();

  return (
    <section className="categories-section">
      <div className="section-title">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="title-with-icon"
        >
          <Drama color="#e63636" size={24} />
          <h2>Browse by Genre</h2>
        </motion.div>
        <p>Find your next favorite anime</p>
      </div>
      <div className="categories-grid">
        {categories.map((cat) => (
          <div 
            key={cat} 
            className="category-card"
            onClick={() => navigate(`/search?genre=${cat}`)}
          >
            <h3>{cat}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}
