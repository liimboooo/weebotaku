import React from "react";
import "./Categories.css";

export default function Categories({ categories }) {
  return (
    <section className="categories-section">
      <h2>Categories</h2>
      <div className="categories">
        {categories.map((cat) => (
          <button key={cat}>{cat}</button>
        ))}
      </div>
    </section>
  );
}
