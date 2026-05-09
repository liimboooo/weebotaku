import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  Link2, 
  MessageSquare, 
  Play, 
  Send, 
  Share2, 
  Users, 
  X, 
  Zap 
} from "lucide-react";
import AnimatedPage from "../../components/AnimatedPage";

import LiveRooms from "../../components/LiveRooms";
import { activeRooms as mockActiveRooms } from "../../data/animeData";
import "./WatchTogetherCreative.css";

const initialMessages = [
  { id: 1, avatar: "SF", name: "@stormframe", text: "Room looks clean. Drop the source and we are in." },
  { id: 2, avatar: "NW", name: "@noirwave", text: "Stream is stable. Zenith theme is hitting hard." },
  { id: 3, avatar: "LM", name: "@limami", text: "Ready when the player goes live." },
];

const activeRooms = mockActiveRooms;

function getEmbedSource(urlString) {
  if (!urlString) return null;
  try {
    const parsedUrl = new URL(urlString);
    const host = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = parsedUrl.pathname.replace(/\/+$/, "");

    if (host.includes("youtube.com") || host === "youtu.be") {
      let videoId = parsedUrl.searchParams.get("v");
      if (!videoId && host === "youtu.be") videoId = pathname.split("/").filter(Boolean)[0];
      if (!videoId && pathname.startsWith("/shorts/")) videoId = pathname.split("/")[2];
      if (videoId) {
        return {
          kind: "iframe",
          url: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
          title: "YouTube broadcast",
        };
      }
    }

    if (host.includes("twitch.tv")) {
      const channel = pathname.split("/").filter(Boolean)[0];
      if (channel) {
        const parentHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
        return {
          kind: "iframe",
          url: `https://player.twitch.tv/?channel=${channel}&parent=${parentHost}&autoplay=true&muted=true`,
          title: "Twitch broadcast",
        };
      }
    }

    const directVideo = /\.(mp4|webm|ogg|m3u8)(\?|#|$)/i.test(parsedUrl.pathname + parsedUrl.search + parsedUrl.hash);
    return {
      kind: directVideo ? "video" : "iframe",
      url: urlString,
      title: directVideo ? "Direct video broadcast" : "Broadcast feed",
    };
  } catch { return null; }
}

export default function WatchTogetherCreative() {
  const [roomName, setRoomName] = useState("Aka-Kuro Watch Room");
  const [setupVideoUrl, setSetupVideoUrl] = useState(activeRooms[0].sourceUrl);
  const [currentSourceUrl, setCurrentSourceUrl] = useState(activeRooms[0].sourceUrl);
  const [isLive, setIsLive] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [viewerCount, setViewerCount] = useState(1250);
  const [selectedAnime, setSelectedAnime] = useState("Jujutsu Kaisen");
  
  // Advanced Stream Options
  const [privacyMode, setPrivacyMode] = useState("Public");
  const [bitrate, setBitrate] = useState(6000);
  
  const [dynamicRooms, setDynamicRooms] = useState(activeRooms);
  const [draftComms, setDraftComms] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const messagesEndRef = useRef(null);

  const currentSource = getEmbedSource(currentSourceUrl);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleJoinRoom = (room) => {
    if (typeof room === "string") {
      const source = getEmbedSource(room);
      if (source) {
        setRoomName("Remote Broadcast");
        setSetupVideoUrl(room);
        setCurrentSourceUrl(room);
        setIsLive(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    setRoomName(room.name);
    setSetupVideoUrl(room.sourceUrl);
    setCurrentSourceUrl(room.sourceUrl);
    setIsLive(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartTransmission = () => {
    const nextSource = setupVideoUrl.trim();
    if (nextSource) {
      setCurrentSourceUrl(nextSource);
    }
    
    // Add user's room to the active list dynamically
    const userRoom = {
      id: Date.now(),
      name: `${roomName} (You)`,
      thumbnail: "/beta-1.jpg", // Placeholder
      viewers: viewerCount,
      sourceUrl: nextSource,
      mode: privacyMode.toLowerCase()
    };
    
    setDynamicRooms([userRoom, ...activeRooms]);
    setIsLive(true);
    setIsConfigOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCommsSubmit = (e) => {
    e.preventDefault();
    if (!draftComms.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), avatar: "YO", name: "You", text: draftComms.trim() }]);
    setDraftComms("");
  };

  const handleShareLink = async () => {
    try { await navigator.clipboard.writeText(currentSourceUrl); }
    catch { window.prompt("Copy link", currentSourceUrl); }
  };

  const handleStopTransmission = () => {
    setIsLive(false);
    setDynamicRooms(activeRooms); // Reset list
  };

  return (
    <AnimatedPage>
      <div className="watch-room-page">

        <main className="watch-room-shell">
          {!isLive ? (
            <motion.section 
              className="zenith-hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="zenith-content">
                <span className="zenith-eyebrow">Uplink Active</span>
                <h1>
                  <span className="zenith-title-small">Zenith</span>
                  <span className="zenith-title-big">Broadcast</span>
                </h1>
                <p className="zenith-lead">Command Center Alpha</p>
                <p className="zenith-desc">
                  Lock in your signal for a community-driven broadcast. Encrypted channels and perfect-sync playback. 
                  This isn't just watching—it's a synchronized event.
                </p>
                <button className="zenith-launch-btn" onClick={() => setIsConfigOpen(true)}>
                  <Play size={18} fill="currentColor" /> Launch Transmission
                </button>
              </div>
            </motion.section>
          ) : (
            <div className="transmission-stage">
              <div className="stage-header">
                <div className="stage-info">
                  <span className="live-status"><span className="pulse-dot" /> LIVE</span>
                  <h2>{roomName}</h2>
                  <div className="stage-meta">
                    <span><Users size={14} /> {viewerCount.toLocaleString()}</span>
                    <span><Globe size={14} /> {selectedAnime}</span>
                    <span className="bitrate-meta"><Zap size={14} color="#e50914" /> {bitrate} kbps</span>
                  </div>
                </div>
                <div className="stage-actions">
                  <button onClick={handleShareLink}><Share2 size={16} /> Share</button>
                  <button className="exit-btn" onClick={handleStopTransmission}><X size={16} /> End Stream</button>
                </div>
              </div>

              <div className="stage-grid">
                <div className="video-column">
                  <div className="video-container">
                    {currentSource?.kind === "iframe" ? (
                      <iframe src={currentSource.url} title={currentSource.title} allow="autoplay; fullscreen" />
                    ) : (
                      <video src={currentSource?.url} controls autoPlay />
                    )}
                  </div>
                  <div className="system-status">
                    <Link2 size={14} color="#10b981" />
                    <span>Secure {privacyMode} Uplink Established</span>
                    <span className="encryption-pill">E2E Encrypted</span>
                  </div>
                </div>

                <div className="chat-column">
                  <div className="chat-header">
                    <h3>Neural Chat</h3>
                    <span>{messages.length} signals</span>
                  </div>
                  <div className="chat-feed">
                    {messages.map(msg => (
                      <div key={msg.id} className="chat-msg">
                        <div className="chat-avatar">{msg.avatar}</div>
                        <div className="chat-content">
                          <strong>{msg.name}</strong>
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <form className="chat-input" onSubmit={handleCommsSubmit}>
                    <input 
                      placeholder="Send encrypted signal..." 
                      value={draftComms} 
                      onChange={(e) => setDraftComms(e.target.value)}
                    />
                    <button type="submit"><Send size={16} /></button>
                  </form>
                </div>
              </div>
            </div>
          )}

          <LiveRooms rooms={dynamicRooms} onJoin={handleJoinRoom} />
        </main>

        <AnimatePresence>
          {isConfigOpen && (
            <div className="config-overlay">
              <motion.div 
                className="config-modal"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="modal-head">
                  <h2>Transmission Config</h2>
                  <button onClick={() => setIsConfigOpen(false)}><X size={20} /></button>
                </div>
                <div className="modal-body">
                  <div className="field">
                    <label>Broadcast URL</label>
                    <input value={setupVideoUrl} onChange={e => setSetupVideoUrl(e.target.value)} placeholder="YouTube, Twitch, or Direct link..." />
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label>Target Anime</label>
                      <select value={selectedAnime} onChange={e => setSelectedAnime(e.target.value)}>
                        <option>Jujutsu Kaisen</option>
                        <option>One Piece</option>
                        <option>Demon Slayer</option>
                        <option>Attack on Titan</option>
                        <option>Naruto</option>
                        <option>Other Broadcast</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Privacy Level</label>
                      <select value={privacyMode} onChange={e => setPrivacyMode(e.target.value)}>
                        <option>Public</option>
                        <option>Encrypted (Private)</option>
                        <option>Followers Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <div className="field-label-row">
                      <label>Signal Strength (Bitrate)</label>
                      <span className="bitrate-value">{bitrate} kbps</span>
                    </div>
                    <input 
                      type="range" 
                      min="1000" 
                      max="12000" 
                      step="500" 
                      value={bitrate} 
                      onChange={e => setBitrate(parseInt(e.target.value))} 
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="cancel-btn" onClick={() => setIsConfigOpen(false)}>Cancel</button>
                  <button className="start-btn" onClick={handleStartTransmission}><Zap size={16} /> Initialize Uplink</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
