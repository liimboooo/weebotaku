import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAnimeById } from "../data/animeData";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Background from "../components/Background";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "./ProfilePage.css";

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const tabPanelVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.1,
    },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
};

const tabItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 12 },
  },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("Anime Fan");
  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [editing, setEditing] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [liked, setLiked] = useState([]);
  const [rated, setRated] = useState({});
  const [activeTab, setActiveTab] = useState("liked");

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);
    const storedAvatar = localStorage.getItem("userAvatar");
    if (storedAvatar) {
      setAvatar(storedAvatar);
      setAvatarPreview(storedAvatar);
    }
    const storedW = JSON.parse(localStorage.getItem("watchlist") || "[]");
    setWatchlist(storedW);
    const storedL = JSON.parse(localStorage.getItem("likedAnime") || "[]");
    setLiked(storedL);
    const storedR = JSON.parse(localStorage.getItem("userRatings") || "{}");
    setRated(storedR);
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

  const filteredLikedAnime = likedAnime;
  const filteredRatedAnime = Object.entries(rated)
    .map(([id, rating]) => {
      const anime = getAnimeById(parseInt(id));
      return anime ? { anime, rating } : null;
    })
    .filter(Boolean);
  const filteredActivityAnime = watchlistAnime.slice(0, 6);

  useGSAP(() => {
    const selectorByTab = {
      liked: ".recent-item",
      rated: ".recent-item",
      genres: ".genre-bar-item",
      activity: ".activity-item",
    };

    const selector = selectorByTab[activeTab];
    const items = gsap.utils.toArray(selector);

    if (!items.length) return;

    gsap.fromTo(
      items,
      { y: 24, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.35,
        ease: "power2.out",
        stagger: 0.08,
        overwrite: true,
      }
    );
  }, {
    dependencies: [activeTab, likedAnime.length, Object.keys(rated).length, watchlistAnime.length, topGenres.length],
  });

  const navigateWithViewTransition = (anime, event) => {
    if (document.startViewTransition) {
      const x = event.clientX;
      const y = event.clientY;
      const img = event.currentTarget.querySelector("img");
      const title = event.currentTarget.querySelector("h4");

      document.querySelectorAll(".recent-item img, .recent-item h4").forEach((el) => {
        el.style.viewTransitionName = "";
      });

      if (img) img.style.viewTransitionName = `anime-card-${anime.id}`;
      if (title) title.style.viewTransitionName = `anime-title-${anime.id}`;

      document.startViewTransition(() => {
        navigate(`/anime/${anime.id}`);
      }).ready.then(() => {
        gsap.fromTo(
          document.documentElement,
          {
            "--reveal-radius": "0%",
            "--reveal-x": `${x}px`,
            "--reveal-y": `${y}px`,
          },
          {
            "--reveal-radius": "110%",
            duration: 1,
            ease: "expo.inOut",
          }
        );
      });
    } else {
      navigate(`/anime/${anime.id}`);
    }
  };

  return (
    <AnimatedPage>
      <div className="profile-page">
        <Background />
        <Header />

        <div className="profile-header-section">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {avatarPreview || avatar ? <img src={avatarPreview || avatar} alt={username} /> : <span>{username.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="avatar-ring"></div>
          </div>
          <div className="profile-info">
            {editing ? (
              <div className="profile-edit-form">
                <input value={username} onChange={(e) => setUsername(e.target.value)} />
                <div className="avatar-upload-row">
                  <label className="avatar-upload-btn">
                    Choose avatar from files
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = String(reader.result || "");
                          setAvatar(result);
                          setAvatarPreview(result);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="clear-avatar-btn"
                    onClick={() => {
                      setAvatar("");
                      setAvatarPreview("");
                      localStorage.removeItem("userAvatar");
                    }}
                  >
                    Remove avatar
                  </button>
                </div>
                <div className="edit-actions">
                  <button onClick={() => {
                    localStorage.setItem('username', username);
                    if (avatar) localStorage.setItem('userAvatar', avatar); else localStorage.removeItem('userAvatar');
                    window.dispatchEvent(new Event('profile-avatar-updated'));
                    setEditing(false);
                  }} className="save-btn">Save</button>
                  <button onClick={() => { setEditing(false); const storedUser = localStorage.getItem('username'); if (storedUser) setUsername(storedUser); const storedAvatar = localStorage.getItem('userAvatar'); setAvatar(storedAvatar || ''); setAvatarPreview(storedAvatar || ''); }} className="cancel-btn">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1>{username}</h1>
                <p className="member-since">Member since 2026</p>
                <div className="profile-badges">
                  <span className="badge">🎌 Anime Lover</span>
                  {watchlist.length >= 5 && <span className="badge">📚 Collector</span>}
                  {watchlist.length >= 10 && <span className="badge">🔥 Hardcore Fan</span>}
                </div>
                <div style={{ marginTop: 12 }}>
                  <button className="edit-profile-btn" onClick={() => setEditing(true)}>Edit Profile</button>
                </div>
              </>
            )}
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

        {/* genre filter removed per user preference */}

        <div className="profile-tabs">
          {[
            ["liked", "Liked"],
            ["rated", "Rated"],
            ["genres", "Genres"],
            ["activity", "Activity"],
          ].map(([tabKey, label]) => (
            <button
              key={tabKey}
              className={`tab-btn ${activeTab === tabKey ? "active" : ""}`}
              onClick={() => setActiveTab(tabKey)}
              style={{ position: "relative" }}
            >
              {activeTab === tabKey && (
                <motion.div
                  layoutId="active-pill"
                  className="active-pill-bg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            className="tab-content"
            key={activeTab}
            variants={tabPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {activeTab === "liked" && (
            <div className="liked-tab">
              <h3>❤️ Anime You Love</h3>
              {filteredLikedAnime.length > 0 ? (
                <motion.div className="recent-list" variants={listContainerVariants}>
                  {filteredLikedAnime.map((anime) => (
                    <motion.div
                      className="recent-item"
                      key={anime.id}
                      variants={tabItemVariants}
                      whileHover={{
                        y: -10,
                        boxShadow: "0 18px 40px rgba(230, 54, 54, 0.16)",
                        borderColor: "rgba(230, 54, 54, 0.22)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(event) => navigateWithViewTransition(anime, event)}
                    >
                      <img src={anime.img} alt={anime.name} />
                      <div>
                        <h4>{anime.name}</h4>
                        <span>★ {anime.rating}</span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="empty-tab-msg">You haven't liked any anime yet.</p>
              )}
            </div>
          )}

          {activeTab === "rated" && (
            <div className="rated-tab">
              <h3>⭐ Your Ratings</h3>
              {filteredRatedAnime.length > 0 ? (
                <motion.div className="recent-list" variants={listContainerVariants}>
                  {filteredRatedAnime.map(({ anime, rating }) => (
                      <motion.div
                        className="recent-item"
                        key={anime.id}
                        variants={tabItemVariants}
                        whileHover={{
                          y: -10,
                          boxShadow: "0 18px 40px rgba(230, 54, 54, 0.16)",
                          borderColor: "rgba(230, 54, 54, 0.22)",
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(event) => navigateWithViewTransition(anime, event)}
                      >
                        <img src={anime.img} alt={anime.name} />
                        <div>
                          <h4>{anime.name}</h4>
                          <span className="user-score">Your Score: {rating}/10</span>
                        </div>
                      </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="empty-tab-msg">You haven't rated any anime yet.</p>
              )}
            </div>
          )}

          {activeTab === "genres" && (
            <div className="genres-tab">
              <h3>Your top genres based on your watchlist</h3>
              {topGenres.length > 0 ? (
                <motion.div className="genre-bars" variants={listContainerVariants}>
                  {topGenres.map(([genre, count]) => (
                    <motion.div
                      className="genre-bar-item"
                      key={genre}
                      variants={tabItemVariants}
                      whileHover={{ y: -6 }}
                    >
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
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="empty-tab-msg">Add anime to your watchlist to see genre stats!</p>
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="activity-tab">
              <h3>Recent Activity</h3>
              <motion.div className="activity-timeline" variants={listContainerVariants}>
                {filteredActivityAnime.length > 0 ? (
                  filteredActivityAnime.map((anime) => (
                    <motion.div
                      className="activity-item"
                      key={anime.id}
                      variants={tabItemVariants}
                      whileHover={{ y: -8 }}
                      onClick={(event) => navigateWithViewTransition(anime, event)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="activity-dot"></div>
                      <div className="activity-content">
                        <p>
                          Added <strong>{anime.name}</strong> to watchlist
                        </p>
                        <span className="activity-time">Recently</span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="empty-tab-msg">Your watchlist activity will appear here.</p>
                )}
              </motion.div>
            </div>
          )}
          </motion.div>
        </AnimatePresence>

      </div>
    </AnimatedPage>
  );
}
