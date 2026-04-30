import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAnimeById, getAllAnime } from "../data/animeData";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import "./ProfilePage.css";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("Anime Fan");
  const [watchlist, setWatchlist] = useState([]);
  const [liked, setLiked] = useState([]);
  const [activeTab, setActiveTab] = useState("liked");

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);
    const storedW = JSON.parse(localStorage.getItem("watchlist") || "[]");
    setWatchlist(storedW);
    const storedL = JSON.parse(localStorage.getItem("likedAnime") || "[]");
    setLiked(storedL);
  }, []);

  const watchlistAnime = watchlist.map((id) => getAnimeById(id)).filter(Boolean);
  const likedAnime = liked.map((id) => getAnimeById(id)).filter(Boolean);
  
  const totalEpisodes = watchlistAnime.reduce((sum, a) => sum + a.episodes, 0);
  const avgRating = watchlistAnime.length
    ? (watchlistAnime.reduce((sum, a) => sum + a.rating, 0) / watchlistAnime.length).toFixed(1)
    : 0;

  const favoriteGenres = {};
  watchlistAnime.forEach((a) =>
    a.genres.forEach((g) => {
      favoriteGenres[g] = (favoriteGenres[g] || 0) + 1;
    })
  );
  const topGenres = Object.entries(favoriteGenres)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="profile-page">
      <Background />
      <Header />

      <div className="profile-header-section">
        <div className="profile-avatar">
          <div className="avatar-circle">
            <span>{username.charAt(0).toUpperCase()}</span>
          </div>
          <div className="avatar-ring"></div>
        </div>
        <div className="profile-info">
          <h1>{username}</h1>
          <p className="member-since">Member since 2026</p>
          <div className="profile-badges">
            <span className="badge">🎌 Anime Lover</span>
            {watchlist.length >= 5 && <span className="badge">📚 Collector</span>}
            {watchlist.length >= 10 && <span className="badge">🔥 Hardcore Fan</span>}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <ion-icon name="bookmark"></ion-icon>
          </div>
          <div className="stat-value">{watchlist.length}</div>
          <div className="stat-label">Watchlist</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <ion-icon name="film-outline"></ion-icon>
          </div>
          <div className="stat-value">{totalEpisodes.toLocaleString()}</div>
          <div className="stat-label">Total Episodes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <ion-icon name="star"></ion-icon>
          </div>
          <div className="stat-value">{avgRating}</div>
          <div className="stat-label">Avg. Rating</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <ion-icon name="heart"></ion-icon>
          </div>
          <div className="stat-value">{likedAnime.length}</div>
          <div className="stat-label">Liked Anime</div>
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === "liked" ? "active" : ""}`}
          onClick={() => setActiveTab("liked")}
        >
          Liked Anime
        </button>
        <button
          className={`tab-btn ${activeTab === "genres" ? "active" : ""}`}
          onClick={() => setActiveTab("genres")}
        >
          Favorite Genres
        </button>
        <button
          className={`tab-btn ${activeTab === "activity" ? "active" : ""}`}
          onClick={() => setActiveTab("activity")}
        >
          Activity
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "liked" && (
          <div className="liked-tab">
            <h3>❤️ Anime You Love</h3>
            {likedAnime.length > 0 ? (
              <div className="recent-list">
                {likedAnime.map((anime) => (
                  <div
                    className="recent-item"
                    key={anime.id}
                    onClick={() => navigate(`/anime/${anime.id}`)}
                  >
                    <img src={anime.img} alt={anime.name} />
                    <div>
                      <h4>{anime.name}</h4>
                      <span>★ {anime.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-tab-msg">You haven't liked any anime yet. Show some love on the anime details page!</p>
            )}
          </div>
        )}

        {activeTab === "genres" && (
          <div className="genres-tab">
            <h3>Your top genres based on your watchlist</h3>
            {topGenres.length > 0 ? (
              <div className="genre-bars">
                {topGenres.map(([genre, count]) => (
                  <div className="genre-bar-item" key={genre}>
                    <div className="genre-bar-label">
                      <span>{genre}</span>
                      <span>{count} anime</span>
                    </div>
                    <div className="genre-bar-track">
                      <div
                        className="genre-bar-fill"
                        style={{ width: `${(count / topGenres[0][1]) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-tab-msg">Add anime to your watchlist to see genre stats!</p>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="activity-tab">
            <h3>Recent Activity</h3>
            <div className="activity-timeline">
              {watchlistAnime.length > 0 ? (
                watchlistAnime.slice(0, 6).map((anime, i) => (
                  <div className="activity-item" key={anime.id}>
                    <div className="activity-dot"></div>
                    <div className="activity-content">
                      <p>
                        Added <strong onClick={() => navigate(`/anime/${anime.id}`)}>{anime.name}</strong> to watchlist
                      </p>
                      <span className="activity-time">Recently</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-tab-msg">No activity yet. Start adding anime to your watchlist!</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
