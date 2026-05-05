import React, { useEffect } from "react";
import "particles.js";

export default function Background() {
  useEffect(() => {
    if (window.particlesJS) {
      window.particlesJS("particles-js", {
        particles: {
          number: { value: 25, density: { enable: true, value_area: 1500 } }, // Reduced from 60
          color: { value: "#e63636" },
          shape: { type: "circle" },
          opacity: { value: 0.1 }, // Reduced from 0.15
          size: { value: 2, random: true }, // Reduced from 3
          line_linked: { enable: false },
          move: { enable: true, speed: 0.15, direction: "none", random: true }, // Reduced speed
        },
        retina_detect: false,
        interactivity: { enable: false }, // Disable mouse interaction
      });
    }
  }, []);

  return (
    <div
      id="particles-js"
      className="animated-bg"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none"
      }}
    >
      <div className="bg-gradient-overlay"></div>
    </div>
  );
}
