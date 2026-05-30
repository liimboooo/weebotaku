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

const LIMIT = 10;

function RankNumber({ n }) {
  return (
    <div className="tt-rank">
      <span className="tt-rank-bg" aria-hidden="true">{n}</span>
      <span className="tt-rank-fg">{n}</span>
    </div>
  );
}

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

  const rankClass = (i) => `tt-row--${i < 3 ? i + 1 : "n"}`;

  return (
    <section className="tt-panel" aria-label="Top Trending">
      <div className="tt-inner">
        <header className="tt-header">
          <h2 className="tt-title">Top Trending</h2>
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
        </header>

        <ol className="tt-list">
          {loading
            ? Array.from({ length: LIMIT }).map((_, i) => (
                <li className={`tt-row tt-row--skeleton ${rankClass(i)}`} key={`sk-${i}`}>
                  <div className="tt-content">
                    <RankNumber n={i + 1} />
                    <div className="tt-meta">
                      <div className="tt-skel-line tt-shimmer" />
                      <div className="tt-skel-line tt-skel-line--sm tt-shimmer" />
                    </div>
                  </div>
                </li>
              ))
            : items.map((anime, i) => (
                <li
                  className={`tt-row ${rankClass(i)}`}
                  key={anime.id}
                  onClick={() => navigate(`/anime/${anime.id}/info`)}
                  onMouseEnter={() => prefetch.onMouseEnter(anime.id)}
                  onMouseLeave={prefetch.onMouseLeave}
                >
                  {/* left-edge accent line */}
                  <span className="tt-accent" aria-hidden="true" />
                  {/* grayscale -> color backdrop */}
                  <div
                    className="tt-bg"
                    style={{ backgroundImage: `url(${anime.img})` }}
                    aria-hidden="true"
                  />
                  {/* left-to-right dark gradient mask */}
                  <div className="tt-shade" aria-hidden="true" />

                  <div className="tt-content">
                    <RankNumber n={i + 1} />
                    <div className="tt-meta">
                      <h3 className="tt-name">{anime.name}</h3>
                      <div className="tt-sub">
                        {anime.rating > 0 && (
                          <span className="tt-score">
                            <Star size={12} fill="currentColor" /> {anime.rating.toFixed(1)}
                          </span>
                        )}
                        {anime.type && <span className="tt-type">{anime.type}</span>}
                        {anime.episodes > 0 && (
                          <span className="tt-pill">
                            <span className="tt-pill-item">
                              <Layers size={11} /> {anime.episodes}
                            </span>
                            <span className="tt-pill-div">/</span>
                            <span className="tt-pill-item">
                              <Mic size={11} /> SUB
                            </span>
                            <span className="tt-pill-div">/</span>
                            <span className="tt-pill-item">
                              <MessageSquare size={11} /> DUB
                            </span>
                          </span>
                        )}
                      </div>
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
                    <Play size={15} fill="currentColor" />
                  </button>
                </li>
              ))}
        </ol>
      </div>
    </section>
  );
}
