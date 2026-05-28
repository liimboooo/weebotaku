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
import Hls from "hls.js";
import AnimatedPage from "../../components/AnimatedPage";
import LiveRooms from "../../components/LiveRooms";
import * as roomService from "../../services/roomService";
import authService from "../../services/authService";
import { addNotification } from "../../services/notificationService";
import { fetchTopAnime, fetchSearchAnime } from "../../services/anilistApi";
import { findStreamingSource, getStreamUrls, getEpisodes, getMiruroStream, getDirectStream } from "../../services/animeApi";
import "./WatchTogetherCreative.css";

function getEmbedSource(urlString, startOffsetSec) {
  if (!urlString) return null;
  const offset = startOffsetSec && startOffsetSec > 5 ? Math.floor(startOffsetSec) : 0;
  try {
    const parsedUrl = new URL(urlString);
    const host = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = parsedUrl.pathname.replace(/\/+$/, "");

    if (host.includes("youtube.com") || host === "youtu.be") {
      let videoId = parsedUrl.searchParams.get("v");
      if (!videoId && host === "youtu.be") videoId = pathname.split("/").filter(Boolean)[0];
      if (!videoId && pathname.startsWith("/shorts/")) videoId = pathname.split("/")[2];
      if (videoId) {
        const startParam = offset > 0 ? `&start=${offset}` : '';
        return {
          kind: "iframe",
          url: `${process.env.REACT_APP_YOUTUBE_EMBED_BASE || "https://www.youtube-nocookie.com/embed/"}${videoId}?autoplay=1&rel=0&modestbranding=1${startParam}`,
          title: "YouTube broadcast",
          offset,
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
          offset: 0,
        };
      }
    }

    const isHls = parsedUrl.pathname.includes('/stream/proxy') || host.includes('ezvidapi.com') || /\.m3u8(\?|#|$)/i.test(parsedUrl.pathname);
    if (isHls) return { kind: "hls", url: urlString, title: "HLS stream", offset };

    const directVideo = /\.(mp4|webm|ogg)(\?|#|$)/i.test(parsedUrl.pathname + parsedUrl.search + parsedUrl.hash);
    return {
      kind: directVideo ? "video" : "iframe",
      url: urlString,
      title: directVideo ? "Direct video broadcast" : "Broadcast feed",
      offset,
    };
  } catch { return null; }
}

export default function WatchTogetherCreative() {
  const currentUser = authService.getCurrentUser();
  const isLoggedIn = authService.isLoggedIn();
  const [searchParams] = useSearchParams();

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
  const pickGenRef = useRef(0);
  const [sourceResolving, setSourceResolving] = useState(false);
  const [preResolvedUrl, setPreResolvedUrl] = useState(null);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [playbackStartedAt, setPlaybackStartedAt] = useState(null);
  const [countdownSec, setCountdownSec] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [dbRoomId, setDbRoomId] = useState(null);
  const [liveKitConnected, setLiveKitConnected] = useState(false);
  const [liveKitError, setLiveKitError] = useState('');

  const [chatMessages, setChatMessages] = useState([]);
  const [draftMessage, setDraftMessage] = useState("");
  const messagesEndRef = useRef(null);
  const liveRoomRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const expectedPosRef = useRef(0);

  // friends activity
  const [friendsWatching, setFriendsWatching] = useState([]);
  const [friendsAvailable, setFriendsAvailable] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [selectedInvites, setSelectedInvites] = useState(new Set());
  const [friendSearch, setFriendSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [syncElapsed, setSyncElapsed] = useState(0);

  const currentSource = getEmbedSource(currentSourceUrl, 0);

  useEffect(() => {
    if (!isLive || !playbackStartedAt) { setCountdownSec(null); return; }
    const check = () => {
      const diff = Math.ceil((new Date(playbackStartedAt).getTime() - Date.now()) / 1000);
      if (diff > 0) {
        setCountdownSec(diff);
      } else {
        setCountdownSec(null);
        const elapsed = Math.floor((Date.now() - new Date(playbackStartedAt).getTime()) / 1000);
        setSyncElapsed(elapsed);
        expectedPosRef.current = elapsed;
      }
    };
    check();
    const id = setInterval(check, 250);
    return () => clearInterval(id);
  }, [isLive, playbackStartedAt]);

  useEffect(() => {
    if (!isLive || !playbackStartedAt || countdownSec !== null) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(playbackStartedAt).getTime()) / 1000);
      setSyncElapsed(elapsed);
      expectedPosRef.current = elapsed;
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isLive, playbackStartedAt, countdownSec]);

  useEffect(() => {
    if (!currentSource || currentSource.kind !== "hls" || !videoRef.current) return;
    if (countdownSec !== null && countdownSec > 0) return;

    const video = videoRef.current;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    // pre-seek: if position is known before HLS loads, jump there once loaded
    const targetPos = expectedPosRef.current;
    let seekAttempted = false;

    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
      hls.loadSource(currentSource.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (targetPos > 5) video.currentTime = targetPos;
        video.play().catch(() => {});
        seekAttempted = true;
      });
      hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal) {
          hls.destroy();
        }
      });
      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = currentSource.url;
      video.addEventListener("loadedmetadata", () => {
        if (targetPos > 5) video.currentTime = targetPos;
        video.play().catch(() => {});
        seekAttempted = true;
      }, { once: true });
    }

    // retry seek every 500ms until it takes effect
    const retry = setInterval(() => {
      if (seekAttempted && video.currentTime > 1) return clearInterval(retry);
      const pos = expectedPosRef.current;
      if (pos > 5 && video.readyState > 0) {
        video.currentTime = pos;
        video.play().catch(() => {});
        seekAttempted = true;
      }
    }, 500);

    return () => {
      clearInterval(retry);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [currentSource?.url, currentSource?.kind, countdownSec]);

  // periodic drift correction for all viewers
  useEffect(() => {
    if (!isLive || !videoRef.current || countdownSec !== null) return;
    const pos = expectedPosRef.current;
    const video = videoRef.current;
    if (pos > 5 && Math.abs(video.currentTime - pos) > 2) {
      video.currentTime = pos;
    }
  }, [syncElapsed, isLive, countdownSec]);

  // joiner: prevent seeking past live position
  useEffect(() => {
    if (isHost || !videoRef.current) return;
    const video = videoRef.current;
    const clamp = () => {
      const livePos = expectedPosRef.current;
      if (livePos > 5 && video.currentTime > livePos + 1) {
        video.currentTime = livePos;
      }
    };
    video.addEventListener('seeking', clamp);
    return () => video.removeEventListener('seeking', clamp);
  }, [isHost]);

  useEffect(() => {
    const el = messagesEndRef.current?.parentElement;
    if (!el) return;
    const threshold = 120;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom <= threshold) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const isMountedRef = useRef(true);
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);
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
      if (chatPollRef.current) clearTimeout(chatPollRef.current);
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

  // fast initial fetch: rooms first (public, 1 query), friends in parallel (non-blocking)
  useEffect(() => {
    let cancelled = false;

    try {
      const cached = sessionStorage.getItem('wt_rooms');
      if (cached) {
        const parsed = JSON.parse(cached);
        setRooms(parsed.rooms || []);
        if (parsed.watching) setFriendsWatching(parsed.watching);
        if (parsed.available) setFriendsAvailable(parsed.available);
        setRoomsLoading(false);
      }
    } catch {}

    roomService.getRooms().then(res => {
      if (!cancelled && res.success) {
        setRooms(res.data);
        setRoomsLoading(false);
        try { sessionStorage.setItem('wt_rooms', JSON.stringify({ rooms: res.data, ts: Date.now() })); } catch {}
      }
    }).catch(() => { if (!cancelled) setRoomsLoading(false); });

    if (isLoggedIn) {
      roomService.getFriendsActivity().then(res => {
        if (!cancelled && res.success) {
          setFriendsWatching(res.data.watching || []);
          setFriendsAvailable(res.data.available || []);
        }
      }).catch(() => {}).finally(() => { if (!cancelled) setFriendsLoading(false); });
    } else {
      setFriendsLoading(false);
    }

    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // refresh rooms + friends periodically
  useEffect(() => {
    if (isLive) return;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await roomService.getRooms();
        if (res.success) setRooms(res.data);
      } catch {}
      if (isLoggedIn) {
        try {
          const res = await roomService.getFriendsActivity();
          if (res.success) {
            setFriendsWatching(res.data.watching || []);
            setFriendsAvailable(res.data.available || []);
          }
        } catch {}
      }
    };
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [isLoggedIn, isLive]);

  // load trending suggestions when config modal opens
  useEffect(() => {
    if (isConfigOpen && sourceType === 'anime' && !pickedAnime && animeResults.length === 0) {
      fetchTopAnime(1, "bypopularity").then(r => {
        if (r.data?.length) setAnimeResults(r.data.slice(0, 6));
      }).catch(() => {});
    }
  }, [isConfigOpen, sourceType, pickedAnime, animeResults.length]);

  // Adaptive chat polling — 2s when active, backs off to 5s when quiet
  const chatIntervalRef = useRef(2000);
  const idleCountRef = useRef(0);

  const startChatPolling = useCallback((roomId) => {
    if (chatPollRef.current) clearTimeout(chatPollRef.current);
    lastMsgTsRef.current = new Date().toISOString();
    chatIntervalRef.current = 2000;
    idleCountRef.current = 0;

    const poll = async () => {
      if (document.hidden) {
        chatPollRef.current = setTimeout(poll, chatIntervalRef.current);
        return;
      }
      try {
        const res = await roomService.getMessages(roomId, lastMsgTsRef.current);
        if (res.success && res.data.length > 0) {
          const myName = currentUser?.username;
          const newMsgs = res.data
            .filter(m => m.username !== myName)
            .map(m => ({
              id: m.ts + Math.random(),
              name: m.username,
              avatar: m.avatar || null,
              text: m.text,
              time: new Date(m.ts),
            }));
          if (newMsgs.length) {
            setChatMessages(prev => [...prev, ...newMsgs]);
          }
          lastMsgTsRef.current = res.data[res.data.length - 1].ts;
          chatIntervalRef.current = 2000;
          idleCountRef.current = 0;
        } else {
          idleCountRef.current++;
          if (idleCountRef.current > 5) chatIntervalRef.current = Math.min(5000, chatIntervalRef.current + 500);
        }
      } catch {}
      chatPollRef.current = setTimeout(poll, chatIntervalRef.current);
    };
    chatPollRef.current = setTimeout(poll, chatIntervalRef.current);
  }, [currentUser?.username]);

  const stopChatPolling = useCallback(() => {
    if (chatPollRef.current) {
      clearTimeout(chatPollRef.current);
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
          avatar: data.avatar || null,
          text: (data.text || '').slice(0, 500),
          time: new Date(),
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
    const gen = ++pickGenRef.current;
    setPickedAnime(anime);
    setSelectedAnime(anime.name);
    setRoomName(`${anime.name} Watch Party`);
    setAnimeSearch("");
    setAnimeResults([]);
    setEpisodeCount(anime.episodes || 0);
    setPickedEpisode(1);
    setStreamSource(null);
    setSourceResolving(true);

    try {
      const miruro = await getMiruroStream(anime.id, 1, 'sub');
      if (gen !== pickGenRef.current) return;
      if (miruro?.stream?.url) {
        setStreamSource({ source: 'miruro', anilistId: anime.id, slug: anime.id });
        setPreResolvedUrl(miruro.stream.url);
        setSourceResolving(false);
        return;
      }

      const direct = await getDirectStream(anime.id, 1);
      if (gen !== pickGenRef.current) return;
      if (direct?.stream?.url) {
        setStreamSource({ source: 'ezvidapi', anilistId: anime.id, slug: anime.id });
        setPreResolvedUrl(direct.stream.url);
        setSourceResolving(false);
        return;
      }
      const src = await findStreamingSource(anime.name, anime.id);
      if (gen !== pickGenRef.current) return;
      setSourceResolving(false);
      if (src) {
        setStreamSource(src);
        setPreResolvedUrl(null);
        const epsPromise = getEpisodes(anime.name, src.slug, src.source, src.sourceBase, src.anilistId);
        getStreamUrls(String(1), src.source, src.anilistId, null, src.slug)
          .then(servers => {
            if (gen !== pickGenRef.current) return;
            const sub = servers.find(s => s.type === 'sub') || servers[0];
            if (sub?.url) setPreResolvedUrl(sub.url);
          }).catch(() => {});
        const eps = await epsPromise;
        if (gen !== pickGenRef.current) return;
        if (eps.length) setEpisodeCount(eps.length);
      } else {
        addNotification({ title: "Source Unavailable", body: `No stream source found for "${anime.name}". Try External Link mode instead.`, type: "warning" });
      }
    } catch {
      if (gen === pickGenRef.current) setSourceResolving(false);
    }
  }, []);

  const resolveStreamUrl = useCallback(async (epNum) => {
    setResolvingStream(true);
    try {
      const aniId = pickedAnime?.id || streamSource?.anilistId;
      if (aniId) {
        const miruro = await getMiruroStream(aniId, epNum, 'sub');
        if (miruro?.stream?.url) return miruro.stream.url;
        const direct = await getDirectStream(aniId, epNum);
        if (direct?.stream?.url) return direct.stream.url;
      }
      if (!streamSource) return null;
      const servers = await getStreamUrls(
        String(epNum), streamSource.source, streamSource.anilistId, null, streamSource.slug
      );
      const sub = servers.find(s => s.type === 'sub') || servers[0];
      return sub?.url || null;
    } catch { return null; }
    finally { setResolvingStream(false); }
  }, [streamSource, pickedAnime]);

  const handleChangeEpisode = useCallback(async (epNum) => {
    if (epNum < 1 || (totalEpisodes > 0 && epNum > totalEpisodes)) return;
    const url = await resolveStreamUrl(epNum);
    if (!url) {
      addNotification({ title: "Stream Error", body: "Couldn't load this episode. Try another.", type: "error" });
      return;
    }
    if (dbRoomId) {
      try {
        const epRes = await roomService.updateEpisode(dbRoomId, epNum, url);
        if (epRes.success && epRes.data?.playbackStartedAt) {
          setPlaybackStartedAt(epRes.data.playbackStartedAt);
        } else {
          setPlaybackStartedAt(new Date(Date.now() + 5000).toISOString());
        }
      } catch {
        addNotification({ title: "Sync Error", body: "Episode change failed. Try again.", type: "error" });
        return;
      }
    } else {
      setPlaybackStartedAt(new Date(Date.now() + 5000).toISOString());
    }
    expectedPosRef.current = 0;
    setSyncElapsed(0);
    setCurrentEpisode(epNum);
    setCurrentSourceUrl(url);
    setIframeKey(k => k + 1);
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
      if (!streamSource) {
        if (sourceResolving) {
          addNotification({ title: "Still Resolving", body: "Stream source is still loading. Please wait.", type: "info" });
          return;
        }
        addNotification({ title: "No Source", body: `No stream source for "${pickedAnime.name}". Use External Link mode or pick another anime.`, type: "error" });
        return;
      }
      let url = (pickedEpisode === 1 && preResolvedUrl) ? preResolvedUrl : null;
      if (!url) {
        setResolvingStream(true);
        url = await resolveStreamUrl(pickedEpisode);
        setResolvingStream(false);
      }
      if (!url) {
        addNotification({ title: "Stream Error", body: `Couldn't load Episode ${pickedEpisode} for "${pickedAnime.name}". Try a different episode or use External Link.`, type: "error" });
        return;
      }
      initialSourceUrl = url;
      animeIdVal = pickedAnime.id;
      animeSlugVal = streamSource?.slug || '';
      animeImageVal = pickedAnime.img || '';
      epVal = pickedEpisode;
      totalEpVal = episodeCount || pickedAnime.episodes || 0;
    } else {
      if (!setupVideoUrl.trim()) {
        addNotification({ title: "URL Required", body: "Enter a broadcast URL or switch to Browse Anime mode.", type: "error" });
        return;
      }
      initialSourceUrl = setupVideoUrl.trim();
    }

    setCreating(true);
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
        setPlaybackStartedAt(res.data.playbackStartedAt || new Date(Date.now() + 5000).toISOString());
        setIsLive(true);
        setIsConfigOpen(false);
        setSelectedInvites(new Set());
        setParticipantCount(1);
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
    } finally {
      setCreating(false);
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
    // use currentTime + positionUpdatedAt for accurate position if available
    if (room.currentTime !== undefined && room.positionUpdatedAt) {
      const elapsed = (Date.now() - new Date(room.positionUpdatedAt).getTime()) / 1000;
      const pos = Math.max(0, room.currentTime + elapsed);
      expectedPosRef.current = pos;
      setSyncElapsed(Math.floor(pos));
      setPlaybackStartedAt(new Date(Date.now() - pos * 1000).toISOString());
    } else {
      setPlaybackStartedAt(room.playbackStartedAt || room.createdAt || null);
    }

    if (room.sourceType === 'anime' && room.animeId) {
      findStreamingSource(room.targetAnime, room.animeId).then(src => {
        if (src) setStreamSource(src);
      }).catch(() => {});
    }

    setChatMessages([
      {
        id: 1,
        name: 'system',
        avatar: null,
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
      const historyRes = await roomService.getMessages(roomId);
      if (historyRes.success && historyRes.data.length > 0) {
        const history = historyRes.data.map(m => ({
          id: m.ts + Math.random(),
          name: m.username,
          avatar: m.avatar || null,
          text: m.text,
        }));
        setChatMessages(prev => [...history, ...prev]);
      }

      connectToLiveKit(roomId);
    }
  }, [isLoggedIn, connectToLiveKit, currentUser?.id]);

  const resetRoomState = useCallback(() => {
    if (liveRoomRef.current) {
      liveRoomRef.current.disconnect();
      liveRoomRef.current = null;
    }
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setCountdownSec(null);
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
    if (!window.confirm("End stream for everyone?")) return;
    if (dbRoomId) {
      try { await roomService.leaveRoom(dbRoomId); } catch {}
      try { await roomService.endRoom(dbRoomId); } catch {}
      setRooms(prev => prev.filter(r => r._id !== dbRoomId));
    }
    resetRoomState();
  };

  // host: upload currentTime every 3s for drift-free sync
  useEffect(() => {
    if (!isLive || !isHost || !dbRoomId || !videoRef.current) return;
    const upload = setInterval(() => {
      const video = videoRef.current;
      if (video && video.currentTime > 0) {
        roomService.updatePosition(dbRoomId, video.currentTime).catch(() => {});
      }
    }, 3000);
    return () => clearInterval(upload);
  }, [isLive, isHost, dbRoomId]);

  const lastSyncTsRef = useRef(null);
  const lastPositionTsRef = useRef(null);
  useEffect(() => {
    if (!isLive || isHost || !dbRoomId) return;
    const check = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await roomService.getRoomStatus(dbRoomId);
        if (!res.success || !res.data?.isLive) {
          addNotification({ title: "Room Ended", body: "The host ended this room.", type: "info" });
          resetRoomState();
          return;
        }
        if (res.data.participantCount) setParticipantCount(res.data.participantCount);

        const serverTs = res.data.playbackStartedAt;
        const serverPosAt = res.data.positionUpdatedAt;
        const serverTime = res.data.currentTime;
        const epChanged = sourceType === 'anime' && res.data.currentEpisode && res.data.currentEpisode !== currentEpisode;

        // detect episode change or explicit sync
        const playbackRestarted = serverTs && lastSyncTsRef.current && serverTs !== lastSyncTsRef.current;
        if (epChanged || playbackRestarted) {
          if (res.data.currentEpisode) setCurrentEpisode(res.data.currentEpisode);
          if (res.data.sourceUrl) setCurrentSourceUrl(res.data.sourceUrl);
          if (serverTs) setPlaybackStartedAt(serverTs);
          setIframeKey(k => k + 1);
          addNotification({
            title: epChanged ? "Episode Changed" : "Syncing...",
            body: epChanged ? `Now playing Episode ${res.data.currentEpisode}` : "Syncing to accurate position!",
            type: "info",
          });
        }

        // track position changes for drift correction
        if (serverPosAt && lastPositionTsRef.current && serverPosAt !== lastPositionTsRef.current && !epChanged && !playbackRestarted) {
          const pos = serverTime + (Date.now() - new Date(serverPosAt).getTime()) / 1000;
          if (pos > 5) {
            expectedPosRef.current = pos;
            const video = videoRef.current;
            if (video && Math.abs(video.currentTime - pos) > 2) {
              video.currentTime = pos;
            }
          }
        }

        if (serverTs) lastSyncTsRef.current = serverTs;
        if (serverPosAt) lastPositionTsRef.current = serverPosAt;
      } catch {}
    }, 5000);
    return () => clearInterval(check);
  }, [isLive, isHost, dbRoomId, resetRoomState, sourceType, currentEpisode]);

  const handleCommsSubmit = (e) => {
    e.preventDefault();
    if (!draftMessage.trim() || !isLoggedIn) return;
    const text = draftMessage.trim();

    // always add locally immediately
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      avatar: currentUser?.avatar || null,
      name: currentUser?.username || 'You',
      text,
      time: new Date(),
    }]);

    // send via LiveKit if connected
    if (liveRoomRef.current && liveKitConnected) {
      const payload = JSON.stringify({
        type: 'chat',
        text,
        name: currentUser?.username || 'Anonymous',
        avatar: currentUser?.avatar || '',
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

    // reset adaptive polling to fast mode after sending
    chatIntervalRef.current = 2000;
    idleCountRef.current = 0;

    setDraftMessage("");
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
      else addNotification({ title: "Refresh Failed", body: res.message || "Could not refresh rooms", type: "error" });
    } catch {
      addNotification({ title: "Refresh Failed", body: "Network error. Try again.", type: "error" });
    }
    setRoomsLoading(false);
    if (isLoggedIn) {
      roomService.getFriendsActivity().then(res => {
        if (res.success) {
          setFriendsWatching(res.data.watching || []);
          setFriendsAvailable(res.data.available || []);
        }
      }).catch(() => {});
    }
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

  const hasFriendsData = friendsLoading || friendsWatching.length > 0 || friendsAvailable.length > 0;

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
                    {sourceType === 'anime' && totalEpisodes > 0 && (
                      <span className="episode-badge">
                        <Tv size={12} /> Ep {currentEpisode}/{totalEpisodes}
                      </span>
                    )}
                    {sourceType === 'anime' && isHost && totalEpisodes > 0 && (
                      <span className="episode-nav">
                        <button
                          className="ep-nav-btn"
                          disabled={currentEpisode <= 1 || resolvingStream}
                          onClick={() => handleChangeEpisode(currentEpisode - 1)}
                          title="Previous episode"
                        >
                          <SkipBack size={14} />
                        </button>
                        {resolvingStream && <span className="ep-nav-spinner" />}
                        <button
                          className="ep-nav-btn"
                          disabled={currentEpisode >= totalEpisodes || resolvingStream}
                          onClick={() => handleChangeEpisode(currentEpisode + 1)}
                          title="Next episode"
                        >
                          <SkipForward size={14} />
                        </button>
                      </span>
                    )}
                    {liveKitConnected && <span className="livekit-badge">LiveKit</span>}
                  </div>
                </div>
                <div className="stage-actions">
                  <button onClick={handleShareLink}><Share2 size={16} /> Share</button>
                  {isHost && (
                    <button onClick={async () => {
                      try {
                        const ct = videoRef.current?.currentTime || 0;
                        const res = await roomService.syncPlayback(dbRoomId, ct);
                        const ts = res.data?.playbackStartedAt || new Date().toISOString();
                        setPlaybackStartedAt(ts);
                        setIframeKey(k => k + 1);
                        addNotification({ title: "Syncing", body: "All viewers will seek to current position!", type: "info" });
                      } catch {}
                    }}><Wifi size={16} /> Sync All</button>
                  )}
                  {isHost ? (
                    <button className="exit-btn" onClick={handleEndStream}><X size={16} /> End Stream</button>
                  ) : (
                    <button className="exit-btn exit-btn--leave" onClick={handleLeaveRoom}><X size={16} /> Leave Room</button>
                  )}
                </div>
              </div>

              <div className="stage-grid">
                <div className="video-column">
                  {isLive && playbackStartedAt && countdownSec === null && (
                    <div className="sync-timer-bar">
                      <span className="sync-live-dot" />
                      <span className="sync-timer-label">
                        {Math.floor(syncElapsed / 60)}:{String(syncElapsed % 60).padStart(2, '0')}
                      </span>
                      <span className="sync-timer-hint">Everyone is synced to this timestamp</span>
                    </div>
                  )}
                  <div className="video-container">
                    {countdownSec !== null && countdownSec > 0 ? (
                      <div className="sync-countdown">
                        <div className="sync-countdown-number">{countdownSec}</div>
                        <p className="sync-countdown-label">Starting in sync...</p>
                        <p className="sync-countdown-hint">Video will load for everyone at the same moment</p>
                      </div>
                    ) : currentSource?.kind === "hls" ? (
                      <div className="video-wrapper">
                        <video
                          ref={videoRef}
                          key={iframeKey}
                          controls={isHost}
                          autoPlay
                          playsInline
                          disablePictureInPicture
                          style={{ width: "100%", height: "100%", background: "#000" }}
                        />
                        {!isHost && (
                          <button
                            className="go-live-btn"
                            onClick={() => {
                              const v = videoRef.current;
                              if (v) v.currentTime = expectedPosRef.current;
                            }}
                            title="Jump to live"
                          >
                            <Zap size={12} /> LIVE
                          </button>
                        )}
                      </div>
                    ) : currentSource?.kind === "iframe" ? (
                      <iframe
                        key={iframeKey}
                        src={currentSource.url}
                        title={currentSource.title}
                        allow="autoplay; fullscreen"
                      />
                    ) : currentSource?.kind === "video" ? (
                      <div className="video-wrapper">
                        <video
                          ref={videoRef}
                          src={currentSource.url}
                          controls={isHost}
                          autoPlay
                          disablePictureInPicture
                        />
                        {!isHost && (
                          <button
                            className="go-live-btn"
                            onClick={() => {
                              const v = videoRef.current;
                              if (v) v.currentTime = expectedPosRef.current;
                            }}
                            title="Jump to live"
                          >
                            <Zap size={12} /> LIVE
                          </button>
                        )}
                      </div>
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
                    <h3>Live Chat</h3>
                    <span className="chat-viewer-count"><Users size={12} /> {participantCount}</span>
                  </div>
                  <div className="chat-feed">
                    {chatMessages.length === 0 && (
                      <div className="chat-empty">No messages yet. Say something!</div>
                    )}
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`chat-msg${msg.name === 'system' ? ' chat-msg--system' : ''}${msg.name === currentUser?.username ? ' chat-msg--own' : ''}`}>
                        <div className="chat-avatar">
                          {msg.avatar ? <img src={msg.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (msg.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="chat-content">
                          <span className="chat-username">{msg.name}</span>
                          <span className="chat-text">{msg.text}</span>
                          {msg.time && <span className="chat-time">{new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <form className="chat-input" onSubmit={handleCommsSubmit}>
                    <input
                      placeholder={!isLoggedIn ? "Login to chat..." : liveKitConnected ? "Send encrypted signal..." : "Send message..."}
                      value={draftMessage}
                      onChange={(e) => setDraftMessage(e.target.value)}
                      maxLength={500}
                      disabled={!isLoggedIn}
                    />
                    <button type="submit" disabled={!isLoggedIn || !draftMessage.trim()}><Send size={16} /></button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ── Friends Activity Strip ── */}
          {!isLive && !isLoggedIn && (
            <motion.section
              className="login-banner-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="login-banner">
                <Users size={20} />
                <div className="login-banner-text">
                  <strong>Login to start or join a room</strong>
                  <p>See what your friends are watching and join the broadcast.</p>
                </div>
                <button className="login-banner-btn" onClick={() => window.location.href = '/login'}>
                  Sign In
                </button>
              </div>
            </motion.section>
          )}
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

              {friendsLoading && (
                <div className="friends-available-block">
                  <div className="friends-available-grid">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="friend-available-card" style={{ opacity: 0.4 }}>
                        <div className="skeleton-shimmer" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                        <span className="skeleton-shimmer" style={{ width: 60, height: 12, borderRadius: 4, display: 'inline-block' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                      maxLength={100}
                    />
                  </div>
                  <div className="field">
                    <label>Source Type</label>
                    <div className="type-toggle-group">
                      <button
                        type="button"
                        className={sourceType === 'anime' ? 'active' : ''}
                        onClick={() => setSourceType('anime')}
                      >
                        <Tv size={14} /> Browse Anime
                      </button>
                      <button
                        type="button"
                        className={sourceType === 'external' ? 'active' : ''}
                        onClick={() => setSourceType('external')}
                      >
                        <ExternalLink size={14} /> External Link
                      </button>
                    </div>
                  </div>

                  {sourceType === 'external' ? (
                    <div className="field">
                      <label>Broadcast URL <span className="field-hint">(YouTube, Twitch, or Direct link)</span></label>
                      <input
                        value={setupVideoUrl}
                        onChange={(e) => setSetupVideoUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        maxLength={2000}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="field">
                        <label>Search Anime</label>
                        <div className="anime-search-wrap">
                          <Search size={14} className="anime-search-icon" />
                          <input
                            className="anime-search-input"
                            value={animeSearch}
                            onChange={(e) => handleAnimeSearch(e.target.value)}
                            placeholder="Search anime..."
                          />
                          {animeSearching && <span className="anime-search-spinner" />}
                        </div>
                        {animeResults.length > 0 && (
                          <div className="anime-search-results">
                            {animeResults.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                className={`anime-search-item${pickedAnime?.id === a.id ? ' selected' : ''}`}
                                onClick={() => handlePickAnime(a)}
                              >
                                <div className="anime-search-img">
                                  {a.img ? <img src={a.img} alt={a.name} /> : <Tv size={14} />}
                                </div>
                                <div className="anime-search-info">
                                  <span className="anime-search-name">{a.name}</span>
                                  <span className="anime-search-meta">{a.episodes || '?'} eps</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {pickedAnime && (
                        <div className="field">
                          <div className="field-label-row">
                            <label>Episode</label>
                            <button
                              type="button"
                              className="clear-anime-btn"
                              onClick={() => { setPickedAnime(null); setStreamSource(null); setSourceResolving(false); setPreResolvedUrl(null); setAnimeResults([]); setAnimeSearch(""); }}
                            >
                              <X size={12} /> Change
                            </button>
                          </div>
                          <div className="episode-picker">
                            <div className="episode-picker-info">
                              <div className="episode-picker-img">
                                {pickedAnime.img ? <img src={pickedAnime.img} alt={pickedAnime.name} /> : <Tv size={20} />}
                              </div>
                              <div className="episode-picker-text">
                                <span className="episode-picker-title">{pickedAnime.name}</span>
                                <span className="episode-picker-range">Episode {pickedEpisode}{episodeCount ? ` of ${episodeCount}` : ''}</span>
                              </div>
                            </div>
                            <div className="episode-picker-controls">
                              <button
                                type="button"
                                className="ep-picker-btn"
                                disabled={pickedEpisode <= 1 || sourceResolving}
                                onClick={() => setPickedEpisode(p => Math.max(1, p - 1))}
                              >
                                <SkipBack size={14} />
                              </button>
                              <span className="ep-picker-num">{pickedEpisode}</span>
                              <button
                                type="button"
                                className="ep-picker-btn"
                                disabled={(episodeCount > 0 && pickedEpisode >= episodeCount) || sourceResolving}
                                onClick={() => setPickedEpisode(p => Math.min(episodeCount || 999, p + 1))}
                              >
                                <SkipForward size={14} />
                              </button>
                            </div>
                          </div>
                          {sourceResolving && <span className="field-hint resolving-hint">Searching for stream source...</span>}
                          {resolvingStream && <span className="field-hint resolving-hint">Resolving stream URL...</span>}
                          {!sourceResolving && !streamSource && !resolvingStream && (
                            <span className="field-hint source-unavailable-hint">No stream source available. Try another anime or use External Link mode.</span>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div className="field-row">
                    <div className="field">
                      <label>Privacy Level</label>
                      <select value={privacyMode} onChange={(e) => setPrivacyMode(e.target.value)}>
                        <option value="public">Public</option>
                        <option value="encrypted">Encrypted (Private)</option>
                        <option value="followers">Followers Only</option>
                      </select>
                    </div>
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
                      <div className="invite-search-wrap">
                        <Search size={13} className="invite-search-icon" />
                        <input
                          className="invite-search-input"
                          value={friendSearch}
                          onChange={(e) => setFriendSearch(e.target.value)}
                          placeholder="Search friends..."
                        />
                      </div>
                      <div className="invite-friend-list">
                        {friendsAvailable
                          .filter(f => f.username.toLowerCase().includes(friendSearch.toLowerCase()))
                          .map((f) => {
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
                  <button className="start-btn" onClick={handleStartTransmission} disabled={sourceResolving || creating}>
                    <Zap size={16} /> {creating ? 'Creating Room...' : sourceResolving ? 'Resolving Source...' : 'Initialize Uplink'}
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
