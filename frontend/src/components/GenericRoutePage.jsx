import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedPage from "./AnimatedPage";

import Background from "./Background";
import "./GenericRoutePage.css";

export default function GenericRoutePage({
  eyebrow,
  title,
  description,
  stats = [],
  sections = [],
  actions = [],
  children,
  className = "",
}) {
  const navigate = useNavigate();

  const goTo = (target) => {
    if (typeof target === "function") {
      target();
      return;
    }
    navigate(target);
  };

  return (
    <AnimatedPage>
      <div className={`generic-route-page ${className}`.trim()}>
        <Background />

        <main className="generic-route-shell">
          <motion.section
            className="generic-route-hero"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="generic-route-copy">
              {eyebrow && <span className="generic-route-eyebrow">{eyebrow}</span>}
              <h1>{title}</h1>
              <p>{description}</p>

              {actions.length > 0 && (
                <div className="generic-route-actions">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className={`generic-route-action ${action.variant || "primary"}`}
                      onClick={() => goTo(action.to)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {stats.length > 0 && (
              <div className="generic-route-stats">
                {stats.map((stat) => (
                  <article key={`${stat.label}-${stat.value}`} className="generic-route-stat-card">
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </article>
                ))}
              </div>
            )}
          </motion.section>

          {sections.map((section) => (
            <section key={section.heading} className="generic-route-section">
              <div className="generic-route-section-head">
                <div>
                  <h2>{section.heading}</h2>
                  {section.description && <p>{section.description}</p>}
                </div>
              </div>

              <div className={`generic-route-grid ${section.layout === "list" ? "list" : "cards"}`}>
                {section.items.map((item) => {
                  const card = (
                    <>
                      <div className="generic-route-card-topline">
                        {item.badge && <span className="generic-route-badge">{item.badge}</span>}
                        {item.meta && <span className="generic-route-meta">{item.meta}</span>}
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      {item.actionLabel && <span className="generic-route-card-cta">{item.actionLabel}</span>}
                    </>
                  );

                  if (item.to) {
                    return (
                      <button key={item.title} type="button" className="generic-route-card" onClick={() => goTo(item.to)}>
                        {card}
                      </button>
                    );
                  }

                  return (
                    <article key={item.title} className="generic-route-card">
                      {card}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {children}
        </main>

      </div>
    </AnimatedPage>
  );
}