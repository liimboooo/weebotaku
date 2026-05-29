import { useRef } from "react";
import { fetchAnimeById } from "../services/anilistApi";

const prefetched = new Set();
const imagePreloaded = new Set();

function preloadImage(url) {
  if (!url || imagePreloaded.has(url)) return;
  imagePreloaded.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

export default function usePrefetchAnime() {
  const timer = useRef(null);

  const onMouseEnter = (id, imgUrl) => {
    if (imgUrl) preloadImage(imgUrl);
    if (!id || prefetched.has(id)) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      prefetched.add(id);
      fetchAnimeById(id).then(detail => {
        const big = detail?.img;
        if (big) preloadImage(big);
      }).catch(() => prefetched.delete(id));
    }, 220);
  };

  const onMouseLeave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return { onMouseEnter, onMouseLeave };
}
