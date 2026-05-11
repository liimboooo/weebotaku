import React from "react";
import { motion } from "framer-motion";
import AnimatedPage from "./AnimatedPage";
import "./GenericRoutePage.css";

export default function GenericRoutePage({ eyebrow, title, description, sections }) {
  return (
    <AnimatedPage>
      <div className="generic-page">
        <motion.div className="generic-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {eyebrow && <span className="generic-eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p className="generic-desc">{description}</p>}
        </motion.div>
        <div className="generic-body">
          {sections?.map((section, i) => (
            <motion.div
              key={i}
              className="generic-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              {section.heading && <h2>{section.heading}</h2>}
              {section.items && (
                <div className="generic-items">
                  {section.items.map((item, j) => (
                    <div key={j} className="generic-item">
                      <h3>{item.title}</h3>
                      {item.description && <p>{item.description}</p>}
                      {item.meta && <span className="generic-meta">{item.meta}</span>}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedPage>
  );
}
