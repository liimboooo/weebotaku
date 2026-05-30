import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Star, Layers, Mic, MessageSquare } from "lucide-react";
import { fetchTopAnime } from "../services/anilistApi";
import usePrefetchAnime from "../hooks/usePrefetchAnime";
import "./TopTrending.css";

// AniList has no true day/week/month trending window, so map each tab to a
// distinct, meaningful sort to keep the switcher useful.
const TABS = [
  { key: "DAY", filter: "trending" },
  { key: "WEEK", filter: "bypopularity" },
  { key: "MONTH", filter: "" },
];

const LIMIT = 5;

export default function TopTrending() {
  const navigate = useNavigate();
  const prefetch = usePrefetchAnime();
  const [tab, setTab] = useState("DAY");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const cache = useRef({});

  useEffect(() => {
    let cancelled = false;
    const active = TABS.find((t) => t.key === tab);

    if (cache.current[tab]) {
      setItems(cache.current[tab]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchTopAnime(1, active.filter)
      .then((res) => {
        if (cancelled) return;
        const list = (res?.data || []).slice(0, LIMIT);
        cache.current[tab] = list;
        setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  // only top 3 get a themed rank-N class; 4+ fall back to the muted default
  const cardClass = (i) => `trending-card${i < 3 ? ` rank-${i + 1}` : ""}`;

  return (
    <div className="trending-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Top Trending</h2>
        <div className="tabs-container" role="tablist" aria-label="Trending range">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`tab-btn${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.key}
            </button>
          ))}
        </div>
      </div>

      <div className="standings-stack">
        {loading
          ? Array.from({ length: LIMIT }).map((_, i) => (
              <div className={`${cardClass(i)} trending-card--skeleton`} key={`sk-${i}`}>
                <div className="info-cluster">
                  <div className="rank-wrapper">
                    <span className="rank-outline-huge">{i + 1}</span>
                    <span className="rank-solid-mini">{i + 1}</span>
                  </div>
                  <div className="meta-text-block">
                    <div className="skel-line shimmer" />
                    <div className="skel-line skel-line--sm shimmer" />
                  </div>
                </div>
              </div>
            ))
          : items.map((anime, i) => (
              <div
                className={cardClass(i)}
                key={anime.id}
                onClick={() => navigate(`/anime/${anime.id}/info`)}
                onMouseEnter={() => prefetch.onMouseEnter(anime.id)}
                onMouseLeave={prefetch.onMouseLeave}
              >
                <div
                  className="card-bg-artwork"
                  style={{ backgroundImage: `url('${anime.img}')` }}
                  aria-hidden="true"
                />
                <div className="card-gradient-mask" aria-hidden="true" />
                <div className="left-accent-strip" aria-hidden="true" />

                <div className="info-cluster">
                  <div className="rank-wrapper">
                    <span className="rank-outline-huge" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="rank-solid-mini">{i + 1}</span>
                  </div>
                  <div className="meta-text-block">
                    <h3 className="anime-title">{anime.name}</h3>
                    <div className="sub-meta-row">
                      {anime.rating > 0 && (
                        <div className="rating-block">
                          <Star size={12} fill="currentColor" /> {anime.rating.toFixed(1)}
                        </div>
                      )}
                      {anime.type && <span className="type-label">{anime.type}</span>}
                      {anime.episodes > 0 && (
                        <div className="stats-capsule">
                          <div className="stat-item">
                            <Layers size={11} /> {anime.episodes}
                          </div>
                          <span className="stats-divider">/</span>
                          <div className="stat-item">
                            <Mic size={11} /> {anime.episodes}
                          </div>
                          <span className="stats-divider">/</span>
                          <div className="stat-item">
                            <MessageSquare size={11} /> {anime.episodes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  className="glass-play-btn"
                  aria-label={`Play ${anime.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/anime/${anime.id}?ep=1`);
                  }}
                >
                  <Play size={16} fill="currentColor" className="play-icon-adjust" />
                </button>
              </div>
            ))}
      </div>
    </div>
  );
}
