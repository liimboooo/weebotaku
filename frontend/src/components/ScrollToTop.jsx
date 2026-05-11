import React from "react";
import { ChevronUp } from "lucide-react";
import "./ScrollToTop.css";

export default function ScrollToTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scroll = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      className={`scroll-to-top ${visible ? "visible" : ""}`}
      onClick={scroll}
      aria-label="Scroll to top"
    >
      <ChevronUp size={20} />
    </button>
  );
}
