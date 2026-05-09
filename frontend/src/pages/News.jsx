import React from "react";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Background from "../components/Background";
import { getLatestAnime, getNewEpisodes } from "../data/animeData";
import { useNavigate } from "react-router-dom";
import "./News.css";

export default function News() {
  const navigate = useNavigate();
  const latest = getLatestAnime();
  const episodes = getNewEpisodes();

  const newsItems = [
    ...episodes.map(a => ({ id: `ep-${a.id}`, title: `New episode: ${a.name}`, desc: `Latest episode available: ${a.status === 'Ongoing' ? `Next ep ${a.currentEp + 1}` : 'Complete'}`, link: `/anime/${a.id}` })),
    ...latest.map(a => ({ id: `new-${a.id}`, title: `Added: ${a.name}`, desc: a.description || a.synopsis, link: `/anime/${a.id}` })),
  ];

  return (
    <AnimatedPage>
      <div className="news-page">
        <Background />
        <Header />
        <div className="news-container">
          <h1>News</h1>
          <p>Latest episodes and additions</p>
          <div className="news-list">
            {newsItems.map(item => (
              <article key={item.id} className="news-item" onClick={() => navigate(item.link)}>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <button className="news-cta">Open</button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
