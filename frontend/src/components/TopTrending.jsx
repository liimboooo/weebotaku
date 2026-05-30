import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Play, Star } from "lucide-react";
import { fetchTopAnime } from "../services/anilistApi";
import usePrefetchAnime from "../hooks/usePrefetchAnime";
import "./TopTrending.css";

// AniList has no true day/week/month trending window, so map each tab to a
// distinct, meaningful sort to keep the switcher useful.
const TABS = [
  { key: "DAY", label: "Day", filter: "trending" },
  { key: "WEEK", label: "Week", filter: "bypopularity" },
  { key: "MONTH", label: "Month", filter: "" },
];

const LIMIT = 10;

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

  const hero = items[0];

  return (
    <section className="tt-panel" aria-label="Top Trending">
      {/* mix-blend background artwork from the #1 title */}
      {hero?.img && (
        <div
          className="tt-bg"
          style={{ backgroundImage: `url(${hero.img})` }}
          aria-hidden="true"
        />
      )}

      <div className="tt-inner">
        <header className="tt-header">
          <h2 className="tt-title">
            <Flame size={18} /> Top Trending
          </h2>
        </header>

        <div className="tt-tabs" role="tablist" aria-label="Trending range">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`tt-tab${tab === t.key ? " tt-tab--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.key}
            </button>
          ))}
        </div>

        <ol className="tt-list">
          {loading
            ? Array.from({ length: LIMIT }).map((_, i) => (
                <li className="tt-row tt-row--skeleton" key={`sk-${i}`}>
                  <span className="tt-rank">{i + 1}</span>
                  <div className="tt-thumb tt-shimmer" />
                  <div className="tt-meta">
                    <div className="tt-skel-line tt-shimmer" />
                    <div className="tt-skel-line tt-skel-line--sm tt-shimmer" />
                  </div>
                </li>
              ))
            : items.map((anime, i) => (
                <li
                  className="tt-row"
                  key={anime.id}
                  onClick={() => navigate(`/anime/${anime.id}/info`)}
                  onMouseEnter={() => prefetch.onMouseEnter(anime.id)}
                  onMouseLeave={prefetch.onMouseLeave}
                >
                  <span className="tt-rank" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="tt-thumb">
                    <img src={anime.img} alt={anime.name} loading="lazy" decoding="async" />
                  </div>
                  <div className="tt-meta">
                    <h3 className="tt-name">{anime.name}</h3>
                    <div className="tt-sub">
                      {anime.rating > 0 && (
                        <span className="tt-score">
                          <Star size={11} fill="currentColor" /> {anime.rating.toFixed(1)}
                        </span>
                      )}
                      {anime.genres?.[0] && <span className="tt-genre">{anime.genres[0]}</span>}
                    </div>
                  </div>
                  <button
                    className="tt-play"
                    aria-label={`Play ${anime.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/anime/${anime.id}?ep=1`);
                    }}
                  >
                    <Play size={14} fill="#000" />
                  </button>
                </li>
              ))}
        </ol>
      </div>
    </section>
  );
}
