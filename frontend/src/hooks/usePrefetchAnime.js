import { useRef } from "react";
import { fetchAnimeById } from "../services/anilistApi";

const prefetched = new Set();

export default function usePrefetchAnime() {
  const timer = useRef(null);

  const onMouseEnter = (id) => {
    if (!id || prefetched.has(id)) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      prefetched.add(id);
      fetchAnimeById(id).catch(() => prefetched.delete(id));
    }, 220);
  };

  const onMouseLeave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return { onMouseEnter, onMouseLeave };
}
