import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import leaderboardService from "../../services/leaderboardService";
import {
  Trophy, Flame, BookOpen, Star, Zap, Crown, Medal,
} from "lucide-react";
import "./LeaderboardPage.css";

const BOARDS = [
  { key: "xp", label: "XP", icon: Zap, field: "xp" },
  { key: "streak", label: "Streaks", icon: Flame, field: "longestStreak" },
  { key: "watchlist", label: "Watchlist", icon: BookOpen, field: "count" },
  { key: "reviews", label: "Reviews", icon: Star, field: "count" },
];

const RANK_COLORS = ["#fbbf24", "#94a3b8", "#cd7f32"];

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [board, setBoard] = useState("xp");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    leaderboardService.getLeaderboard(board).then(res => {
      setData(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [board]);

  const current = BOARDS.find(b => b.key === board);

  return (
    <div className="lb-page">
      <div className="lb-container">
        <div className="lb-header">
          <h1 className="lb-title"><Trophy size={22} /> Leaderboard</h1>
          <p className="lb-subtitle">Top users across the platform</p>
        </div>

        <div className="lb-tabs">
          {BOARDS.map(b => (
            <button
              key={b.key}
              className={`lb-tab ${board === b.key ? "active" : ""}`}
              onClick={() => setBoard(b.key)}
            >
              <b.icon size={15} />
              {b.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="lb-loading">Loading...</div>
        ) : data.length === 0 ? (
          <div className="lb-empty">
            <Trophy size={32} strokeWidth={1} />
            <h3>No data yet</h3>
          </div>
        ) : (
          <div className="lb-list">
            {data.map((user, i) => (
              <div
                key={user._id}
                className={`lb-row ${i < 3 ? "lb-row--top" : ""}`}
                onClick={() => navigate(`/profile/${user.username}`)}
              >
                <div className="lb-rank" style={i < 3 ? { color: RANK_COLORS[i] } : undefined}>
                  {i < 3 ? (
                    i === 0 ? <Crown size={18} /> : <Medal size={16} />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <div className="lb-user">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="lb-avatar" />
                  ) : (
                    <div className="lb-avatar lb-avatar--fallback">
                      {(user.username || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="lb-username">{user.username}</span>
                </div>
                <div className="lb-value">
                  <current.icon size={14} />
                  <span>{user[current.field] ?? user.xp ?? 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
