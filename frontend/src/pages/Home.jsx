import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, PlayCircle, RefreshCw, Sparkles, TrendingUp, Users } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import AnimatedPage from "../components/AnimatedPage";

import Slider from "../components/Slider";
import LiveRooms from "../components/LiveRooms";
import Categories from "../components/Categories";
import Background from "../components/Background";
import { fetchTopAnime, fetchSeasonalAnime, fetchAnimeGenres } from "../services/jikanApi";
import { fetchRandomQuote, fetchWaifuImage } from "../services/communityApi";
import "./Home.css";

gsap.registerPlugin(ScrollTrigger);

const ContinueWatching = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [animeMap, setAnimeMap] = useState({});

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    const recent = stored.slice(0, 4);
    setHistory(recent);
    recent.forEach(async (item) => {
      if (!animeMap[item.animeId]) {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${item.animeId}`);
          const json = await res.json();
          if (json.data) {
            setAnimeMap(prev => ({
              ...prev,
              [item.animeId]: {
                id: json.data.mal_id,
                name: json.data.title_english || json.data.title,
                img: json.data.images?.jpg?.large_image_url || json.data.images?.jpg?.image_url || "",
              }
            }));
          }
        } catch {}
      }
    });
  }, []);

  if (history.length === 0) return null;

  const validItems = history.filter(item => animeMap[item.animeId]);
  if (validItems.length === 0) return null;

  return (
    <div className="continue-watching-section">
      <div className="section-title">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="title-with-icon"
        >
          <Clock color="#e63636" size={24} />
          <h2>Continue Watching</h2>
        </motion.div>
        <p>Resume your journey where you left off</p>
      </div>
      <div className="history-grid">
        {validItems.map((item) => {
          const anime = animeMap[item.animeId];
          return (
            <div
              key={item.animeId}
              className="history-card-mini"
              onClick={() => navigate(`/anime/${anime.id}`)}
            >
              <div className="mini-img-wrap">
                <img src={anime.img} alt={anime.name} />
                <div className="mini-overlay">
                  <ion-icon name="play"></ion-icon>
                </div>
              </div>
              <div className="mini-info">
                <h4>{anime.name}</h4>
                <p>Episode {item.episode}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const [spotlight, setSpotlight] = useState(null);
  const [seasonPicks, setSeasonPicks] = useState([]);
  const [trendingList, setTrendingList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [decorImg, setDecorImg] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [topAir, topAll, seasonal, genres] = await Promise.allSettled([
          fetchTopAnime(1, "airing"),
          fetchTopAnime(1, ""),
          fetchSeasonalAnime(),
          fetchAnimeGenres(),
        ]);

        if (topAir.status === "fulfilled" && topAir.value.data.length > 0) {
          setSpotlight(topAir.value.data[0]);
        }

        if (topAll.status === "fulfilled") {
          setTrendingList(topAll.value.data.filter(a => a.id !== spotlight?.id).slice(0, 15));
        }

        if (seasonal.status === "fulfilled") {
          setSeasonPicks(seasonal.value.data.slice(0, 10));
        }

        if (genres.status === "fulfilled") {
          setCategories(genres.value);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    fetchRandomQuote().then(setQuote).catch(() => {});
    fetchWaifuImage().then(r => setDecorImg(r.url)).catch(() => {});
  }, []);

  const refreshQuote = () => {
    setQuoteLoading(true);
    fetchRandomQuote().then(q => { setQuote(q); setQuoteLoading(false); }).catch(() => setQuoteLoading(false));
  };

  useGSAP(() => {
    gsap.utils.toArray(".section-title").forEach((title) => {
      gsap.from(title, {
        scrollTrigger: {
          trigger: title,
          start: "top 90%",
        },
        x: -30,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out"
      });
    });
  });

  return (
    <AnimatedPage>
      <div className="home-container">
        <Background />

        {loading ? (
          <div className="home-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#666' }}>
            <p>Loading...</p>
          </div>
        ) : (
          <>
            {spotlight && (
              <section className="home-spotlight">
                <div className="home-spotlight-copy">
                  <div className="spotlight-kicker">
                    <Sparkles size={14} /> Featured now
                  </div>
                  <h1>{spotlight.name}</h1>
                  <p>{spotlight.synopsis}</p>
                  <div className="spotlight-meta">
                    <span>{spotlight.status}</span>
                    <span>{spotlight.year}</span>
                    <span>{spotlight.episodes} episodes</span>
                    <span>{spotlight.studio}</span>
                  </div>
                  <div className="spotlight-actions">
                    <button className="spotlight-primary-btn" onClick={() => navigate(`/anime/${spotlight.id}`)}>
                      <PlayCircle size={18} /> Watch now
                    </button>
                  </div>
                  <div className="spotlight-microcopy">
                    <span>Curated every session</span>
                    <span>Best viewed full-screen</span>
                  </div>
                  {quote && (
                    <div className="spotlight-quote">
                      <p className="spotlight-quote-text">"{quote.quote}"</p>
                      <div className="spotlight-quote-attribution">
                        <span className="spotlight-quote-char">{quote.character}</span>
                        <span className="spotlight-quote-dash">—</span>
                        <span className="spotlight-quote-anime">{quote.anime}</span>
                        <button className="spotlight-quote-refresh" onClick={refreshQuote} disabled={quoteLoading}>
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="home-spotlight-art" onClick={() => navigate(`/anime/${spotlight.id}`)}>
                  <img src={spotlight.img} alt={spotlight.name} />
                  <div className="home-spotlight-art-glow" />
                  <div className="home-spotlight-art-panel">
                    <span>Featured story</span>
                    <strong>{spotlight.name}</strong>
                    <p>Tap in for the full watch page, then jump back into the arena flow.</p>
                  </div>
                  {decorImg && (
                    <img src={decorImg} alt="" className="spotlight-decor-char" />
                  )}
                </div>
              </section>
            )}

            {trendingList.length > 0 && (
              <>
                <div className="section-title">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="title-with-icon"
                  >
                    <TrendingUp color="#e63636" size={24} />
                    <h2>Trending Now</h2>
                  </motion.div>
                  <p>The most watched anime this week</p>
                </div>
                <Slider sliderData={trendingList} />
              </>
            )}

            <ContinueWatching />

            {seasonPicks.length > 0 && (
              <>
                <div className="section-title">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="title-with-icon"
                  >
                    <Users color="#e63636" size={24} />
                    <h2>Season Picks</h2>
                  </motion.div>
                  <p>Top ongoing anime worth following right now</p>
                </div>
                <Slider sliderData={seasonPicks} />
              </>
            )}

            <div id="live-rooms">
              <LiveRooms />
            </div>

            {categories.length > 0 && <Categories categories={categories} />}
          </>
        )}
      </div>
    </AnimatedPage>
  );
}
