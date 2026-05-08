import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Video, X } from "lucide-react";
import { activeRooms } from "../data/animeData";
import "./LiveRooms.css";

const LiveRooms = ({ onJoin, rooms: customRooms }) => {
  const navigate = useNavigate();
  const [isJoinInputOpen, setIsJoinInputOpen] = useState(false);
  const [directUrl, setDirectUrl] = useState("");

  const rooms = customRooms || activeRooms;

  const handleJoinRoom = (room) => {
    if (onJoin) {
      onJoin(room);
    } else {
      // Default behavior: navigate to watch-together page
      navigate("/watch-together");
    }
  };

  const handleDirectJoinSubmit = (e) => {
    e.preventDefault();
    if (!directUrl.trim()) return;
    
    if (onJoin) {
      onJoin(directUrl.trim());
    } else {
      // Pass via state or query param in real app
      navigate("/watch-together");
    }
    setDirectUrl("");
    setIsJoinInputOpen(false);
  };

  return (
    <section className="live-rooms-section">
      <div className="section-title live-rooms-head">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="title-with-icon"
        >
          <Video color="#e63636" size={24} />
          <h2>Live Rooms</h2>
        </motion.div>
        <div className="section-cta-row">
          <p>Active Transmissions</p>
          <span className="live-rooms-count">{activeRooms.length} rooms</span>
        </div>
      </div>

      <div className="live-rooms-grid">
        {rooms.map((room, index) => (
          <motion.article
            key={room.id}
            className="live-room-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleJoinRoom(room)}
          >
            <div className="live-room-thumb-wrap">
              <img className="live-room-thumb" src={room.thumbnail} alt={room.name} />
              <div className="live-room-badge-row">
                <span className="live-room-status-badge">
                  <span className="live-pulse-dot" /> LIVE
                </span>
                <span className="live-room-viewers">
                  {(room.viewers ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="live-room-body">
              <h3>{room.name}</h3>
              <p>Locked-in broadcast signal. Syncing to the collective pulse.</p>
              <button type="button" className="live-room-join-btn">
                Join Room
              </button>
            </div>
          </motion.article>
        ))}

        <motion.article 
          className="live-room-card direct-join-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: rooms.length * 0.1 }}
        >
          {!isJoinInputOpen ? (
            <div className="direct-join-placeholder" onClick={() => setIsJoinInputOpen(true)}>
              <div className="direct-join-icon">
                <Link2 size={32} />
              </div>
              <h3>Join via URL</h3>
              <p>Enter a broadcast link to sync manually.</p>
            </div>
          ) : (
            <form className="direct-join-form" onSubmit={handleDirectJoinSubmit}>
              <div className="direct-join-head">
                <Link2 size={16} />
                <span>Private Link</span>
                <button type="button" onClick={() => setIsJoinInputOpen(false)} className="direct-join-close">
                  <X size={14} />
                </button>
              </div>
              <input 
                autoFocus
                type="text" 
                placeholder="Paste transmission URL..." 
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
              />
              <button type="submit" className="direct-join-btn">Initialize Sync</button>
            </form>
          )}
        </motion.article>
      </div>
    </section>
  );
};

export default LiveRooms;

