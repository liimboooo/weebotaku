import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, Users, Wifi, User } from "lucide-react";
import "./LiveRooms.css";

const fallbackRooms = [];

export default function LiveRooms({ rooms: externalRooms, onJoin, loading }) {
  const navigate = useNavigate();
  const rooms = externalRooms || fallbackRooms;

  const handleClick = (room) => {
    if (onJoin) {
      onJoin(room);
    } else {
      navigate("/watch-together");
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
        <div className="live-rooms-empty">No active rooms. Start your own broadcast!</div>
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
                </div>
                <span className="live-room-badge">{room.privacy === 'public' ? 'LIVE' : 'PRIVATE'}</span>
              </div>
              <div className="live-room-info">
                <h4>{room.name}</h4>
                <div className="live-room-meta">
                  <span><Eye size={12} /> {(room.participantCount || 0).toLocaleString()} watching</span>
                  <span><User size={12} /> {room.host?.username || 'anonymous'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}