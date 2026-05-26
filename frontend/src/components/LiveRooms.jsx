import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, Users, Wifi, User, Clock } from "lucide-react";
import * as roomService from "../services/roomService";
import "./LiveRooms.css";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LiveRooms({ rooms: externalRooms, onJoin, loading: externalLoading }) {
  const navigate = useNavigate();
  const [fetchedRooms, setFetchedRooms] = useState([]);
  const [selfLoading, setSelfLoading] = useState(!externalRooms);

  useEffect(() => {
    if (externalRooms) return;
    let cancelled = false;
    roomService.getRooms().then(res => {
      if (!cancelled && res.success) setFetchedRooms(res.data);
    }).catch(() => {}).finally(() => { if (!cancelled) setSelfLoading(false); });
    return () => { cancelled = true; };
  }, [externalRooms]);

  const rooms = externalRooms || fetchedRooms;
  const loading = externalRooms ? externalLoading : selfLoading;

  const handleClick = (room) => {
    if (onJoin) {
      onJoin(room);
    } else {
      navigate(`/watch-together?room=${room._id}`);
    }
  };

  return (
    <section className="live-rooms-section">
      <div className="section-title">
        <h2><Wifi size={18} className="section-title-icon" /> Live Rooms</h2>
        <p>Watch together with the community</p>
      </div>
      {loading ? (
        <div className="live-rooms-loading">Scanning for active transmissions...</div>
      ) : rooms.length === 0 ? (
        <div className="live-rooms-empty">
          <Wifi size={24} />
          <p>No active rooms right now.</p>
          <button className="live-rooms-empty-btn" onClick={() => navigate("/watch-together")}>
            Start a Room
          </button>
        </div>
      ) : (
        <div className="live-rooms-grid">
          {rooms.map((room, i) => (
            <motion.div
              key={room._id || room.id}
              className="live-room-card"
              onClick={() => handleClick(room)}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6 }}
            >
              <div className="live-room-img">
                <div className="live-room-img-fallback">
                  <Users size={28} />
                  <div className="live-fallback-avatars">
                    <span className="live-fallback-avatar">M</span>
                    <span className="live-fallback-avatar">K</span>
                    <span className="live-fallback-avatar">R</span>
                    <span className="live-fallback-avatar-more">+3</span>
                  </div>
                </div>
                <span className="live-room-badge">
                  {room.privacy === 'public' ? 'LIVE' : room.privacy === 'followers' ? 'FOLLOWERS' : 'PRIVATE'}
                </span>
              </div>
              <div className="live-room-info">
                <h4>{room.name}</h4>
                {room.targetAnime && <span className="live-room-anime">{room.targetAnime}</span>}
                <div className="live-room-meta">
                  <span><Eye size={12} /> {(room.participantCount || 0).toLocaleString()} watching</span>
                  <span>
                    {room.host?.avatar ? (
                      <img src={room.host.avatar} alt="" className="live-host-avatar" />
                    ) : (
                      <User size={12} />
                    )}
                    {' '}{room.host?.username || 'anonymous'}
                  </span>
                  {room.createdAt && <span><Clock size={12} /> {timeAgo(room.createdAt)}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}