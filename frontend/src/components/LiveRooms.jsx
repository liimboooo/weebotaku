import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Eye } from "lucide-react";
import "./LiveRooms.css";

const rooms = [
  { id: 1, name: "Jujutsu Kaisen Night Room", viewers: 4821, img: "/beta-1.jpg" },
  { id: 2, name: "One Piece Watch Tower", viewers: 6912, img: "/beta-2.jpg" },
  { id: 3, name: "Solo Night Session", viewers: 1380, img: "/beta-3.jpg" },
];

export default function LiveRooms() {
  const navigate = useNavigate();

  return (
    <section className="live-rooms-section">
      <div className="section-title">
        <h2>Live Rooms</h2>
        <p>Watch together with the community</p>
      </div>
      <div className="live-rooms-grid">
        {rooms.map((room, i) => (
          <motion.div
            key={room.id}
            className="live-room-card"
            onClick={() => navigate("/watch-together")}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -6 }}
          >
            <div className="live-room-img">
              <img src={room.img} alt={room.name} />
              <span className="live-room-badge">LIVE</span>
            </div>
            <div className="live-room-info">
              <h4>{room.name}</h4>
              <span><Eye size={12} /> {room.viewers.toLocaleString()} watching</span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
