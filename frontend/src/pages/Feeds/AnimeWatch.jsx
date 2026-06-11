import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Loader, Play, Pause, Star, Monitor, Search, Calendar, Clock, Tv, Film,
  X, ChevronDown, ChevronUp, SkipForward, Volume2, VolumeX, Maximize2,
  ChevronsLeft, ChevronsRight
} from "lucide-react";
import { motion } from "framer-motion";
import Hls from "hls.js";
import { getStreamUrls, getEpisodePage, getDirectStream, getMiruroStream, getConsumetStream } from "../../services/animeApi";
import { fetchAnimeRecommendations } from "../../services/anilistApi";
import { loadWatchHistory, addToWatchHistory } from "../../services/storage";
import Comments from "../../components/Comments";
import commentService from "../../services/commentService";
import authService from "../../services/authService";
import settingsService from "../../services/settingsService";
import "./AnimeWatch.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function AnimeWatch({ anime, animeName, onClose, startEp = 1, onEpisodeChange, detail, totalEpisodes }) {
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState([]);
  const [epIndex, setEpIndex] = useState(Math.max(0, startEp - 1));
  const [loading, setLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(false);
  const [servers, setServers] = useState([]);
  const [serverIndex, setServerIndex] = useState(0);
  const [streamUrl, setStreamUrl] = useState("");
  const [error, setError] = useState("");
  const [iframeError, setIframeError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [streamRetryCount, setStreamRetryCount] = useState(0);
  const [epSearch, setEpSearch] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const [epPage, setEpPage] = useState(0);
  const [hasMoreEps, setHasMoreEps] = useState(false);
  const [allEpsLoaded, setAllEpsLoaded] = useState(false);
  const [language, setLanguage] = useState("sub");
  const [seekTo, setSeekTo] = useState(null);
  const [streamMode, setStreamMode] = useState("iframe");
  const [subtitles, setSubtitles] = useState([]);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [episodesOpen, setEpisodesOpen] = useState(true);
  const [recOpen, setRecOpen] = useState(true);
  const hlsVideoRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const [introOutro, setIntroOutro] = useState({ intro: null, outro: null });
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [autoNext, setAutoNext] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("otaku_settings") || "{}"); return s.autoNext !== false; } catch { return true; }
  });
  const [autoNextCountdown, setAutoNextCountdown] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("otaku_settings") || "{}"); return s.playbackSpeed || 1; } catch { return 1; }
  });
  const [skipIntroSetting, setSkipIntroSetting] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("otaku_settings") || "{}"); return !!s.skipIntro; } catch { return false; }
  });
  const [skipOutroSetting, setSkipOutroSetting] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("otaku_settings") || "{}"); return !!s.skipOutro; } catch { return false; }
  });
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const autoNextTimerRef = useRef(null);
  const savedPositionRef = useRef(0);
  const autoNextRef = useRef(autoNext);
  const skipIntroRef = useRef(skipIntroSetting);
  const skipOutroRef = useRef(skipOutroSetting);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoveringTimeline, setHoveringTimeline] = useState(false);
  const [timelineHoverTime, setTimelineHoverTime] = useState(0);
  const playerStageRef = useRef(null);

  const handleSeek = useCallback((seconds) => {
    setSeekTo(seconds);
  }, []);

  const filteredServers = useMemo(() => {
    return servers.filter(s => s.type === language);
  }, [servers, language]);

  useEffect(() => {
    const langServers = servers.filter(s => s.type === language);
    if (langServers.length > 0) {
      setServerIndex(0);
      setStreamUrl(streamMode === "hls" ? langServers[0].url : makeStreamUrl(langServers[0]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, servers, streamMode]);

  const makeStreamUrl = useCallback((srv) => {
    if (!srv) return "";
    try {
      const u = new URL(srv.url);
      if (srv.type === "dub") u.searchParams.set("type", "dub");
      return u.toString();
    } catch { return srv.url; }
  }, []);

  const scrollRef = useRef(null);
  const iframeRef = useRef(null);
  const failedServers = useRef(new Set());
  const lastHistorySaveRef = useRef(false);

  useEffect(() => { autoNextRef.current = autoNext; }, [autoNext]);
  useEffect(() => { skipIntroRef.current = skipIntroSetting; }, [skipIntroSetting]);
  useEffect(() => { skipOutroRef.current = skipOutroSetting; }, [skipOutroSetting]);

  /* ─── COMMENTS ─── */
  const [comments, setComments] = useState([]);

  const currentUser = authService.getCurrentUser();
  const currentUsername = currentUser?.username || localStorage.getItem('username') || 'Guest';
  const currentAvatar = currentUser?.avatar || localStorage.getItem('avatar') || '';

  const getCommentUser = (u) => {
    if (!u) return { username: "Deleted User", avatar: null };
    if (Array.isArray(u)) u = u[0];
    if (!u) return { username: "Deleted User", avatar: null };
    if (typeof u === "object") return { username: u.username || u.name || "Deleted User", avatar: u.avatar || null };
    return { username: "Deleted User", avatar: null };
  };

  const mapComments = (data) => data.map(c => {
    const u = getCommentUser(c.user);
    return {
    id: c._id || c.id,
    user: u.username,
    avatar: u.avatar,
    text: c.content,
    time: new Date(c.createdAt).getTime().toString(),
    likes: c.likes?.length || 0,
    dislikes: c.dislikes?.length || 0,
    likedByMe: c.likedByMe || false,
    dislikedByMe: c.dislikedByMe || false,
    replies: (c.replies || []).map(r => {
      const ru = getCommentUser(r.user);
      return {
      id: r._id || r.id,
      user: ru.username,
      avatar: ru.avatar,
      text: r.content,
      time: new Date(r.createdAt).getTime().toString(),
      likes: r.likes?.length || 0,
      dislikes: r.dislikes?.length || 0,
      likedByMe: r.likedByMe || false,
      dislikedByMe: r.dislikedByMe || false,
      hasSpoiler: r.isSpoiler || false,
      replies: [],
    }; }),
    pinned: c.pinned || false,
    hasSpoiler: c.isSpoiler || false,
  }; });

  useEffect(() => {
    if (!anime.anilistId) return;
    let cancelled = false;
    commentService.getComments(anime.anilistId, { episode: (epIndex + 1), limit: 50 })
      .then(res => { if (!cancelled && res.success) setComments(mapComments(res.data)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [anime.anilistId, epIndex]);

  const handleAddComment = async (text) => {
    if (!anime.anilistId) return;
    await commentService.createComment(anime.anilistId, text, { episode: epIndex + 1 });
    const res = await commentService.getComments(anime.anilistId, { episode: epIndex + 1, limit: 50 });
    if (res.success) setComments(mapComments(res.data));
  };

  const refetchComments = useCallback(async () => {
    if (!anime.anilistId) return;
    const res = await commentService.getComments(anime.anilistId, { episode: epIndex + 1, limit: 50 });
    if (res.success) setComments(mapComments(res.data));
  }, [anime.anilistId, epIndex]);

  const handleLikeComment = async (id) => {
    await commentService.likeComment(id).catch(() => {});
  };

  const handleDislikeComment = async (id) => {
    await commentService.dislikeComment(id).catch(() => {});
  };

  const handleReplyComment = async (parentId, content, isSpoiler) => {
    try {
      await commentService.replyToComment(parentId, content, isSpoiler);
      await refetchComments();
    } catch (e) { console.error('[Otaku] Failed to reply to comment:', e); }
  };

  const handleEditComment = async (id, content) => {
    try {
      await commentService.editComment(id, content);
      await refetchComments();
    } catch (e) { console.error('[Otaku] Failed to edit comment:', e); }
  };

  const handleDeleteComment = async (id) => {
    try {
      await commentService.deleteComment(id);
      await refetchComments();
    } catch (e) { console.error('[Otaku] Failed to delete comment:', e); }
  };

  useEffect(() => {
    if (!anime?.slug && !anime?.tagSlug) { setLoading(false); setError("Could not find streaming source."); return; }
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; setError("Request timed out. Try again."); setLoading(false); }, 25000);
    (async () => {
      setLoading(true); setError(""); setEpPage(0); setAllEpsLoaded(false);
      try {
        const result = await getEpisodePage(
          anime.title || anime.slug, anime.tagSlug,
          anime.source, anime.sourceBase, anime.anilistId, 0
        );
        if (timedOut) return;
        clearTimeout(timer);
        if (result.episodes.length > 0) {
          setEpisodes(result.episodes);
          setHasMoreEps(result.hasMore);
          setEpIndex(Math.min(Math.max(0, startEp - 1), result.episodes.length - 1));
          setLoading(false);
          return;
        }
      } catch (e) { console.error('[Otaku] Failed to get streaming links:', e); }
      if (!timedOut) { clearTimeout(timer); setError("No streaming links available."); setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime.title, anime.slug, retryCount]);

  const loadMoreEpisodes = async () => {
    const nextPage = epPage + 1;
    try {
      const result = await getEpisodePage(
        anime.title || anime.slug, anime.tagSlug,
        anime.source, anime.sourceBase, anime.anilistId, nextPage
      );
      if (result?.episodes?.length > 0) {
        setEpisodes(prev => [...prev, ...result.episodes]);
        setEpPage(nextPage);
        setHasMoreEps(result.hasMore);
      }
      if (!result?.hasMore) setAllEpsLoaded(true);
    } catch {}
  };

  const episode = episodes[epIndex];

  const [streamCache, setStreamCache] = useState({});

  useEffect(() => {
    if (!episode || !anime) return;
    if (!anime) return;
    addToWatchHistory(anime.anilistId, episode.episode, animeName, anime.image || anime.img || '', 0, anime.episodes);
    const cached = streamCache[episode.url];
    if (cached) {
      const mode = cached._mode || "iframe";
      setError(""); setStreamLoading(false); setStreamUrl(""); setStreamMode(mode); setServers(cached.servers || cached); setServerIndex(0);
      return;
    }
    (async () => {
      setError(""); setStreamLoading(true); setStreamUrl(""); setServers([]); setServerIndex(0);
      try {
        const epNum = episode.episode || (epIndex + 1);
        const aniId = anime.anilistId;
        const hlsServers = [];

        if (aniId) {
          const promises = [
            getMiruroStream(aniId, epNum, 'sub'),
            getMiruroStream(aniId, epNum, 'dub'),
          ];
          if (animeName) promises.push(getConsumetStream(aniId, epNum, animeName, 'sub'));

          const [miruroSubRes, miruroDubRes, consumetRes] = await Promise.allSettled(promises);
          const miruroSub = miruroSubRes.status === 'fulfilled' ? miruroSubRes.value : null;
          const miruroDub = miruroDubRes.status === 'fulfilled' ? miruroDubRes.value : null;
          const consumet = consumetRes?.status === 'fulfilled' ? consumetRes.value : null;

          if (miruroSub?.stream?.url) {
            hlsServers.push({ label: 'Sub (HLS)', url: miruroSub.stream.url, type: 'sub' });
            const subs = (miruroSub.subtitles || []).filter(s => !s.label || /english/i.test(s.label));
            if (subs.length) setSubtitles(subs);
          }
          if (miruroDub?.stream?.url && miruroDub.stream.url !== miruroSub?.stream?.url) {
            hlsServers.push({ label: 'Dub (HLS)', url: miruroDub.stream.url, type: 'dub' });
          }
          if (miruroSub?.intro || miruroSub?.outro || miruroDub?.intro || miruroDub?.outro) {
            setIntroOutro({
              intro: miruroSub?.intro || miruroDub?.intro || null,
              outro: miruroSub?.outro || miruroDub?.outro || null,
            });
          }

          if (hlsServers.length === 0) {
            if (consumet?.stream?.url) {
              hlsServers.push({ label: 'Sub (HLS)', url: consumet.stream.url, type: 'sub' });
              const subs = (consumet.subtitles || []).filter(s => !s.label || /english/i.test(s.label));
              if (subs.length) setSubtitles(subs);
            } else {
              try {
                const direct = await getDirectStream(aniId, epNum);
                if (direct?.stream?.url) {
                  hlsServers.push({ label: 'Sub (HLS)', url: direct.stream.url, type: 'sub' });
                  const subs = (direct.subtitles || []).filter(s => !s.label || /english/i.test(s.label));
                  if (subs.length) setSubtitles(subs);
                }
              } catch {}
            }
          }
        }

        if (hlsServers.length > 0) {
          setStreamMode("hls");
          setServers(hlsServers);
          const preferred = hlsServers.find(s => s.type === language) || hlsServers[0];
          setStreamUrl(preferred.url);
          setStreamCache(c => ({ ...c, [episode.url]: { servers: hlsServers, _mode: "hls" } }));
          setStreamLoading(false);
          return;
        }

        setStreamMode("iframe");
        const urls = await getStreamUrls(episode.url, anime.source, anime.anilistId, anime.anilistId, anime.slug);
        if (urls.length > 0) {
          // Try to resolve embed URLs to direct video (HLS) via backend
          let resolved = false;
          for (const srv of urls) {
            try {
              const res = await fetch(`${API_BASE}/stream/resolve-embed?url=${encodeURIComponent(srv.url)}`);
              const json = await res.json();
              if (json.success && json.data) {
                const resolvedUrl = json.data.url;
                const resolvedType = json.data.type || 'hls';
                hlsServers.push({
                  label: srv.label,
                  url: resolvedUrl,
                  type: srv.type || 'sub',
                });
                if (resolvedType === 'hls') {
                  setStreamMode("hls");
                  setServers(hlsServers);
                  const preferred = hlsServers.find(s => s.type === language) || hlsServers[0];
                  setStreamUrl(preferred.url);
                  setStreamCache(c => ({ ...c, [episode.url]: { servers: hlsServers, _mode: "hls" } }));
                  setStreamLoading(false);
                  resolved = true;
                  break;
                }
              }
            } catch {}
          }
          if (!resolved) {
            setServers(urls);
            setStreamCache(c => ({ ...c, [episode.url]: { servers: urls, _mode: "iframe" } }));
          }
        }
        else setError("No video servers found.");
      } catch (e) { console.error('[Otaku] Stream load error:', e); setError("Failed to load stream."); }
      finally { setStreamLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, streamRetryCount]);

  useEffect(() => {
    if (!anime) return;
    const nextEp = episodes[epIndex + 1];
    if (!nextEp || streamCache[nextEp.url]) return;
    getStreamUrls(nextEp.url, anime.source, anime.anilistId, anime.anilistId, anime.slug).then(urls => {
      if (urls.length > 0) setStreamCache(c => ({ ...c, [nextEp.url]: { servers: urls, _mode: "iframe" } }));
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epIndex, episodes, anime.anilistId, streamCache]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape' && showShortcutsHelp) {
        setShowShortcutsHelp(false);
        return;
      }
      if (e.key === 'Escape') { onClose?.(); return; }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcutsHelp(s => !s);
        return;
      }
      if (streamMode !== "hls") return;
      const video = hlsVideoRef.current;
      if (!video) return;
      switch (e.key) {
        case ' ':
        case 'k': e.preventDefault(); video.paused ? video.play() : video.pause(); break;
        case 'j': e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); break;
        case 'l': e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 10); break;
        case 'ArrowRight': e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 10); break;
        case 'ArrowLeft': e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); break;
        case 'ArrowUp': e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); break;
        case 'ArrowDown': e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); break;
        case 'f': e.preventDefault(); document.fullscreenElement ? document.exitFullscreen() : video.requestFullscreen?.(); break;
        case 'm': e.preventDefault(); video.muted = !video.muted; break;
        case 'n': e.preventDefault(); if (epIndex < episodes.length - 1) { setEpIndex(i => i + 1); } break;
        case 'p': e.preventDefault(); if (epIndex > 0) { setEpIndex(i => i - 1); } break;
        default:
          if (e.key >= '0' && e.key <= '9' && video.duration) {
            e.preventDefault();
            video.currentTime = (parseInt(e.key, 10) / 10) * video.duration;
          }
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [streamMode, showShortcutsHelp, epIndex, episodes, onClose]);

  useEffect(() => {
    if (streamMode !== "hls" || !streamUrl) return;
    const video = hlsVideoRef.current;
    if (!video) return;

    const prevPos = savedPositionRef.current;
    if (hlsInstanceRef.current) { hlsInstanceRef.current.destroy(); hlsInstanceRef.current = null; }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        capLevelToPlayerSize: false,
        startLevel: -1,
        autoStartLoad: true,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (data.levels.length > 1) hls.currentLevel = data.levels.length - 1;
        if (prevPos > 2) video.currentTime = prevPos;
        subtitles.forEach((sub, i) => {
          if (sub.url && !video.querySelector(`track[src="${sub.url}"]`)) {
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = sub.label || 'English';
            track.srclang = 'en';
            track.src = sub.url;
            if (i === 0) track.default = true;
            video.appendChild(track);
          }
        });
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) { hls.destroy(); hlsInstanceRef.current = null; setError("HLS stream failed. Try another source."); }
      });
      hlsInstanceRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        if (prevPos > 2) video.currentTime = prevPos;
        video.play().catch(() => {});
      }, { once: true });
    }

    if (playbackSpeed !== 1) video.playbackRate = playbackSpeed;

    const autoSkippedIntro = { done: false };
    const autoSkippedOutro = { done: false };
    const onTimeUpdate = () => {
      const t = video.currentTime;
      const dur = video.duration;
      savedPositionRef.current = t;
      setCurrentTime(t);
      if (dur) setDuration(dur);

      if (introOutro.intro && t >= introOutro.intro.start && t < introOutro.intro.end) {
        if (skipIntroRef.current && !autoSkippedIntro.done) {
          autoSkippedIntro.done = true;
          video.currentTime = introOutro.intro.end;
          return;
        }
        setShowSkipIntro(true);
      } else {
        setShowSkipIntro(false);
        if (introOutro.intro && t >= introOutro.intro.end) autoSkippedIntro.done = true;
      }

      if (introOutro.outro && t >= introOutro.outro.start && t < introOutro.outro.end) {
        if (skipOutroRef.current && !autoSkippedOutro.done) {
          autoSkippedOutro.done = true;
          video.currentTime = introOutro.outro.end;
          return;
        }
        setShowSkipOutro(true);
      } else {
        setShowSkipOutro(false);
        if (introOutro.outro && t >= introOutro.outro.end) autoSkippedOutro.done = true;
      }

      if (dur && t > 5 && t % 15 < 1 && !lastHistorySaveRef.current) {
        lastHistorySaveRef.current = true;
        setTimeout(() => { lastHistorySaveRef.current = false; }, 5000);
        addToWatchHistory(anime.anilistId, episode.episode, animeName, anime.image || anime.img || '', t, anime.episodes);
      }
    };

    const onEnded = () => {
      setPlaying(false);
      addToWatchHistory(anime.anilistId, episode.episode, animeName, anime.image || anime.img || '', video.duration || 0, anime.episodes);
      if (autoNextRef.current && epIndex < episodes.length - 1) {
        setAutoNextCountdown(5);
        let count = 5;
        autoNextTimerRef.current = setInterval(() => {
          count--;
          setAutoNextCountdown(count);
          if (count <= 0) {
            clearInterval(autoNextTimerRef.current);
            autoNextTimerRef.current = null;
            setAutoNextCountdown(null);
            setEpIndex(i => i + 1);
          }
        }, 1000);
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const onLoadedMeta = () => {
      setDuration(video.duration);
      setVolume(video.volume);
      setMuted(video.muted);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("loadedmetadata", onLoadedMeta);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("loadedmetadata", onLoadedMeta);
      if (autoNextTimerRef.current) { clearInterval(autoNextTimerRef.current); autoNextTimerRef.current = null; }
      if (hlsInstanceRef.current) { hlsInstanceRef.current.destroy(); hlsInstanceRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamMode, streamUrl]);

  useEffect(() => {
    if (!episode || !anime) { savedPositionRef.current = 0; return; }
    const history = loadWatchHistory();
    const found = history.find(h => String(h.animeId) === String(anime.anilistId) && h.episode === episode.episode);
    savedPositionRef.current = (found?.position && found.position > 5) ? found.position : 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, anime.anilistId]);

  useEffect(() => {
    if (!anime?.anilistId) return;
    let cancelled = false;
    fetchAnimeRecommendations(anime.anilistId).then(r => { if (!cancelled) setRecommendations(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, [anime?.anilistId]);

  useEffect(() => {
    if (scrollRef.current && episodes[epIndex]) {
      const el = scrollRef.current.querySelector(`[data-ep="${epIndex}"]`);
      el?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [epIndex, episodes]);

  const filteredEpisodes = useMemo(() => {
    if (!epSearch) return episodes;
    const q = epSearch.toLowerCase();
    return episodes.filter(ep =>
      `Episode ${ep.episode}`.toLowerCase().includes(q) ||
      (ep.title && ep.title.toLowerCase().includes(q))
    );
  }, [episodes, epSearch]);

  const handleSideScroll = useCallback((e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      setVisibleCount(c => Math.min(c + 50, filteredEpisodes.length));
    }
  }, [filteredEpisodes.length]);

  const switchServerFn = (idx) => {
    const srv = filteredServers[idx];
    if (srv) {
      setServerIndex(idx);
      setIframeError(false);
      failedServers.current = new Set();
      setStreamUrl(streamMode === "hls" ? srv.url : makeStreamUrl(srv));
    }
  };

  const tryNextServer = useCallback(() => {
    const nextIdx = serverIndex + 1;
    if (filteredServers[nextIdx]) {
      failedServers.current.add(serverIndex);
      setServerIndex(nextIdx);
      setIframeError(false);
      setStreamUrl(streamMode === "hls" ? filteredServers[nextIdx].url : makeStreamUrl(filteredServers[nextIdx]));
    } else {
      setIframeError(true);
    }
  }, [serverIndex, filteredServers, makeStreamUrl, streamMode]);

  const handleIframeError = useCallback(() => {
    failedServers.current.add(serverIndex);
    const nextIdx = serverIndex + 1;
    if (filteredServers[nextIdx]) {
      setIframeError(false);
      setServerIndex(nextIdx);
      setStreamUrl(streamMode === "hls" ? filteredServers[nextIdx].url : makeStreamUrl(filteredServers[nextIdx]));
    } else {
      setIframeError(true);
    }
  }, [serverIndex, filteredServers, makeStreamUrl, streamMode]);

  const metadataItemsFn = useMemo(() => {
    const items = [];
    if (detail) {
      if (detail.year) items.push({ label: "Year", value: detail.year, icon: Calendar });
      if (detail.season) items.push({ label: "Season", value: detail.season, icon: Clock });
      if (detail.status) items.push({ label: "Status", value: detail.status, icon: Tv });
      if (detail.studio) items.push({ label: "Studio", value: detail.studio, icon: Monitor });
      if (detail.director) items.push({ label: "Director", value: detail.director, icon: Monitor });
      if (detail.genres?.length) items.push({ label: "Genres", value: detail.genres.slice(0, 3).join(", "), icon: Film });
    }
    return items;
  }, [detail]);

  function formatTime(s) {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const togglePlay = () => {
    const video = hlsVideoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  };

  const handleTimelineClick = (e) => {
    const video = hlsVideoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * duration;
  };

  const handleTimelineHover = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setTimelineHoverTime(pct * duration);
  };

  const skipBack = () => {
    const video = hlsVideoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  const skipForward = () => {
    const video = hlsVideoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
  };

  const handleVolumeSlider = (e) => {
    const video = hlsVideoRef.current;
    if (!video) return;
    const v = parseFloat(e.target.value);
    video.volume = v;
    if (v === 0) video.muted = true;
    else video.muted = false;
  };

  const toggleMute = () => {
    const video = hlsVideoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const toggleFullscreen = () => {
    const stage = playerStageRef.current;
    if (!stage) return;
    document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen();
  };

  useEffect(() => {
    const stage = playerStageRef.current;
    if (!stage) return;
    let timer = null;
    const show = () => {
      setShowControls(true);
      stage.style.cursor = "default";
      clearTimeout(timer);
      timer = setTimeout(() => {
        setShowControls(false);
        stage.style.cursor = "none";
      }, 3000);
    };
    const alwaysShow = () => {
      clearTimeout(timer);
      setShowControls(true);
      stage.style.cursor = "default";
    };
    stage.addEventListener("mousemove", show);
    stage.addEventListener("mouseenter", show);
    stage.addEventListener("mouseleave", alwaysShow);
    return () => {
      stage.removeEventListener("mousemove", show);
      stage.removeEventListener("mouseenter", show);
      stage.removeEventListener("mouseleave", alwaysShow);
      clearTimeout(timer);
      stage.style.cursor = "default";
    };
  }, []);

  return createPortal(
    <motion.div className="watch-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
    >
      <div className="watch-bg-ornament" />
      <button className="watch-side-collapse-outer" onClick={() => { setRightCollapsed(c => !c); }} title="Toggle sidebar">
        {rightCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
      <motion.div className="watch-shell" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
      >
        <div className="watch-main">
          <div className="watch-center-col">

            <div className="watch-player-stage" ref={playerStageRef}>
              {loading && (
                <div className="watch-center">
                  <div className="watch-pulse" />
                  <p className="watch-muted">Loading episodes...</p>
                </div>
              )}
              {!loading && error && (
                <div className="watch-center">
                  <div className="watch-err-badge">!</div>
                  <p className="watch-err-text">{error}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="watch-btn" onClick={() => { if (episodes.length === 0) setRetryCount(c => c + 1); else setStreamRetryCount(c => c + 1); }}>Retry</button>
                  </div>
                </div>
              )}
              {!loading && !error && streamUrl && !streamLoading && !iframeError && streamMode === "hls" && (
                <video
                  ref={hlsVideoRef}
                  key={`hls-${episode?.episode || 0}-${serverIndex}`}
                  className="watch-frame"
                  autoPlay
                  playsInline
                  style={{ background: '#000' }}
                />
              )}
              {!loading && !error && streamUrl && !streamLoading && !iframeError && streamMode === "iframe" && (
                <iframe
                  ref={iframeRef}
                  key={`${episode?.episode || 0}-${serverIndex}-${seekTo ?? 0}`}
                  className="watch-frame"
                  src={seekTo != null ? `${streamUrl}${streamUrl.includes("#") ? "&" : "#"}t=${seekTo}` : streamUrl}
                  title={`Episode ${episode?.episode || ""}`}
                  allow="autoplay; fullscreen; encrypted-media"
                  allowFullScreen
                  onError={handleIframeError}
                />
              )}
              {!loading && !error && iframeError && streamUrl && (
                <div className="watch-center">
                  <div className="watch-err-badge">!</div>
                  <p className="watch-err-text">Episode not available on this source.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {serverIndex < filteredServers.length - 1 && <button className="watch-btn" onClick={tryNextServer}>Try Next Source</button>}
                    {epIndex < episodes.length - 1 && <button className="watch-btn watch-btn-ghost" onClick={() => { setIframeError(false); failedServers.current = new Set(); setEpIndex(i => i + 1); }}>Skip to Next Episode</button>}
                    <button className="watch-btn watch-btn-ghost" onClick={() => { setIframeError(false); failedServers.current = new Set(); setStreamRetryCount(c => c + 1); }}>Retry</button>
                  </div>
                </div>
              )}
              {!loading && !error && streamLoading && (
                <div className="watch-center"><div className="watch-pulse" /><p className="watch-muted">Loading stream...</p></div>
              )}
              {!loading && !error && !streamLoading && !streamUrl && episode && (
                <div className="watch-center"><p className="watch-muted">Preparing stream...</p></div>
              )}

              {streamMode === "hls" && showSkipIntro && (
                <button className="skip-btn skip-intro" onClick={() => {
                  const video = hlsVideoRef.current;
                  if (video && introOutro.intro) {
                    video.currentTime = introOutro.intro.end;
                    setShowSkipIntro(false);
                  }
                }}>
                  <SkipForward size={14} /> Skip Intro
                </button>
              )}
              {streamMode === "hls" && showSkipOutro && (
                <button className="skip-btn skip-outro" onClick={() => {
                  if (epIndex < episodes.length - 1) {
                    setEpIndex(i => i + 1);
                  } else {
                    const video = hlsVideoRef.current;
                    if (video && introOutro.outro) {
                      video.currentTime = introOutro.outro.end;
                      setShowSkipOutro(false);
                    }
                  }
                }}>
                  <SkipForward size={14} /> {epIndex < episodes.length - 1 ? "Next Episode" : "Skip Outro"}
                </button>
              )}

              {autoNextCountdown !== null && (
                <div className="auto-next-overlay">
                  <div className="auto-next-card">
                    <p className="auto-next-label">Next episode in</p>
                    <div className="auto-next-timer">{autoNextCountdown}</div>
                    <div className="auto-next-actions">
                      <button className="auto-next-play" onClick={() => {
                        if (autoNextTimerRef.current) {
                          clearInterval(autoNextTimerRef.current);
                          autoNextTimerRef.current = null;
                        }
                        setAutoNextCountdown(null);
                        setEpIndex(i => i + 1);
                      }}>
                        <Play size={14} /> Play Now
                      </button>
                      <button className="auto-next-cancel" onClick={() => {
                        if (autoNextTimerRef.current) {
                          clearInterval(autoNextTimerRef.current);
                          autoNextTimerRef.current = null;
                        }
                        setAutoNextCountdown(null);
                      }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {streamUrl && !loading && !error && !streamLoading && (
                <>
                  {/* Top gradient + title overlay */}
                  <div className={`nc-top-gradient ${showControls ? "visible" : ""}`}>
                    <div className="nc-top-info">
                      <span className="nc-episode-label">EP {episode?.episode || ""}</span>
                      <span className="nc-title-label">{animeName || ""}</span>
                    </div>
                  </div>

                  {/* Center play overlay — HLS only */}
                  {streamMode === "hls" && !playing && (
                    <button className="nc-center-play" onClick={togglePlay} aria-label="Play">
                      <Play size={48} fill="white" />
                    </button>
                  )}

                  {/* Persistent thin progress bar (always visible) */}
                  <div className="nc-progress-bar">
                    <div className="nc-progress-fill" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                  </div>

                  {/* Bottom controls */}
                  <div className={`nc-controls ${showControls ? "visible" : ""}`}>
                    {/* Timeline seek bar */}
                    <div className="nc-timeline-row">
                      <div
                        className="nc-timeline-track"
                        onClick={streamMode === "hls" ? handleTimelineClick : undefined}
                        onMouseMove={streamMode === "hls" ? handleTimelineHover : undefined}
                        onMouseEnter={streamMode === "hls" ? () => setHoveringTimeline(true) : undefined}
                        onMouseLeave={streamMode === "hls" ? () => setHoveringTimeline(false) : undefined}
                      >
                        <div className="nc-timeline-buffered" style={{ width: `${duration ? Math.min(100, (currentTime / duration) * 100 + 15) : 0}%` }} />
                        <div className="nc-timeline-progress" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                        <div className="nc-timeline-thumb" />
                        {hoveringTimeline && streamMode === "hls" && (
                          <div className="nc-timeline-hover" style={{ left: `${duration ? (timelineHoverTime / duration) * 100 : 0}%` }}>
                            <span className="nc-timeline-hover-time">{formatTime(timelineHoverTime)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Button row */}
                    <div className="nc-controls-bottom">
                      <div className="nc-controls-left">
                        <button className="nc-btn" onClick={streamMode === "hls" ? togglePlay : undefined} aria-label={playing ? "Pause" : "Play"} disabled={streamMode !== "hls"}>
                          {playing ? <Pause size={19} /> : <Play size={19} />}
                        </button>
                        <button className="nc-btn nc-btn-sm" onClick={streamMode === "hls" ? skipBack : undefined} aria-label="Back 10s" disabled={streamMode !== "hls"}>
                          <ChevronsLeft size={16} />
                        </button>
                        <button className="nc-btn nc-btn-sm" onClick={streamMode === "hls" ? skipForward : undefined} aria-label="Forward 10s" disabled={streamMode !== "hls"}>
                          <ChevronsRight size={16} />
                        </button>
                        <span className="nc-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>

                      {(streamMode === "hls" && (showSkipIntro || showSkipOutro)) && (
                        <div className="nc-controls-center">
                          {showSkipIntro && (
                            <button className="nc-skip-btn" onClick={() => {
                              const video = hlsVideoRef.current;
                              if (video && introOutro.intro) {
                                video.currentTime = introOutro.intro.end;
                                setShowSkipIntro(false);
                              }
                            }}>
                              <SkipForward size={13} /> Skip Intro
                            </button>
                          )}
                          {showSkipOutro && (
                            <button className="nc-skip-btn" onClick={() => {
                              if (epIndex < episodes.length - 1) {
                                setEpIndex(i => i + 1);
                              } else {
                                const video = hlsVideoRef.current;
                                if (video && introOutro.outro) {
                                  video.currentTime = introOutro.outro.end;
                                  setShowSkipOutro(false);
                                }
                              }
                            }}>
                              <SkipForward size={13} /> {epIndex < episodes.length - 1 ? "Next Episode" : "Skip Outro"}
                            </button>
                          )}
                        </div>
                      )}

                      <div className="nc-controls-right">
                        <div className="nc-volume-wrap">
                          <button className="nc-btn" onClick={streamMode === "hls" ? toggleMute : undefined} aria-label={muted || volume === 0 ? "Unmute" : "Mute"} disabled={streamMode !== "hls"}>
                            {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                          </button>
                          <input
                            type="range" min="0" max="1" step="0.05"
                            value={muted ? 0 : volume}
                            onChange={streamMode === "hls" ? handleVolumeSlider : undefined}
                            className="nc-volume-slider"
                            aria-label="Volume"
                            disabled={streamMode !== "hls"}
                          />
                        </div>
                        <button className="nc-btn nc-btn-sm" onClick={() => setShowSpeedMenu(p => !p)} aria-label="Speed">
                          {playbackSpeed}x
                        </button>
                        {showSpeedMenu && (
                          <div className="nc-speed-menu">
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                              <button key={s} className={`nc-speed-opt ${playbackSpeed === s ? "active" : ""}`} onClick={() => {
                                setPlaybackSpeed(s);
                                setShowSpeedMenu(false);
                                const video = hlsVideoRef.current;
                                if (video) video.playbackRate = s;
                                try {
                                  const stored = JSON.parse(localStorage.getItem("otaku_settings") || "{}");
                                  stored.playbackSpeed = s;
                                  localStorage.setItem("otaku_settings", JSON.stringify(stored));
                                } catch {}
                              }}>
                                {s}x
                              </button>
                            ))}
                          </div>
                        )}
                        <button className="nc-btn nc-btn-sm" onClick={toggleFullscreen} aria-label="Fullscreen">
                          <Maximize2 size={16} />
                        </button>
                        <button className="nc-btn nc-btn-sm" onClick={() => setShowShortcutsHelp(s => !s)} aria-label="Keyboard shortcuts">
                          ?
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

            {showShortcutsHelp && (
                <div
                  onClick={() => setShowShortcutsHelp(false)}
                  className="watch-shortcuts-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
                >
                  <div                   onClick={e => e.stopPropagation()} className="watch-shortcuts-modal" style={{ background: 'rgba(0,0,0,0.95)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 14, padding: '24px 28px', width: '100%', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.02em' }}>Keyboard Shortcuts</h3>
                      <button onClick={() => setShowShortcutsHelp(false)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}>✕</button>
                    </div>
                    <div className="watch-shortcuts-grid">
                      {[
                        ['Space / K', 'Play / Pause'],
                        ['J / ←', 'Back 10s'],
                        ['L / →', 'Forward 10s'],
                        ['↑ / ↓', 'Volume'],
                        ['0-9', 'Jump to %'],
                        ['F', 'Fullscreen'],
                        ['M', 'Mute'],
                        ['N', 'Next episode'],
                        ['P', 'Previous episode'],
                        ['Esc', 'Close'],
                        ['?', 'Toggle this help'],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
                          <kbd style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 5, padding: '2px 7px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#ffffff' }}>{k}</kbd>
                          <span style={{ color: '#ffffff' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {servers.length > 0 && (
              <div className="watch-lang-toggle">
                <button className={`watch-lang-btn ${language === 'sub' ? 'active' : ''}`} onClick={() => setLanguage('sub')} disabled={!servers.some(s => s.type === 'sub')}>SUB</button>
                <button className={`watch-lang-btn ${language === 'dub' ? 'active' : ''}`} onClick={() => setLanguage('dub')} disabled={!servers.some(s => s.type === 'dub')}>DUB</button>
              </div>
            )}

            <div className="watch-scroll-area">
              <div className="watch-notif-banner">
                <span>Report broken episodes to help us improve</span>
              </div>

              {/* ═══ COMMENTS ═══ */}
              <Comments comments={comments} setComments={setComments} currentUser={authService.getCurrentUser()?.username || "You"} currentAvatar={authService.getCurrentUser()?.avatar || ''} isLoggedIn={authService.isLoggedIn()} onSeek={handleSeek} onAdd={handleAddComment} onLikeComment={handleLikeComment} onDislikeComment={handleDislikeComment} onReplyComment={handleReplyComment} onEditComment={handleEditComment} onDeleteComment={handleDeleteComment} />

            </div>
          </div>

          

          <aside className={`watch-side-box ${rightCollapsed ? 'collapsed' : ''}`}>
            <button
              className="watch-side-collapse-tab"
              onClick={() => { setRightCollapsed(c => !c); }}
              aria-label={rightCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={rightCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {rightCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            <button
                className="watch-side-head watch-accordion-header"
                id="episodes-header"
                aria-controls="episodes-content"
                aria-expanded={episodesOpen}
                onClick={() => setEpisodesOpen(v => !v)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Monitor size={13} />
                  <span>Episodes</span>
                  <span className="watch-side-count">{episodes.length}</span>
                </div>
                {episodesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <div id="episodes-content" className={`watch-accordion-content ${episodesOpen ? 'open' : 'collapsed'}`} role="region" aria-labelledby="episodes-header">
                <div className="watch-search-wrap">
                  <Search size={13} className="watch-search-icon" />
                  <input className="watch-search-input" type="text" placeholder="Search episodes..." value={epSearch} onChange={e => { setEpSearch(e.target.value); if (!e.target.value) setVisibleCount(50); }} />
                  {epSearch && <button className="watch-search-clear" onClick={() => { setEpSearch(""); setVisibleCount(50); }}><X size={12} /></button>}
                </div>
                <div className="watch-side-scroll" ref={scrollRef} onScroll={handleSideScroll}>
              {loading ? (
                <div className="watch-center"><Loader size={18} className="watch-spin" /></div>
              ) : filteredEpisodes.length === 0 ? (
                <div className="watch-center"><p className="watch-muted">{epSearch ? "No matching episodes" : "No episodes"}</p></div>
              ) : (
                <>
                  {filteredEpisodes.slice(0, visibleCount).map((ep, i) => {
                    const realIdx = episodes.indexOf(ep);
                    return (
                      <motion.button key={ep.id || realIdx} data-ep={realIdx} className={`watch-ep-item ${realIdx === epIndex ? "active" : ""}`} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300 }} onClick={() => { setEpIndex(realIdx); if (onEpisodeChange) onEpisodeChange(ep.episode); }}>
                        <div className="watch-ep-info">
                          <span className="watch-ep-name">Episode {ep.episode}</span>
                          {ep.title && <span className="watch-ep-title">{ep.title}</span>}
                          <span className="watch-ep-date">{ep.airDate ? new Date(ep.airDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) : ep.aired ? "Aired" : "Upcoming"}</span>
                        </div>
                        {realIdx === epIndex && <div className="watch-ep-active-dot" />}
                      </motion.button>
                    );
                  })}
                  {(hasMoreEps || filteredEpisodes.length > visibleCount) && (
                    <button className="watch-ep-load-more" onClick={() => {
                      if (hasMoreEps && !allEpsLoaded) loadMoreEpisodes();
                      setVisibleCount(c => c + 50);
                    }}>
                      Load More ({filteredEpisodes.length - visibleCount} remaining)
                    </button>
                  )}
                </>
              )}
            </div>

              </div>

              {recommendations.length > 0 && (
                <>
                  <button
                    className="watch-side-head watch-accordion-header"
                    id="rec-header"
                    aria-controls="rec-content"
                    aria-expanded={recOpen}
                    onClick={() => setRecOpen(v => !v)}
                    style={{ marginTop: 8 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Star size={13} />
                      <span>Recommended Anime</span>
                    </div>
                    {recOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <div id="rec-content" className={`watch-accordion-content ${recOpen ? 'open' : 'collapsed'}`} role="region" aria-labelledby="rec-header">
                    <div className="watch-side-rec">
                      <div className="watch-rec-scroll">
                        {recommendations.map((rec, i) => (
                          <button key={rec.id || i} className="watch-rec-item" onClick={() => navigate(`/anime/${rec.id}/info`)}>
                            <div className="watch-rec-thumb">
                              <img src={rec.image} alt={rec?.title || rec?.name || ''} />
                            </div>
                            <div className="watch-rec-info">
                              <span className="watch-rec-name">{rec.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
          </aside>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
