import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Bookmark, Play, Star, Zap } from "lucide-react";
import { addToWatchlist, removeFromWatchlist, loadWatchlist } from "../services/storage";
import Skeleton from "./Skeleton";
import "./Slider.css";

function SliderCard({ item, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const [wishlist, setWishlist] = useState(() => loadWatchlist());
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const inWishlist = wishlist.some(i => String(i.id) === String(item.id));

  const toggleWishlist = (e) => {
    e.stopPropagation();
    if (inWishlist) {
      removeFromWatchlist(item.id);
      setWishlist(loadWatchlist());
    } else {
      setShowStatusMenu(true);
    }
  };

  const addWithStatus = (status, e) => {
    e.stopPropagation();
    addToWatchlist({ ...item, listStatus: status });
    setWishlist(loadWatchlist());
    setShowStatusMenu(false);
  };

  return (
    <motion.div
      className="slider-card"
      onClick={onClick}
      whileHover={{ boxShadow: "0 16px 48px rgba(255,255,255,0.12)" }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="slider-card-thumb">
        {!loaded && <Skeleton variant="image" style={{position:"absolute",inset:0,borderRadius:0}} />}
        {imgErr ? (
          <div className="slider-card-img-fallback">{item.name?.[0] || "?"}</div>
        ) : (
          <img
            src={item.img}
            alt={item.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setImgErr(true)}
            style={{ opacity: loaded ? 1 : 0 }}
          />
        )}
        <div className="slider-card-overlay">
          <button className="slider-card-play" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <Play size={20} fill="currentColor" />
          </button>
          <div className="slider-card-tech">
            <span>{item.episodes} eps</span>
            <span>{item.type || "TV"}</span>
          </div>
        </div>
        <div className="slider-card-badge">
          {item.status === "Ongoing" && <Zap size={10} />}
          {item.status || "Unknown"}
        </div>
        <div className="slider-card-progress" style={{ width: `${Math.round((item.readProgress || 0) * 100)}%` }} />
      </div>
      <div className="slider-card-body">
        <div className="slider-card-head">
          <h3>{item.name}</h3>
          <button className={`slider-wish-btn ${inWishlist ? "active" : ""}`} onClick={toggleWishlist}>
            <Bookmark size={12} fill={inWishlist ? "currentColor" : "none"} />
          </button>
          {showStatusMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowStatusMenu(false); }} />
              <div className="absolute top-8 right-0 bg-zinc-900 border border-zinc-700 rounded-xl py-1 min-w-[130px] shadow-2xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {["Planning","Watching","Completed","Paused","Dropped"].map(s => (
                  <button
                    key={s}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                    onClick={(e) => addWithStatus(s, e)}
                  >{s}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <p className="slider-card-desc">{(item.synopsis || '').replace(/<[^>]*>/g, '')}</p>
        <div className="slider-card-foot">
          <span className="slider-card-rating"><Star size={10} fill="currentColor" /> {item.rating?.toFixed(1)}</span>
          <span className="slider-card-ch"><Play size={10} /> {item.episodes} eps</span>
          {item.genres?.[0] && <span className="slider-card-tag">{item.genres[0]}</span>}
        </div>
      </div>
      <div className="slider-card-glow" />
    </motion.div>
  );
}

export default function Slider({ sliderData, noHeader }) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const t = setTimeout(checkScroll, 100);
    return () => clearTimeout(t);
  }, []);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 340, behavior: "smooth" });
    }
  };

  if (!sliderData || sliderData.length === 0) return null;

  return (
    <section className="slider-section">
      {!noHeader && (
        <div className="slider-header">
          <h2>Featured Collection</h2>
          <div className="slider-arrows">
            <button onClick={() => scroll(-1)}><ChevronLeft size={18} /></button>
            <button onClick={() => scroll(1)}><ChevronRight size={18} /></button>
          </div>
        </div>
      )}
      <div className="slider-track-wrap">
        <div className={`slider-fade-left ${canScrollLeft ? 'visible' : ''}`} />
        <div className={`slider-fade-right ${canScrollRight ? 'visible' : ''}`} />
        {canScrollLeft && (
          <button className="slider-float-arrow slider-float-left" onClick={() => scroll(-1)}>
            <ChevronLeft size={18} />
          </button>
        )}
        {canScrollRight && (
          <button className="slider-float-arrow slider-float-right" onClick={() => scroll(1)}>
            <ChevronRight size={18} />
          </button>
        )}
        <div className="slider-track" ref={scrollRef} onScroll={checkScroll}>
          {sliderData.map((item) => (
            <SliderCard key={item.id} item={item} onClick={() => navigate(`/anime/${item.id}/info`)} />
          ))}
        </div>
      </div>
    </section>
  );
}
