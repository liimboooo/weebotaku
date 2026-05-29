import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.99 },
};

const SCROLL_KEY = "scroll_positions";

function getScrollMap() {
  try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}"); } catch { return {}; }
}

function saveScroll(path, y) {
  const map = getScrollMap();
  map[path] = y;
  try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(map)); } catch {}
}

export default function AnimatedPage({ children }) {
  const { pathname, key } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType === "POP") {
      const saved = getScrollMap()[pathname + key];
      if (typeof saved === "number") {
        requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: "instant" }));
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, key, navType]);

  useEffect(() => {
    const onScroll = () => saveScroll(pathname + key, window.scrollY);
    let timer;
    const debounced = () => { clearTimeout(timer); timer = setTimeout(onScroll, 120); };
    window.addEventListener("scroll", debounced, { passive: true });
    return () => {
      window.removeEventListener("scroll", debounced);
      clearTimeout(timer);
      saveScroll(pathname + key, window.scrollY);
    };
  }, [pathname, key]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
