import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Flame, PlayCircle, Shuffle, Sparkles, Swords, TrendingUp, Users, Video, Zap } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Slider from "../components/Slider";
import FeaturedAnime from "../components/FeaturedAnime";
import Trending from "../components/Trending";
import LiveRooms from "../components/LiveRooms";
import NewEpisodes from "../components/NewEpisodes";
import Categories from "../components/Categories";
import Background from "../components/Background";
import { getFeaturedAnime, getAllGenres, getTrendingAnime, getNewEpisodes, getLatestAnime, getSeasonPicks, getAiringTodayAnime, getAnimeById } from "../data/animeData";
import "./Home.css";

gsap.registerPlugin(ScrollTrigger);

const ContinueWatching = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    setHistory(stored.slice(0, 4));
  }, []);

  if (history.length === 0) return null;

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
        {history.map((item) => {
          const anime = getAnimeById(item.animeId);
          if (!anime) return null;
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

const TodaySchedulePreview = () => {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const items = getAiringTodayAnime().slice(0, 4);

  if (items.length === 0) return null;

  return (
    <section className="schedule-preview-section">
      <div className="section-title schedule-preview-head">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="title-with-icon"
        >
          <Clock color="#e63636" size={24} />
          <h2>Today on Air</h2>
        </motion.div>
        <div className="section-cta-row">
          <p>{today} schedule preview</p>
          <button className="section-cta" onClick={() => navigate("/schedule")}>Open schedule</button>
        </div>
      </div>
      <div className="schedule-preview-grid">
        {items.map((anime) => (
          <div className="schedule-preview-card" key={anime.id} onClick={() => navigate(`/anime/${anime.id}`)}>
            <img src={anime.img} alt={anime.name} />
            <div className="schedule-preview-content">
              <div className="schedule-preview-topline">
                <span className="preview-status">Live</span>
                <span className="preview-time">Ep {anime.currentEp + 1}</span>
              </div>
              <h3>{anime.name}</h3>
              <p>{anime.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const featuredAnime = getFeaturedAnime();
  const categories = getAllGenres();
  const seasonPicks = getSeasonPicks();
  const latestAnime = getLatestAnime();
  const spotlight = featuredAnime[0];
  const quickLinks = [
    { label: "Trending", icon: TrendingUp, target: "trending" },
    { label: "Live Rooms", icon: Video, target: "live-rooms" },
    { label: "New Episodes", icon: Zap, target: "episodes" },
    { label: "Season Picks", icon: Users, target: "season" },
    { label: "Arena", icon: Swords, target: "arena-pulse" },
  ];

  const arenaPulse = [
    {
      label: "Live battles",
      title: "Vote where the crowd is leaning.",
      description: "Jump straight into the matchup board and push the energy forward.",
      target: "/arena/character-battle",
      accent: "VS",
    },
    {
      label: "Arena overview",
      title: "Read the temperature before you jump in.",
      description: "A compact pulse check for what is trending, moving, and climbing.",
      target: "/arena/overview",
      accent: "LIVE",
    },
    {
      label: "Tier lists",
      title: "Browse the strongest titles with cleaner structure.",
      description: "Less clutter, more hierarchy, and a faster way to find the top lanes.",
      target: "/arena/tier-lists",
      accent: "TOP",
    },
  ];

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useGSAP(() => {
    // Section titles reveal - faster
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
        <Header />

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
                <button className="spotlight-secondary-btn" onClick={() => scrollToSection("season-picks") }>
                  Explore picks <ArrowRight size={16} />
                </button>
              </div>
              <div className="spotlight-microcopy">
                <span>Curated every session</span>
                <span>Best viewed full-screen</span>
              </div>
            </div>
            <div className="home-spotlight-art" onClick={() => navigate(`/anime/${spotlight.id}`)}>
              <img src={spotlight.img} alt={spotlight.name} />
              <div className="home-spotlight-art-glow" />
              <div className="home-spotlight-art-panel">
                <span>Featured story</span>
                <strong>{spotlight.name}</strong>
                <p>Tap in for the full watch page, then jump back into the arena flow.</p>
              </div>
            </div>
          </section>
        )}

        <div className="home-quick-links">
          {quickLinks.map((link) => (
            <button key={link.target} className="quick-link-card" onClick={() => scrollToSection(link.target)}>
              <link.icon size={18} />
              <span>{link.label}</span>
            </button>
          ))}
        </div>

        <section id="arena-pulse" className="home-arena-pulse">
          <div className="section-title arena-pulse-head">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="title-with-icon"
            >
              <Swords color="#e63636" size={24} />
              <h2>Arena Pulse</h2>
            </motion.div>
            <p>Fast routes into the loudest part of the site</p>
          </div>

          <div className="arena-pulse-grid">
            {arenaPulse.map((card, index) => (
              <motion.button
                key={card.label}
                type="button"
                className="arena-pulse-card"
                onClick={() => navigate(card.target)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <span className="arena-pulse-card-chip">{card.accent}</span>
                <small>{card.label}</small>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </motion.button>
            ))}
          </div>
        </section>

        <Slider sliderData={featuredAnime} />

        <ContinueWatching />

        <div id="season-picks" className="section-title">
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
        <FeaturedAnime animeList={seasonPicks} />

        <div id="trending" className="section-title">
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
        <Trending />

        <div id="live-rooms">
          <LiveRooms />
        </div>

        <div id="episodes" className="section-title">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="title-with-icon"
          >
            <Zap color="#e63636" size={24} />
            <h2>New Episodes</h2>
          </motion.div>
          <p>Recently updated</p>
        </div>
        <NewEpisodes />

        <div id="latest" className="section-title">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="title-with-icon"
          >
            <Shuffle color="#e63636" size={24} />
            <h2>Latest Added</h2>
          </motion.div>
          <p>Fresh arrivals in the catalog</p>
        </div>
        <FeaturedAnime animeList={latestAnime} />

        <TodaySchedulePreview />

        <Categories categories={categories} />
      </div>
    </AnimatedPage>
  );
}
