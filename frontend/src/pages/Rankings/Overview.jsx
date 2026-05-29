import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedPage from "../../components/AnimatedPage";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import Background from "../../components/Background";
import "./ArenaShowcase.css";

export default function Overview() {
  useDocumentTitle("Arena Overview");
  const navigate = useNavigate();

  return (
    <AnimatedPage>
      <div className="arena-page">
        <Background />
        <main className="arena-shell">
          <motion.section className="arena-hero" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
            <div className="arena-copy">
              <span className="arena-eyebrow">Arena overview</span>
              <h1 className="arena-title">Momentum snapshot</h1>
              <p className="arena-lede">A condensed read on the arena so the section has a clear starting point before you dive into battles or tier boards.</p>
              <div className="arena-actions">
                <button className="arena-action primary" type="button" onClick={() => navigate("/rankings/anime")}>Top rankings</button>
                <button className="arena-action secondary" type="button" onClick={() => navigate("/arena/tier-lists")}>Tier lists</button>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </AnimatedPage>
  );
}