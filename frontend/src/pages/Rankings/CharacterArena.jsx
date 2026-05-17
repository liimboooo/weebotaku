import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedPage from "../../components/AnimatedPage";

import Background from "../../components/Background";
import "./ArenaShowcase.css";

export default function CharacterArena() {
  const navigate = useNavigate();

  return (
    <AnimatedPage>
      <div className="arena-page">
        <Background />
        <main className="arena-shell">
          <motion.section className="arena-hero" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
            <div className="arena-copy">
              <span className="arena-eyebrow">The Arena</span>
              <h1 className="arena-title">Character duel</h1>
              <p className="arena-lede">A cinematic face-off with crowd pressure and momentum stacked into every card. Cast your vote on featured matchups.</p>

              <div className="arena-actions">
                <button className="arena-action secondary" type="button" onClick={() => navigate("/rankings/anime")}>Top rankings</button>
                <button className="arena-action secondary" type="button" onClick={() => navigate("/arena")}>Arena hub</button>
              </div>

              <div className="arena-stat-grid">
                {[
                  { value: "—", label: "arena state" },
                  { value: "—", label: "fan votes" },
                  { value: "—", label: "vote split" },
                ].map((stat) => (
                  <article className="arena-stat-card" key={stat.label}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="arena-panel arena-duel-panel">
              <div className="arena-live-head">
                <div>
                  <span className="arena-live-kicker">Coming soon</span>
                  <div className="arena-live-title">Character duels</div>
                  <p className="arena-live-subtitle">Real-time character voting is on the way. Head to rankings in the meantime.</p>
                </div>
                <span className="arena-live-badge"><span className="arena-pulse" /> preview</span>
              </div>
            </div>
          </motion.section>

          <section className="arena-section">
            <div className="arena-section-head">
              <div>
                <span className="arena-section-kicker">How it works</span>
                <h2>Simple duel loop</h2>
                <p className="arena-section-subtitle">Short, readable steps keep the page feeling like a game layer, not a table.</p>
              </div>
            </div>

            <div className="arena-step-grid">
              {[
                { title: "Pick your side", description: "Lock in the character that deserves the next momentum swing.", badge: "Step 1", meta: "Commit fast" },
                { title: "Watch the meter", description: "The live bar shifts as the community leans into a winner.", badge: "Step 2", meta: "Track changes" },
                { title: "Jump to the next duel", description: "Swap immediately into rankings or tier lists when you want another angle.", badge: "Step 3", meta: "Keep moving" },
              ].map((step) => (
                <div key={step.title} className="arena-step-card">
                  <div className="arena-step-topline"><span className="arena-step-badge">{step.badge}</span><span className="arena-step-meta">{step.meta}</span></div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </AnimatedPage>
  );
}