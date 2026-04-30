import React from "react";
import Header from "../components/Header";
import Slider from "../components/Slider";
import FeaturedAnime from "../components/FeaturedAnime";
import Categories from "../components/Categories";
import Background from "../components/Background";
import { getFeaturedAnime, getAllGenres, getTrendingAnime, getNewEpisodes } from "../data/animeData";
import Footer from "../components/Footer";
import "./Home.css";

export default function Home() {
  const featuredAnime = getFeaturedAnime();
  const categories = getAllGenres();
  const trendingAnime = getTrendingAnime();
  const newEpisodes = getNewEpisodes();

  return (
    <div className="home-container">
      {/* Reusable Background */}
      <Background />

      <Header />
      
      {/* Quick Stats Banner */}
      <div className="stats-banner">
        <div className="stat-item">
          <h3>2,405</h3>
          <p>Anime Available</p>
        </div>
        <div className="stat-item">
          <h3>42</h3>
          <p>Airing Now</p>
        </div>
        <div className="stat-item">
          <h3>1.2M</h3>
          <p>Active Users</p>
        </div>
      </div>

      <Slider sliderData={featuredAnime} />
      
      <div className="section-title">
        <h2>🔥 Trending Now</h2>
        <p>The most watched anime this week</p>
      </div>
      <FeaturedAnime animeList={trendingAnime} />

      <div className="section-title">
        <h2>🆕 New Episodes</h2>
        <p>Recently updated</p>
      </div>
      <FeaturedAnime animeList={newEpisodes} />

      <Categories categories={categories} />
      <Footer />
    </div>
  );
}
