import React, { useEffect } from "react";
import "particles.js";

export default function Background() {
  useEffect(() => {
    if (window.particlesJS) {
      window.particlesJS("particles-js", {
        particles: {
          number: { value: 180, density: { enable: true, value_area: 800 } },
          color: { value: "#fff" }, // particles color
          shape: { type: "circle" },
          opacity: { value: 0.3 },
          size: { value: 4, random: true },
          line_linked: { enable: false },
          move: { enable: true, speed: 0.4, direction: "right", random: true },
        },
        retina_detect: true,
      });
    }
  }, []);

  return (
    <div
      id="particles-js"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "radial-gradient(circle at top left, #950923 10%, #111113 30%)",
        zIndex: -1,
      }}
    ></div>
  );
}
