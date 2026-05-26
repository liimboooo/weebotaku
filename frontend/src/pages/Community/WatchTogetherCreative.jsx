import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  Globe,
  Link2,
  Play,
  Send,
  Share2,
  Users,
  UserPlus,
  X,
  Zap,
  Wifi,
  Check,
  Search,
  SkipForward,
  SkipBack,
  Tv,
  ExternalLink,
} from "lucide-react";
import { Room, RoomEvent } from "livekit-client";
import AnimatedPage from "../../components/AnimatedPage";
import LiveRooms from "../../components/LiveRooms";
import * as roomService from "../../services/roomService";
import authService from "../../services/authService";
import { addNotification } from "../../services/notificationService";
import { fetchTopAnime, fetchSearchAnime } from "../../services/anilistApi";
import { findStreamingSource, getStreamUrls, getEpisodes } from "../../services/animeApi";
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
  const [searchParams] = useSearchParams();

  const [animeOptions, setAnimeOptions] = useState(["Jujutsu Kaisen", "One Piece", "Demon Slayer", "Attack on Titan", "Naruto", "Chainsaw Man", "Solo Leveling", "My Hero Academia", "Other Broadcast"]);
  const [roomName, setRoomName] = useState("Zenith Watch Room");
  const [setupVideoUrl, setSetupVideoUrl] = useState("");
  const [currentSourceUrl, setCurrentSourceUrl] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [selectedAnime, setSelectedAnime] = useState("Jujutsu Kaisen");
  const [privacyMode, setPrivacyMode] = useState("public");
  const [isHost, setIsHost] = useState(false);
  const [bitrate, setBitrate] = useState(6000);

  // anime source mode
  const [sourceType, setSourceType] = useState("anime");
  const [animeSearch, setAnimeSearch] = useState("");
  const [animeResults, setAnimeResults] = useState([]);
  const [animeSearching, setAnimeSearching] = useState(false);
  const [pickedAnime, setPickedAnime] = useState(null);
  const [pickedEpisode, setPickedEpisode] = useState(1);
  const [episodeCount, setEpisodeCount] = useState(0);
  const [streamSource, setStreamSource] = useState(null);
  const [resolvingStream, setResolvingStream] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [totalEpisodes, setTotalEpisodes] = useState(0);

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [dbRoomId, setDbRoomId] = useState(null);
  const [liveKitConnected, setLiveKitConnected] = useState(false);
  const [liveKitError, setLiveKitError] = useState('');

  const [chatMessages, setChatMessages] = useState([]);
  const [draftComms, setDraftComms] = useState("");
  const messagesEndRef = useRef(null);
  const liveRoomRef = useRef(null);

  // friends activity
  const [friendsWatching, setFriendsWatching] = useState([]);
  const [friendsAvailable, setFriendsAvailable] = useState([]);
  const [selectedInvites, setSelectedInvites] = useState(new Set());

  const currentSource = getEmbedSource(currentSourceUrl);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const dbRoomIdRef = useRef(null);
  const chatPollRef = useRef(null);
  const lastMsgTsRef = useRef(null);

  useEffect(() => { dbRoomIdRef.current = dbRoomId; }, [dbRoomId]);

  // cleanup LiveKit + leave room on unmount / navigation
  useEffect(() => {
    const cleanup = () => {
      if (liveRoomRef.current) {
        liveRoomRef.current.disconnect();
        liveRoomRef.current = null;
      }
      if (chatPollRef.current) clearInterval(chatPollRef.current);
      if (dbRoomIdRef.current) {
        roomService.leaveRoom(dbRoomIdRef.current).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, []);

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

  // fetch friends activity
  useEffect(() => {
    if (!isLoggedIn) return;
    const load = async () => {
      try {
        const res = await roomService.getFriendsActivity();
        if (res.success) {
          setFriendsWatching(res.data.watching || []);
          setFriendsAvailable(res.data.available || []);
        }
      } catch {}
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // API chat polling (fallback when LiveKit unavailable)
  const startChatPolling = useCallback((roomId) => {
    if (chatPollRef.current) clearInterval(chatPollRef.current);
    lastMsgTsRef.current = new Date().toISOString();
    chatPollRef.current = setInterval(async () => {
      try {
        const res = await roomService.getMessages(roomId, lastMsgTsRef.current);
        if (res.success && res.data.length > 0) {
          const myName = currentUser?.username;
          const newMsgs = res.data
            .filter(m => m.username !== myName)
            .map(m => ({
              id: m.ts + Math.random(),
              name: m.username,
              avatar: (m.username || 'A').charAt(0).toUpperCase(),
              text: m.text,
            }));
          if (newMsgs.length) {
            setChatMessages(prev => [...prev, ...newMsgs]);
          }
          lastMsgTsRef.current = res.data[res.data.length - 1].ts;
        }
      } catch {}
    }, 3000);
  }, [currentUser?.username]);

  const stopChatPolling = useCallback(() => {
    if (chatPollRef.current) {
      clearInterval(chatPollRef.current);
      chatPollRef.current = null;
    }
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
    }
  }, []);

  const handleParticipantDisconnected = useCallback(() => {
    if (liveRoomRef.current) {
      const count = liveRoomRef.current.participants.size + 1;
      setParticipantCount(Math.max(0, count));
    }
  }, []);

  const connectToLiveKit = useCallback(async (roomId) => {
    if (!isLoggedIn) return;
    try {
      const tokenRes = await roomService.getRoomToken(roomId);
      if (!tokenRes.success) {
        setLiveKitError('LiveKit unavailable — using server chat.');
        startChatPolling(roomId);
        return;
      }

      const room = new Room();
      liveRoomRef.current = room;

      room.on(RoomEvent.DataReceived, handleDataReceived);
      room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.on(RoomEvent.Disconnected, () => {
        setLiveKitConnected(false);
        setParticipantCount(0);
        startChatPolling(roomId);
      });

      await room.connect(tokenRes.livekitUrl, tokenRes.token);
      const count = room.participants.size + 1;
      setParticipantCount(count);
      setLiveKitConnected(true);
      setLiveKitError('');
      stopChatPolling();
    } catch (err) {
      console.error('LiveKit connection failed:', err);
      setLiveKitError('LiveKit unavailable — using server chat.');
      startChatPolling(roomId);
    }
  }, [isLoggedIn, handleDataReceived, handleParticipantConnected, handleParticipantDisconnected, startChatPolling, stopChatPolling]);

  // anime search with debounce
  const searchTimeoutRef = useRef(null);
  const handleAnimeSearch = useCallback((query) => {
    setAnimeSearch(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) { setAnimeResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setAnimeSearching(true);
      try {
        const res = await fetchSearchAnime(query.trim());
        setAnimeResults((res.data || []).slice(0, 8));
      } catch { setAnimeResults([]); }
      setAnimeSearching(false);
    }, 400);
  }, []);

  const handlePickAnime = useCallback(async (anime) => {
    setPickedAnime(anime);
    setSelectedAnime(anime.name);
    setRoomName(`${anime.name} Watch Party`);
    setAnimeSearch("");
    setAnimeResults([]);
    setEpisodeCount(anime.episodes || 0);
    setPickedEpisode(1);

    const src = await findStreamingSource(anime.name, anime.id);
    if (src) {
      setStreamSource(src);
      const eps = await getEpisodes(anime.name, src.slug, src.source, src.sourceBase, src.anilistId);
      if (eps.length) setEpisodeCount(eps.length);
    }
  }, []);

  const resolveStreamUrl = useCallback(async (epNum) => {
    if (!streamSource) return null;
    setResolvingStream(true);
    try {
      const servers = await getStreamUrls(
        String(epNum), streamSource.source, streamSource.anilistId, null, streamSource.slug
      );
      const sub = servers.find(s => s.type === 'sub') || servers[0];
      return sub?.url || null;
    } catch { return null; }
    finally { setResolvingStream(false); }
  }, [streamSource]);

  const handleChangeEpisode = useCallback(async (epNum) => {
    if (epNum < 1 || (totalEpisodes > 0 && epNum > totalEpisodes)) return;
    const url = await resolveStreamUrl(epNum);
    if (!url) {
      addNotification({ title: "Stream Error", body: "Couldn't load this episode. Try another.", type: "error" });
      return;
    }
    setCurrentEpisode(epNum);
    setCurrentSourceUrl(url);
    if (dbRoomId) {
      roomService.updateEpisode(dbRoomId, epNum, url).catch(() => {});
    }
  }, [resolveStreamUrl, totalEpisodes, dbRoomId]);

  const toggleInvite = (friendId) => {
    setSelectedInvites(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleStartTransmission = async () => {
    let initialSourceUrl = '';
    let animeIdVal = null;
    let animeSlugVal = '';
    let animeImageVal = '';
    let epVal = 1;
    let totalEpVal = 0;

    if (sourceType === 'anime' && pickedAnime) {
      setResolvingStream(true);
      const url = await resolveStreamUrl(pickedEpisode);
      setResolvingStream(false);
      if (!url) {
        addNotification({ title: "Stream Error", body: "Couldn't find a stream for this episode.", type: "error" });
        return;
      }
      initialSourceUrl = url;
      animeIdVal = pickedAnime.id;
      animeSlugVal = streamSource?.slug || '';
      animeImageVal = pickedAnime.img || '';
      epVal = pickedEpisode;
      totalEpVal = episodeCount || pickedAnime.episodes || 0;
    } else {
      initialSourceUrl = setupVideoUrl.trim();
    }

    try {
      const res = await roomService.createRoom({
        name: roomName,
        sourceUrl: initialSourceUrl,
        sourceType,
        animeId: animeIdVal,
        animeSlug: animeSlugVal,
        animeImage: animeImageVal,
        currentEpisode: epVal,
        totalEpisodes: totalEpVal,
        targetAnime: selectedAnime,
        privacy: privacyMode,
        bitrate,
        inviteUserIds: [...selectedInvites],
      });
      if (res.success) {
        setDbRoomId(res.data._id);
        setIsHost(true);
        if (initialSourceUrl) setCurrentSourceUrl(initialSourceUrl);
        setCurrentEpisode(epVal);
        setTotalEpisodes(totalEpVal);
        setIsLive(true);
        setIsConfigOpen(false);
        setSelectedInvites(new Set());
        setParticipantCount(1);
        setRooms(prev => [res.data, ...prev.filter(r => r._id !== res.data._id)]);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (sourceType === 'anime' && pickedAnime && !streamSource) {
          const src = await findStreamingSource(pickedAnime.name, pickedAnime.id);
          if (src) setStreamSource(src);
        }

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

  const handleJoinRoom = useCallback(async (room) => {
    const roomId = room._id;
    const hostId = room.host?._id || room.host;
    setRoomName(room.name || 'Zenith Broadcast');
    setCurrentSourceUrl(room.sourceUrl || '');
    setSelectedAnime(room.targetAnime || 'Other Broadcast');
    setPrivacyMode(room.privacy || 'public');
    setBitrate(room.bitrate || 6000);
    setDbRoomId(roomId);
    setIsHost(currentUser?.id === hostId?.toString());
    setIsLive(true);
    setParticipantCount(room.participantCount || 1);
    setSourceType(room.sourceType || 'external');
    setCurrentEpisode(room.currentEpisode || 1);
    setTotalEpisodes(room.totalEpisodes || 0);

    if (room.sourceType === 'anime' && room.animeId) {
      findStreamingSource(room.targetAnime, room.animeId).then(src => {
        if (src) setStreamSource(src);
      }).catch(() => {});
    }

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
      try {
        const joinRes = await roomService.joinRoom(roomId);
        if (!joinRes.success) {
          setIsLive(false);
          setDbRoomId(null);
          addNotification({ title: "Can't Join", body: joinRes.message || "Room unavailable", type: "error" });
          return;
        }
      } catch {
        setIsLive(false);
        setDbRoomId(null);
        addNotification({ title: "Can't Join", body: "Failed to join room", type: "error" });
        return;
      }
      connectToLiveKit(roomId);

      roomService.getMessages(roomId).then(res => {
        if (res.success && res.data.length > 0) {
          const history = res.data.map(m => ({
            id: m.ts + Math.random(),
            name: m.username,
            avatar: (m.username || 'A').charAt(0).toUpperCase(),
            text: m.text,
          }));
          setChatMessages(prev => [...history, ...prev]);
        }
      }).catch(() => {});
    }
  }, [isLoggedIn, connectToLiveKit, currentUser?.id]);

  const resetRoomState = useCallback(() => {
    if (liveRoomRef.current) {
      liveRoomRef.current.disconnect();
      liveRoomRef.current = null;
    }
    stopChatPolling();
    setLiveKitConnected(false);
    setIsLive(false);
    setIsHost(false);
    setChatMessages([]);
    setParticipantCount(0);
    setDbRoomId(null);
  }, [stopChatPolling]);

  const handleLeaveRoom = async () => {
    if (dbRoomId) {
      try { await roomService.leaveRoom(dbRoomId); } catch {}
    }
    resetRoomState();
  };

  const handleEndStream = async () => {
    if (dbRoomId) {
      try { await roomService.leaveRoom(dbRoomId); } catch {}
      try { await roomService.endRoom(dbRoomId); } catch {}
      setRooms(prev => prev.filter(r => r._id !== dbRoomId));
    }
    resetRoomState();
  };

  useEffect(() => {
    if (!isLive || isHost || !dbRoomId) return;
    const check = setInterval(async () => {
      try {
        const res = await roomService.getRoomById(dbRoomId);
        if (!res.success || !res.data?.isLive) {
          addNotification({ title: "Room Ended", body: "The host ended this room.", type: "info" });
          resetRoomState();
        }
      } catch {}
    }, 10000);
    return () => clearInterval(check);
  }, [isLive, isHost, dbRoomId, resetRoomState]);

  const handleCommsSubmit = (e) => {
    e.preventDefault();
    if (!draftComms.trim() || !isLoggedIn) return;
    const text = draftComms.trim();

    // always add locally immediately
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      avatar: (currentUser?.username || 'Y').charAt(0).toUpperCase(),
      name: currentUser?.username || 'You',
      text,
    }]);

    // send via LiveKit if connected
    if (liveRoomRef.current && liveKitConnected) {
      const payload = JSON.stringify({
        type: 'chat',
        text,
        name: currentUser?.username || 'Anonymous',
      });
      liveRoomRef.current.localParticipant.publishData(
        new TextEncoder().encode(payload),
        { reliable: true, topic: 'chat' }
      );
    }

    // always persist to API so polling users see it
    if (dbRoomId) {
      roomService.sendMessage(dbRoomId, text).catch(() => {});
    }

    setDraftComms("");
  };

  const handleShareLink = async () => {
    const shareUrl = dbRoomId
      ? `${window.location.origin}/watch-together?room=${dbRoomId}`
      : window.location.href;
    try { await navigator.clipboard.writeText(shareUrl); }
    catch { window.prompt("Copy link", shareUrl); }
    addNotification({ title: "Link Copied", body: "Room link copied to clipboard.", type: "info" });
  };

  const handleRefreshRooms = async () => {
    setRoomsLoading(true);
    try {
      const res = await roomService.getRooms();
      if (res.success) setRooms(res.data);
    } catch { /* ignore */ }
    setRoomsLoading(false);
  };

  useEffect(() => {
    const roomId = searchParams.get('room');
    if (!roomId || !isLoggedIn || isLive) return;
    (async () => {
      try {
        const res = await roomService.getRoomById(roomId);
        if (res.success && res.data) {
          if (!res.data.isLive) {
            addNotification({ title: "Room Ended", body: "This room is no longer active.", type: "info" });
            return;
          }
          handleJoinRoom(res.data);
        }
      } catch {}
    })();
  }, [searchParams, isLoggedIn, isLive, handleJoinRoom]);

  const hasFriendsData = friendsWatching.length > 0 || friendsAvailable.length > 0;

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
                  {isHost ? (
                    <button className="exit-btn" onClick={handleEndStream}><X size={16} /> End Stream</button>
                  ) : (
                    <button className="exit-btn exit-btn--leave" onClick={handleLeaveRoom}><X size={16} /> Leave Room</button>
                  )}
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
                      Secure {privacyMode === 'encrypted' ? 'Private' : privacyMode === 'followers' ? 'Followers' : 'Public'} Uplink
                      {liveKitConnected ? ' · Real-time Chat Active' : ' · Server Chat Active'}
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
                      placeholder={!isLoggedIn ? "Login to chat..." : liveKitConnected ? "Send encrypted signal..." : "Send message..."}
                      value={draftComms}
                      onChange={(e) => setDraftComms(e.target.value)}
                      maxLength={500}
                      disabled={!isLoggedIn}
                    />
                    <button type="submit" disabled={!isLoggedIn || !draftComms.trim()}><Send size={16} /></button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ── Friends Activity Strip ── */}
          {!isLive && isLoggedIn && hasFriendsData && (
            <motion.section
              className="friends-activity-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="section-title">
                <h2><Users size={18} className="section-title-icon" /> Friends Activity</h2>
                <p>See what your friends are up to</p>
              </div>

              {friendsWatching.length > 0 && (
                <div className="friends-watching-block">
                  <span className="friends-block-label">Watching Now</span>
                  <div className="friends-watching-grid">
                    {friendsWatching.map((room) => (
                      <motion.div
                        key={room._id}
                        className="friend-room-card"
                        whileHover={{ y: -4 }}
                      >
                        <div className="friend-room-top">
                          <span className="friend-room-live-dot" />
                          <span className="friend-room-name">{room.name}</span>
                          <span className="friend-room-count">
                            <Users size={12} /> {room.participantCount}
                          </span>
                        </div>
                        {room.targetAnime && (
                          <span className="friend-room-anime">{room.targetAnime}</span>
                        )}
                        <div className="friend-room-avatars">
                          {room.friends.map((f) => (
                            <div key={f._id} className="friend-room-avatar" title={f.username}>
                              {f.avatar
                                ? <img src={f.avatar} alt={f.username} />
                                : <span>{f.username.charAt(0).toUpperCase()}</span>
                              }
                            </div>
                          ))}
                          {room.friends.length === 1 && (
                            <span className="friend-room-who">{room.friends[0].username} is watching</span>
                          )}
                          {room.friends.length > 1 && (
                            <span className="friend-room-who">{room.friends.length} friends watching</span>
                          )}
                        </div>
                        <button
                          className="friend-room-join-btn"
                          onClick={() => handleJoinRoom(room)}
                        >
                          <Play size={14} fill="currentColor" /> Join Room
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {friendsAvailable.length > 0 && (
                <div className="friends-available-block">
                  <span className="friends-block-label">Friends</span>
                  <div className="friends-available-strip">
                    {friendsAvailable.slice(0, 12).map((f) => (
                      <div key={f._id} className="friend-chip" title={f.username}>
                        <div className="friend-chip-avatar">
                          {f.avatar
                            ? <img src={f.avatar} alt={f.username} />
                            : <span>{f.username.charAt(0).toUpperCase()}</span>
                          }
                        </div>
                        <span className="friend-chip-name">{f.username}</span>
                      </div>
                    ))}
                    {friendsAvailable.length > 12 && (
                      <div className="friend-chip friend-chip-more">
                        +{friendsAvailable.length - 12}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {!isLive && (
            <LiveRooms
              rooms={rooms}
              onJoin={handleJoinRoom}
              loading={roomsLoading}
            />
          )}
        </main>

          {isConfigOpen && createPortal(
            <div className="config-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsConfigOpen(false); }}>
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
                        <option value="public">Public</option>
                        <option value="encrypted">Encrypted (Private)</option>
                        <option value="followers">Followers Only</option>
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

                  {/* ── Invite Friends Picker ── */}
                  {friendsAvailable.length > 0 && (
                    <div className="field invite-friends-field">
                      <label>
                        <UserPlus size={12} /> Invite Friends
                        {selectedInvites.size > 0 && (
                          <span className="invite-count">{selectedInvites.size} selected</span>
                        )}
                      </label>
                      <div className="invite-friend-list">
                        {friendsAvailable.map((f) => {
                          const selected = selectedInvites.has(f._id);
                          return (
                            <button
                              key={f._id}
                              type="button"
                              className={`invite-friend-item${selected ? ' selected' : ''}`}
                              onClick={() => toggleInvite(f._id)}
                            >
                              <div className="invite-friend-avatar">
                                {f.avatar
                                  ? <img src={f.avatar} alt={f.username} />
                                  : <span>{f.username.charAt(0).toUpperCase()}</span>
                                }
                              </div>
                              <span className="invite-friend-name">{f.username}</span>
                              <span className="invite-friend-check">
                                {selected && <Check size={14} />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <span className="field-hint">All friends will be notified. Selected friends get a direct invite.</span>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="cancel-btn" onClick={() => setIsConfigOpen(false)}>Cancel</button>
                  <button className="start-btn" onClick={handleStartTransmission}>
                    <Zap size={16} /> Initialize Uplink
                  </button>
                </div>
              </motion.div>
            </div>,
            document.body
          )}
      </div>
    </AnimatedPage>
  );
}
