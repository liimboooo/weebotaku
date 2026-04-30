import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAnimeById } from "../data/animeData";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import { useToast } from "../components/Toast";
import "./HistoryPage.css";

export default function HistoryPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const storedHistory = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    setHistory(storedHistory);
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("watchHistory");
    setHistory([]);
    showToast("Watch history cleared", "success");
  };

  const removeHistoryItem = (timestamp) => {
    const updated = history.filter((h) => h.timestamp !== timestamp);
    localStorage.setItem("watchHistory", JSON.stringify(updated));
    setHistory(updated);
    showToast("Item removed from history", "success");
  };

  return (
    <div className="history-page">
      <Background />
      <Header />

      <div className="history-hero">
        <div className="history-header-content">
          <h1>
            <ion-icon name="time-outline"></ion-icon> Watch History
          </h1>
          <p>Pick up right where you left off</p>
        </div>
        {history.length > 0 && (
          <button className="clear-history-btn" onClick={clearHistory}>
            <ion-icon name="trash-outline"></ion-icon> Clear History
          </button>
        )}
      </div>

      {history.length > 0 ? (
        <div className="history-list">
          {history.map((item) => {
            const anime = getAnimeById(item.animeId);
            if (!anime) return null;
            
            const date = new Date(item.timestamp).toLocaleDateString(undefined, { 
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return (
              <div className="history-card" key={item.timestamp}>
                <div className="history-img-wrap" onClick={() => navigate(`/anime/${anime.id}`)}>
                  <img src={anime.img} alt={anime.name} />
                  <div className="play-overlay">
                    <ion-icon name="play-circle"></ion-icon>
                  </div>
                </div>
                <div className="history-details">
                  <div className="history-title-row">
                    <h3 onClick={() => navigate(`/anime/${anime.id}`)}>{anime.name}</h3>
                    <span className="history-date">{date}</span>
                  </div>
                  <p className="history-ep">Episode {item.episode}</p>
                  <div className="history-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.random() * 60 + 20}%` }}></div>
                    </div>
                    <span>Watching</span>
                  </div>
                </div>
                <button className="remove-item-btn" onClick={() => removeHistoryItem(item.timestamp)}>
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="history-empty">
          <div className="empty-icon-wrap">
            <ion-icon name="time-outline"></ion-icon>
          </div>
          <h3>No Watch History</h3>
          <p>You haven't watched any anime recently. Start watching now!</p>
          <button className="browse-btn" onClick={() => navigate("/home")}>
            <ion-icon name="compass-outline"></ion-icon>
            Discover Anime
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}
