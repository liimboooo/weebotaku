import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSchedule } from "../data/animeData";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import "./SchedulePage.css";

export default function SchedulePage() {
  const navigate = useNavigate();
  const schedule = getSchedule();
  const days = Object.keys(schedule);
  const currentDay = new Date().toLocaleDateString("en-US", { weekday: "long" });
  
  // Set default active tab to current day, or Monday if nothing exists
  const [activeDay, setActiveDay] = useState(
    days.includes(currentDay) ? currentDay : "Monday"
  );

  return (
    <div className="schedule-page">
      <Background />
      <Header />

      <div className="schedule-hero">
        <div className="schedule-hero-text">
          <h1>📅 Airing Schedule</h1>
          <p>Never miss a new episode! Track upcoming releases for this week.</p>
        </div>
      </div>

      <div className="schedule-tabs">
        {days.map(day => (
          <button 
            key={day}
            className={`schedule-tab-btn ${activeDay === day ? "active" : ""} ${day === currentDay ? "current-day" : ""}`}
            onClick={() => setActiveDay(day)}
          >
            {day} {day === currentDay && <span className="today-badge">Today</span>}
          </button>
        ))}
      </div>

      <div className="schedule-content">
        {schedule[activeDay] && schedule[activeDay].length > 0 ? (
          <div className="schedule-grid">
            {schedule[activeDay].map(anime => (
              <div className="schedule-card" key={anime.id}>
                <div className="schedule-img" onClick={() => navigate(`/anime/${anime.id}`)}>
                  <img src={anime.img} alt={anime.name} />
                  <div className="schedule-overlay">
                    <ion-icon name="play-circle"></ion-icon>
                  </div>
                </div>
                <div className="schedule-info">
                  <h3 onClick={() => navigate(`/anime/${anime.id}`)}>{anime.name}</h3>
                  <div className="schedule-meta">
                    <span className="ep-badge">Ep {anime.currentEp + 1}</span>
                    <span className="time-badge"><ion-icon name="time"></ion-icon> 21:00 JST</span>
                  </div>
                  <p className="schedule-desc">{anime.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="schedule-empty">
            <ion-icon name="calendar-clear-outline"></ion-icon>
            <h3>No anime scheduled for {activeDay}</h3>
            <p>Looks like a quiet day! Check other days or explore our catalog.</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
