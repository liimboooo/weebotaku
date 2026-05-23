import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Link2,
  Play,
  Send,
  Share2,
  Users,
  X,
  Zap,
  Wifi,
} from "lucide-react";
import { Room, RoomEvent } from "livekit-client";
import AnimatedPage from "../../components/AnimatedPage";
import LiveRooms from "../../components/LiveRooms";
import * as roomService from "../../services/roomService";
import authService from "../../services/authService";
import { addNotification } from "../../services/notificationService";
import { fetchTopAnime } from "../../services/anilistApi";
import "./WatchTogetherCreative.css";

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
          url: `${process.env.REACT_APP_YOUTUBE_EMBED_BASE || "https://www.youtube-nocookie.com/embed/"}${videoId}?autoplay=1&rel=0&modestbranding=1`,
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
          url: `${process.env.REACT_APP_TWITCH_EMBED_BASE || "https://player.twitch.tv/"}?channel=${channel}&parent=${parentHost}&autoplay=true&muted=true`,
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
  const currentUser = authService.getCurrentUser();
  const isLoggedIn = authService.isLoggedIn();

  const [animeOptions, setAnimeOptions] = useState(["Jujutsu Kaisen", "One Piece", "Demon Slayer", "Attack on Titan", "Naruto", "Chainsaw Man", "Solo Leveling", "My Hero Academia", "Other Broadcast"]);
  const [roomName, setRoomName] = useState("Zenith Watch Room");
  const [setupVideoUrl, setSetupVideoUrl] = useState("");
  const [currentSourceUrl, setCurrentSourceUrl] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [selectedAnime, setSelectedAnime] = useState("Jujutsu Kaisen");
  const [privacyMode, setPrivacyMode] = useState("Public");
  const [bitrate, setBitrate] = useState(6000);

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [dbRoomId, setDbRoomId] = useState(null);
  const [liveKitConnected, setLiveKitConnected] = useState(false);
  const [liveKitError, setLiveKitError] = useState('');

  const [chatMessages, setChatMessages] = useState([]);
  const [draftComms, setDraftComms] = useState("");
  const messagesEndRef = useRef(null);
  const liveRoomRef = useRef(null);
  const chatListenersAttached = useRef(false);

  const currentSource = getEmbedSource(currentSourceUrl);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    (async () => {
      try {
        const res = await roomService.getRooms();
        if (res.success) setRooms(res.data);
      } catch { /* use fallback */ }
      setRoomsLoading(false);
    })();
    fetchTopAnime(1, "bypopularity").then(r => {
      const titles = r.data.map(a => a.name).filter(Boolean);
      if (titles.length) setAnimeOptions([...titles.slice(0, 15), "Other Broadcast"]);
    }).catch(() => {});
  }, []);

  const handleDataReceived = useCallback((payload) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(payload));
      if (data.type === 'chat') {
        setChatMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          name: data.name || 'Anonymous',
          avatar: (data.name || 'A').charAt(0).toUpperCase(),
          text: data.text,
        }]);
      }
    } catch { /* ignore bad data */ }
  }, []);

  const handleParticipantConnected = useCallback(() => {
    if (liveRoomRef.current) {
      const count = liveRoomRef.current.participants.size + 1;
      setParticipantCount(count);
      if (dbRoomId) {
        roomService.updateParticipantCount(dbRoomId, count).catch(() => {});
      }
    }
  }, [dbRoomId]);

  const handleParticipantDisconnected = useCallback(() => {
    if (liveRoomRef.current) {
      const count = liveRoomRef.current.participants.size + 1;
      setParticipantCount(Math.max(0, count));
    }
  }, []);

  const sendChatMessage = (text) => {
    if (!liveRoomRef.current || !text.trim()) return;
    const payload = JSON.stringify({
      type: 'chat',
      text: text.trim(),
      name: currentUser?.username || 'Anonymous',
    });
    liveRoomRef.current.localParticipant.publishData(
      new TextEncoder().encode(payload),
      { reliable: true, topic: 'chat' }
    );
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      name: currentUser?.username || 'You',
      avatar: (currentUser?.username || 'Y').charAt(0).toUpperCase(),
      text: text.trim(),
    }]);
  };

  const connectToLiveKit = async (roomId) => {
    if (!isLoggedIn) return;
    try {
      const tokenRes = await roomService.getRoomToken(roomId);
      if (!tokenRes.success) {
        setLiveKitError(tokenRes.message || 'LiveKit not configured. Chat will be local only.');
        return;
      }

      const room = new Room();
      liveRoomRef.current = room;
      chatListenersAttached.current = false;

      room.on(RoomEvent.DataReceived, handleDataReceived);
      room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.on(RoomEvent.Disconnected, () => {
        setLiveKitConnected(false);
        setParticipantCount(0);
      });

      await room.connect(tokenRes.livekitUrl, tokenRes.token);
      chatListenersAttached.current = true;
      const count = room.participants.size + 1;
      setParticipantCount(count);
      setLiveKitConnected(true);
      setLiveKitError('');
      if (dbRoomId) {
        roomService.updateParticipantCount(dbRoomId, count).catch(() => {});
      }
    } catch (err) {
      console.error('LiveKit connection failed:', err);
      setLiveKitError('Failed to connect to LiveKit. Chat will be local only.');
    }
  };

  const handleStartTransmission = async () => {
    const nextSource = setupVideoUrl.trim();
    const priv = privacyMode.toLowerCase();

    try {
      const res = await roomService.createRoom({
        name: roomName,
        sourceUrl: nextSource,
        targetAnime: selectedAnime,
        privacy: priv,
        bitrate,
      });
      if (res.success) {
        setDbRoomId(res.data._id);
        if (nextSource) setCurrentSourceUrl(nextSource);
        setIsLive(true);
        setIsConfigOpen(false);
        setRooms(prev => [res.data, ...prev.filter(r => r._id !== res.data._id)]);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (isLoggedIn) {
          connectToLiveKit(res.data._id);
        }
      }
    } catch {
      setIsLive(false);
      setIsConfigOpen(false);
      addNotification({ title: "Room Error", body: "Failed to create room. Try again.", type: "error" });
    }
  };

  const handleJoinRoom = async (room) => {
    const roomId = room._id;
    setRoomName(room.name || 'Zenith Broadcast');
    setCurrentSourceUrl(room.sourceUrl || '');
    setSelectedAnime(room.targetAnime || 'Other Broadcast');
    setPrivacyMode(room.privacy === 'public' ? 'Public' : 'Private');
    setBitrate(room.bitrate || 6000);
    setDbRoomId(roomId);
    setIsLive(true);
    setChatMessages([
      {
        id: 1,
        name: 'system',
        avatar: 'S',
        text: `Joined "${room.name}"`,
      },
    ]);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (isLoggedIn) {
      connectToLiveKit(roomId);
    }
  };

  const handleStopTransmission = async () => {
    if (liveRoomRef.current) {
      liveRoomRef.current.disconnect();
      liveRoomRef.current = null;
    }
    setLiveKitConnected(false);
    if (dbRoomId) {
      try { await roomService.endRoom(dbRoomId); } catch { /* ignore */ }
      setRooms(prev => prev.filter(r => r._id !== dbRoomId));
      setDbRoomId(null);
    }
    setIsLive(false);
    setChatMessages([]);
    setParticipantCount(0);
  };

  const handleCommsSubmit = (e) => {
    e.preventDefault();
    if (!draftComms.trim()) return;
    if (liveRoomRef.current && liveKitConnected) {
      sendChatMessage(draftComms);
    } else {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        avatar: (currentUser?.username || 'Y').charAt(0).toUpperCase(),
        name: currentUser?.username || 'You',
        text: draftComms.trim(),
      }]);
    }
    setDraftComms("");
  };

  const handleShareLink = async () => {
    const shareUrl = currentSourceUrl || window.location.href;
    try { await navigator.clipboard.writeText(shareUrl); }
    catch { window.prompt("Copy link", shareUrl); }
  };

  const handleRefreshRooms = async () => {
    setRoomsLoading(true);
    try {
      const res = await roomService.getRooms();
      if (res.success) setRooms(res.data);
    } catch { /* ignore */ }
    setRoomsLoading(false);
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
                  Lock in your signal for a community-driven broadcast using LiveKit-powered real-time sync.
                  Encrypted channels, perfect-sync playback, and live chat. This isn't just watching—it's a synchronized event.
                </p>
                <div className="zenith-actions">
                  <button className="zenith-launch-btn" onClick={() => setIsConfigOpen(true)}>
                    <Play size={18} fill="currentColor" /> Launch Transmission
                  </button>
                  <button className="zenith-refresh-btn" onClick={handleRefreshRooms} title="Refresh rooms">
                    <Wifi size={16} /> Refresh
                  </button>
                </div>
              </div>
            </motion.section>
          ) : (
            <div className="transmission-stage">
              <div className="stage-header">
                <div className="stage-info">
                  <span className="live-status">
                    <span className="pulse-dot" />
                    {liveKitConnected ? 'LIVE · LiveKit' : 'LIVE'}
                  </span>
                  <h2>{roomName}</h2>
                  <div className="stage-meta">
                    <span>
                      <Users size={14} />
                      {participantCount.toLocaleString()} {liveKitConnected ? 'connected' : 'viewing'}
                    </span>
                    <span><Globe size={14} /> {selectedAnime}</span>
                    <span className="bitrate-meta"><Zap size={14} color="#6d28d9" /> {bitrate} kbps</span>
                    {liveKitConnected && <span className="livekit-badge">LiveKit</span>}
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
                      <iframe
                        src={currentSource.url}
                        title={currentSource.title}
                        allow="autoplay; fullscreen"
                      />
                    ) : currentSource?.kind === "video" ? (
                      <video src={currentSource.url} controls autoPlay />
                    ) : (
                      <div className="video-placeholder">
                        <Play size={48} />
                        <p>No broadcast URL set. Share your stream link to begin.</p>
                      </div>
                    )}
                  </div>
                  <div className="system-status">
                    <Link2 size={14} color="#10b981" />
                    <span>
                      Secure {privacyMode} Uplink
                      {liveKitConnected ? ' · Real-time Chat Active' : ' · Local chat only'}
                    </span>
                    {liveKitConnected && <span className="encryption-pill">E2E Encrypted</span>}
                    {liveKitError && <span className="livekit-warning">{liveKitError}</span>}
                  </div>
                </div>

                <div className="chat-column">
                  <div className="chat-header">
                    <h3>Neural Chat</h3>
                    <span>{chatMessages.length} signals</span>
                  </div>
                  <div className="chat-feed">
                    {chatMessages.length === 0 && (
                      <div className="chat-empty">No messages yet. Start the conversation!</div>
                    )}
                    {chatMessages.map((msg) => (
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
                      placeholder={liveKitConnected ? "Send encrypted signal..." : "Send message..."}
                      value={draftComms}
                      onChange={(e) => setDraftComms(e.target.value)}
                    />
                    <button type="submit"><Send size={16} /></button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {!isLive && (
            <LiveRooms
              rooms={rooms}
              onJoin={handleJoinRoom}
              loading={roomsLoading}
            />
          )}
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
                    <label>Room Name</label>
                    <input
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Zenith Watch Room"
                    />
                  </div>
                  <div className="field">
                    <label>Broadcast URL <span className="field-hint">(YouTube, Twitch, or Direct link)</span></label>
                    <input
                      value={setupVideoUrl}
                      onChange={(e) => setSetupVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label>Target Anime</label>
                      <select value={selectedAnime} onChange={(e) => setSelectedAnime(e.target.value)}>
                        {animeOptions.map((a) => <option key={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Privacy Level</label>
                      <select value={privacyMode} onChange={(e) => setPrivacyMode(e.target.value)}>
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
                      onChange={(e) => setBitrate(parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="cancel-btn" onClick={() => setIsConfigOpen(false)}>Cancel</button>
                  <button className="start-btn" onClick={handleStartTransmission}>
                    <Zap size={16} /> Initialize Uplink
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
