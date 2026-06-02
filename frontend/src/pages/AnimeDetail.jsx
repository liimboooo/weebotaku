import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader, Play, Star, Tv, Calendar, Clock, Monitor, Search, Film,
  X, SkipForward, RefreshCw, List, AlertTriangle, Bell, ChevronDown, ChevronUp,
  Share2, Bookmark, Flag
} from "lucide-react";
import { getAnimeById } from "../data/animeData";
import Hls from "hls.js";
import { findStreamingSource, getStreamUrls, getEpisodePage, getDirectStream, getMiruroStream, getMiruroEpisodes } from "../services/animeApi";
import { loadWatchHistory, addToWatchHistory } from "../services/storage";
import { fetchAnimeRecommendations } from "../services/anilistApi";
import commentService from "../services/commentService";
import authService from "../services/authService";
import { getSocket, joinAnimeRoom, leaveAnimeRoom } from "../services/socket";
import Comments from "../components/Comments";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./Feeds/AnimeWatch.css";

const SETTINGS_KEY = "animewch_settings";
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; }
}

export default function AnimeDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [apiAnime, setApiAnime] = useState(null);
  const [animeLoading, setAnimeLoading] = useState(true);
  const [animeError, setAnimeError] = useState("");

  const [selectedEp, setSelectedEp] = useState(1);
  const [watchAnime, setWatchAnime] = useState(null);

  const [episodes, setEpisodes] = useState([]);
  const [epIndex, setEpIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(false);
  const [servers, setServers] = useState([]);
  const [serverIndex, setServerIndex] = useState(0);
  const [streamUrl, setStreamUrl] = useState("");
  const [error, setError] = useState("");
  const [iframeError, setIframeError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [streamRetryCount, setStreamRetryCount] = useState(0);
  const [isEpisodesExpanded, setIsEpisodesExpanded] = useState(true);
  const [episodeLayout, setEpisodeLayout] = useState('detailed');
  const [recommendations, setRecommendations] = useState([]);
  const [alertBannerVisible, setAlertBannerVisible] = useState(true);
  const [epSearch, setEpSearch] = useState("");
  const [language, setLanguage] = useState(() => {
    const s = loadSettings();
    if (s.defaultDubbed === "dubbed") return "dub";
    if (s.defaultDubbed === "subbed") return "sub";
    return localStorage.getItem("animewch_last_language") || "sub";
  });
  const [langKey, setLangKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState(50);
  const [epPage, setEpPage] = useState(0);
  const [hasMoreEps, setHasMoreEps] = useState(false);
  const [allEpsLoaded, setAllEpsLoaded] = useState(false);
  const [seekTo, setSeekTo] = useState(null);
  const [sourceLookupDone, setSourceLookupDone] = useState(false);
  const [streamMode, setStreamMode] = useState("iframe");
  const [introOutro, setIntroOutro] = useState({ intro: null, outro: null });
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => loadSettings().playbackSpeed || 1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const hlsVideoRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const autoNextTimerRef = useRef(null);

  const handleSeek = useCallback((seconds) => {
    setSeekTo(seconds);
  }, []);

  const scrollRef = useRef(null);
  const iframeRef = useRef(null);
  const failedServers = useRef(new Set());
  const epIndexRef = useRef(epIndex);
  const episodesRef = useRef(episodes);
  useEffect(() => { epIndexRef.current = epIndex; }, [epIndex]);
  useEffect(() => { episodesRef.current = episodes; }, [episodes]);

  const toStreamUrl = (srv) => {
    if (!srv) return "";
    try {
      const u = new URL(srv.url);
      if (srv.type === "dub") u.searchParams.set("type", "dub");
      return u.toString();
    } catch { return srv.url; }
  };

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  const currentUser = authService.getCurrentUser();
  const currentUsername = currentUser?.username || localStorage.getItem('username') || 'Guest';

  const mapComment = useCallback((c) => ({
    id: c._id,
    user: c.user?.username || 'Unknown',
    avatar: c.user?.avatar || '',
    role: c.user?.role || 'user',
    text: c.content,
    time: new Date(c.createdAt).getTime().toString(),
    likes: c.likes?.length || 0,
    dislikes: c.dislikes?.length || 0,
    replies: (c.replies || []).map(r => ({
      id: r._id,
      user: r.user?.username || 'Unknown',
      avatar: r.user?.avatar || '',
      role: r.user?.role || 'user',
      text: r.content,
      time: new Date(r.createdAt).getTime().toString(),
      likes: r.likes?.length || 0,
      dislikes: 0,
      replies: [],
    })),
    pinned: c.pinned || false,
    hasSpoiler: c.isSpoiler || false,
  }), []);

  useEffect(() => {
    setCommentsLoading(true);
    commentService.getComments(id, { episode: selectedEp })
      .then(res => {
        if (res.success) setComments(res.data.map(mapComment));
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [id, selectedEp, mapComment]);

  useEffect(() => {
    if (commentsLoading || comments.length === 0) return;
    const commentId = searchParams.get('comment');
    if (!commentId) return;
    const el = document.getElementById(`comment-${commentId}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [commentsLoading, comments.length, searchParams]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket?.connected) return;

    joinAnimeRoom(id);

    const handler = (data) => {
      if (!data?.comment) return;
      if (data.action === 'created') {
        const mapped = mapComment(data.comment);
        setComments(prev => {
          if (prev.some(c => c.id === mapped.id)) return prev;
          return [mapped, ...prev];
        });
      } else if (data.action === 'replied') {
        const mapped = mapComment(data.comment);
        setComments(prev => prev.map(c => c.id === mapped.id ? mapped : c));
      }
    };

    socket.on('new-comment', handler);
    return () => {
      leaveAnimeRoom(id);
      socket.off('new-comment', handler);
    };
  }, [id, mapComment]);

  const handleAddComment = useCallback(async (text) => {
    const res = await commentService.createComment(parseInt(id), text, { episode: selectedEp });
    if (res.success) setComments(prev => [mapComment(res.data), ...prev]);
  }, [id, selectedEp, mapComment]);

  const handleLikeComment = useCallback(async (commentId) => {
    await commentService.likeComment(commentId);
  }, []);

  const handleDislikeComment = useCallback(async (commentId) => {
    await commentService.dislikeComment(commentId);
  }, []);

  const handleReplyComment = useCallback(async (commentId, text) => {
    const res = await commentService.replyToComment(commentId, text);
    if (res.success) {
      setComments(prev => prev.map(c => c.id === commentId ? mapComment(res.data) : c));
    }
  }, [mapComment]);

  const handleEditComment = useCallback(async (commentId, newText) => {
    const res = await commentService.editComment(commentId, newText);
    if (res.success) {
      setComments(prev => prev.map(c => c.id === commentId ? mapComment(res.data) : c));
    }
  }, [mapComment]);

  const handleDeleteComment = useCallback(async (commentId) => {
    const res = await commentService.deleteComment(commentId);
    if (res.success) setComments(prev => prev.filter(c => c.id !== commentId));
  }, []);

  const anime = apiAnime;
  useDocumentTitle(anime ? `${anime.name} - Ep ${selectedEp}` : "Loading...");
  useEffect(() => {
    const epFromUrl = searchParams.get("ep");
    if (epFromUrl) { setSelectedEp(Number(epFromUrl)); return; }
    const history = loadWatchHistory();
    const found = history.find((h) => h.animeId === parseInt(id));
    if (found) setSelectedEp(found.episode);
  }, [id, searchParams]);

  useEffect(() => {
    let cancelled = false;
    setAnimeLoading(true);
    setAnimeError("");
    const load = async (attempt = 0) => {
      try {
        const a = await getAnimeById(id);
        if (cancelled) return;
        if (a) {
          setApiAnime(a);
          setAnimeLoading(false);
        } else if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1500));
          if (!cancelled) load(attempt + 1);
        } else {
          setAnimeLoading(false);
          setAnimeError("Could not load this anime.");
        }
      } catch {
        if (cancelled) return;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1500));
          if (!cancelled) load(attempt + 1);
        } else {
          setAnimeLoading(false);
          setAnimeError("Failed to load anime details.");
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!apiAnime?.id) return;
    let cancelled = false;
    fetchAnimeRecommendations(apiAnime.id).then(r => { if (!cancelled) setRecommendations(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, [apiAnime?.id]);

  useEffect(() => {
    if (!anime) return;
    setSourceLookupDone(false);
    setWatchAnime(null);
    setError("");
    (async () => {
      const src = await findStreamingSource(anime.name, anime.id).catch(() => null);
      if (src) {
        setWatchAnime(src);
      } else {
        setWatchAnime({ source: 'direct', anilistId: anime.id, slug: String(anime.id), tagSlug: String(anime.id), title: anime.name, sourceBase: '' });
      }
      setSourceLookupDone(true);
    })();
  }, [anime]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && episodes.length === 0) {
        setEpisodes(Array.from({ length: 12 }, (_, i) => ({
          episode: i + 1, title: `Episode ${i + 1}`, url: String(i + 1), thumbnail: '', airDate: null,
        })));
        setLoading(false);
      }
    }, 4000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sourceLookupDone || !watchAnime) return;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; setError("Request timed out. Try again."); setLoading(false); }, 25000);
    (async () => {
      setLoading(true); setError(""); setEpPage(0); setAllEpsLoaded(false);

      if (watchAnime.source !== 'direct') {
        try {
          const result = await getEpisodePage(
            watchAnime.title || watchAnime.slug, watchAnime.tagSlug,
            watchAnime.source, watchAnime.sourceBase, watchAnime.anilistId, 0
          );
          if (timedOut) return;
          if (result.episodes.length > 0) {
            clearTimeout(timer);
            setEpisodes(result.episodes);
            setHasMoreEps(result.hasMore);
            setEpIndex(Math.min(Math.max(0, selectedEp - 1), result.episodes.length - 1));
            setLoading(false);
            return;
          }
        } catch {}
      }

      try {
        const miruroEps = await getMiruroEpisodes(watchAnime.anilistId);
        if (timedOut) return;
        if (miruroEps?.providers) {
          const provNames = Object.keys(miruroEps.providers);
          for (const pname of provNames) {
            const epList = miruroEps.providers[pname]?.sub || miruroEps.providers[pname]?.dub || [];
            if (epList.length > 0) {
              clearTimeout(timer);
              setEpisodes(epList.map(ep => ({ episode: ep.number, title: ep.title || `Episode ${ep.number}`, url: String(ep.number) })));
              setEpIndex(Math.min(Math.max(0, selectedEp - 1), epList.length - 1));
              setLoading(false);
              return;
            }
          }
        }
      } catch {}

      const epCount = anime?.episodes || 0;
      if (epCount > 0) {
        clearTimeout(timer);
        setEpisodes(Array.from({ length: epCount }, (_, i) => ({ episode: i + 1, title: `Episode ${i + 1}`, url: String(i + 1) })));
        setEpIndex(Math.min(Math.max(0, selectedEp - 1), epCount - 1));
        setLoading(false);
        return;
      }

      if (!timedOut) {
        clearTimeout(timer);
        const mockEps = Array.from({ length: 12 }, (_, i) => ({
          episode: i + 1,
          title: `Episode ${i + 1}`,
          url: String(i + 1),
          thumbnail: '',
          airDate: null,
        }));
        setEpisodes(mockEps);
        setEpIndex(Math.min(Math.max(0, (selectedEp || 1) - 1), mockEps.length - 1));
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchAnime, sourceLookupDone, retryCount]);

  const loadMoreEpisodes = async () => {
    const nextPage = epPage + 1;
    const result = await getEpisodePage(
      watchAnime.title || watchAnime.slug, watchAnime.tagSlug,
      watchAnime.source, watchAnime.sourceBase, watchAnime.anilistId, nextPage
    );
    if (result.episodes.length > 0) {
      setEpisodes(prev => [...prev, ...result.episodes]);
      setEpPage(nextPage);
      setHasMoreEps(result.hasMore);
    }
    if (!result.hasMore) setAllEpsLoaded(true);
  };

  const episode = episodes[epIndex];

  useEffect(() => {
    if (!episode) return;
    let cancelled = false;
    addToWatchHistory(parseInt(id), episode.episode, anime?.name, anime?.img);
    setSeekTo(null);
    setIntroOutro({ intro: null, outro: null });
    setShowSkipIntro(false);
    setShowSkipOutro(false);
    setAutoNextCountdown(null);
    if (autoNextTimerRef.current) { clearInterval(autoNextTimerRef.current); autoNextTimerRef.current = null; }
    (async () => {
      setError(""); setStreamLoading(true); setStreamUrl(""); setServers([]); setServerIndex(0);
      try {
        const epNum = episode.episode || (epIndex + 1);
        const aniId = watchAnime.anilistId || parseInt(id);
        const hlsServers = [];

        if (aniId) {
          const [miruroSubRes, miruroDubRes] = await Promise.allSettled([
            getMiruroStream(aniId, epNum, 'sub'),
            getMiruroStream(aniId, epNum, 'dub'),
          ]);
          if (cancelled) return;
          const miruroSub = miruroSubRes.status === 'fulfilled' ? miruroSubRes.value : null;
          const miruroDub = miruroDubRes.status === 'fulfilled' ? miruroDubRes.value : null;

          if (miruroSub?.intro || miruroSub?.outro || miruroDub?.intro || miruroDub?.outro) {
            setIntroOutro({
              intro: miruroSub?.intro || miruroDub?.intro || null,
              outro: miruroSub?.outro || miruroDub?.outro || null,
            });
          }

          if (miruroSub?.stream?.url) {
            hlsServers.push({ label: 'Sub (HLS)', url: miruroSub.stream.url, type: 'sub' });
          }
          if (miruroDub?.stream?.url && miruroDub.stream.url !== miruroSub?.stream?.url) {
            hlsServers.push({ label: 'Dub (HLS)', url: miruroDub.stream.url, type: 'dub' });
          }

          if (hlsServers.length === 0) {
            try {
              const direct = await getDirectStream(aniId, epNum);
              if (cancelled) return;
              if (direct?.stream?.url) {
                hlsServers.push({ label: 'Sub (HLS)', url: direct.stream.url, type: 'sub' });
              }
              if (direct?.intro || direct?.outro) {
                setIntroOutro(prev => ({
                  intro: prev.intro || direct.intro,
                  outro: prev.outro || direct.outro,
                }));
              }
            } catch {}
          }
        }

        if (cancelled) return;
        if (hlsServers.length > 0) {
          setStreamMode("hls");
          setServers(hlsServers);
          const preferred = hlsServers.find(s => s.type === language) || hlsServers[0];
          setStreamUrl(preferred.url);
          setStreamLoading(false);
          return;
        }

        setStreamMode("iframe");
        const urls = await getStreamUrls(episode.url, watchAnime.source, watchAnime.anilistId, parseInt(id), watchAnime.slug);
        if (cancelled) return;
        if (urls.length > 0) { setServers(urls); }
        else setError("No video servers found.");
      } catch { if (!cancelled) setError("Failed to load stream."); }
      finally { if (!cancelled) setStreamLoading(false); }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, streamRetryCount]);

  useEffect(() => {
    if (servers.length > 0) {
      const ls = servers.filter(s => s.type === language);
      if (ls.length > 0) {
        setServerIndex(0);
        setStreamUrl(streamMode === "hls" ? ls[0].url : toStreamUrl(ls[0]));
        setLangKey(k => k + 1);
      }
    }
  }, [servers, language, streamMode]);

  const savedPositionRef = useRef(0);

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
      const settings = loadSettings();

      if (introOutro.intro && t >= introOutro.intro.start && t < introOutro.intro.end) {
        if (settings.skipIntro && !autoSkippedIntro.done) {
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
        if (settings.skipOutro && !autoSkippedOutro.done) {
          autoSkippedOutro.done = true;
          video.currentTime = introOutro.outro.end;
          return;
        }
        setShowSkipOutro(true);
      } else {
        setShowSkipOutro(false);
        if (introOutro.outro && t >= introOutro.outro.end) autoSkippedOutro.done = true;
      }

      if (dur && t > 5 && t % 15 < 1) {
        addToWatchHistory(parseInt(id), episode.episode, anime?.name, anime?.img, t);
      }
    };

    const onEnded = () => {
      addToWatchHistory(parseInt(id), episode.episode, anime?.name, anime?.img, video.duration || 0);
      const settings = loadSettings();
      const currentEpIdx = epIndexRef.current;
      const currentEps = episodesRef.current;
      if (settings.autoNext !== false && currentEpIdx < currentEps.length - 1) {
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
            setSelectedEp(currentEps[currentEpIdx + 1]?.episode || (currentEpIdx + 2));
          }
        }, 1000);
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      if (autoNextTimerRef.current) { clearInterval(autoNextTimerRef.current); autoNextTimerRef.current = null; }
      if (hlsInstanceRef.current) { hlsInstanceRef.current.destroy(); hlsInstanceRef.current = null; }
    };
  }, [streamMode, streamUrl]);

  useEffect(() => {
    if (!episode) { savedPositionRef.current = 0; return; }
    const history = loadWatchHistory();
    const found = history.find(h => h.animeId === parseInt(id) && h.episode === episode.episode);
    savedPositionRef.current = (found?.position && found.position > 5) ? found.position : 0;
  }, [episode, id]);

  const handleSkipIntro = useCallback(() => {
    const video = hlsVideoRef.current;
    if (video && introOutro.intro) {
      video.currentTime = introOutro.intro.end;
      setShowSkipIntro(false);
    }
  }, [introOutro.intro]);

  const handleSkipOutro = useCallback(() => {
    const settings = loadSettings();
    if (settings.autoNext !== false && epIndex < episodes.length - 1) {
      setEpIndex(i => i + 1);
      setSelectedEp(episodes[epIndex + 1]?.episode || (epIndex + 2));
    } else {
      const video = hlsVideoRef.current;
      if (video && introOutro.outro) {
        video.currentTime = introOutro.outro.end;
        setShowSkipOutro(false);
      }
    }
  }, [introOutro.outro, epIndex, episodes]);

  const cancelAutoNext = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setAutoNextCountdown(null);
  }, []);

  const handleSpeedChange = useCallback((speed) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    const video = hlsVideoRef.current;
    if (video) video.playbackRate = speed;
    try {
      const s = loadSettings();
      s.playbackSpeed = speed;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {}
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcutsHelp(s => !s);
        return;
      }
      if (e.key === 'Escape' && showShortcutsHelp) {
        setShowShortcutsHelp(false);
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
        case 'n': e.preventDefault(); if (epIndex < episodes.length - 1) { setEpIndex(i => i + 1); setSelectedEp(episodes[epIndex + 1]?.episode || (epIndex + 2)); } break;
        case 'p': e.preventDefault(); if (epIndex > 0) { setEpIndex(i => i - 1); setSelectedEp(episodes[epIndex - 1]?.episode || epIndex); } break;
        default:
          if (e.key >= '0' && e.key <= '9' && video.duration) {
            e.preventDefault();
            video.currentTime = (parseInt(e.key, 10) / 10) * video.duration;
          }
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [streamMode, showShortcutsHelp, epIndex, episodes]);

  useEffect(() => {
    if (scrollRef.current && episodes[epIndex]) {
      const el = scrollRef.current.querySelector(`[data-ep="${epIndex}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [epIndex, episodes]);

  const handleSideScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      setVisibleCount(c => Math.min(c + 50, filteredEpisodes.length));
    }
  };

  const handleLoadMore = () => {
    if (hasMoreEps && !allEpsLoaded) {
      loadMoreEpisodes();
    }
    setVisibleCount(c => c + 50);
  };

  const langServers = () => servers.filter(s => s.type === language);

  const switchServerFn = (idx) => {
    const srv = langServers()[idx];
    if (srv) {
      setServerIndex(idx);
      setIframeError(false);
      failedServers.current = new Set();
      setStreamUrl(toStreamUrl(srv));
    }
  };

  const tryNextServer = () => {
    const nextIdx = serverIndex + 1;
    const ls = langServers();
    if (ls[nextIdx]) {
      failedServers.current.add(serverIndex);
      setServerIndex(nextIdx);
      setIframeError(false);
      setStreamUrl(toStreamUrl(ls[nextIdx]));
    } else {
      setIframeError(true);
    }
  };

  const handleIframeError = () => {
    failedServers.current.add(serverIndex);
    const nextIdx = serverIndex + 1;
    const ls = langServers();
    if (ls[nextIdx]) {
      setIframeError(false);
      setServerIndex(nextIdx);
      setStreamUrl(toStreamUrl(ls[nextIdx]));
    } else {
      setIframeError(true);
    }
  };

  const filteredEpisodes = useMemo(() => {
    if (!epSearch) return episodes;
    const q = epSearch.toLowerCase();
    return episodes.filter(ep =>
      `Episode ${ep.episode}`.toLowerCase().includes(q) ||
      (ep.title && ep.title.toLowerCase().includes(q))
    );
  }, [episodes, epSearch]);

  const watchedEpisodes = useMemo(() => {
    if (!anime?.id) return new Set();
    const history = loadWatchHistory();
    return new Set(history.filter(h => h.animeId === anime.id).map(h => h.episode));
  }, [anime?.id, episodes]);

  const [episodeTitles, setEpisodeTitles] = useState(null);

  useEffect(() => {
    const id = watchAnime?.anilistId || anime?.id;
    if (!id) return;
    let cancelled = false;
    (async () => {
      // Simulate episode titles - in a real app this would come from API
      const titleMap = {};
      if (anime?.episodes) {
        for (let i = 1; i <= Math.min(anime.episodes, 20); i++) {
          titleMap[i] = `Episode ${i}`;
        }
      }
      if (!cancelled && titleMap) setEpisodeTitles(titleMap);
    })();
    return () => { cancelled = true; };
  }, [watchAnime?.anilistId, anime?.id, anime?.episodes]);

  const metadataItemsFn = useMemo(() => {
    const items = [];
    if (anime) {
      if (anime.year) items.push({ label: "Year", value: anime.year, icon: Calendar });
      if (anime.season) items.push({ label: "Season", value: anime.season, icon: Clock });
      if (anime.status) items.push({ label: "Status", value: anime.status, icon: Tv });
      if (anime.studio) items.push({ label: "Studio", value: anime.studio, icon: Monitor });
      if (anime.director) items.push({ label: "Director", value: anime.director, icon: Monitor });
      if (anime.genres?.length) items.push({ label: "Genres", value: anime.genres.slice(0, 3).join(", "), icon: Film });
    }
    return items;
  }, [anime]);

  const nextAiring = useMemo(() => {
    if (!anime?.nextAiringEpisode?.airingAt) return null;
    const now = Date.now() / 1000;
    const diff = anime.nextAiringEpisode.airingAt - now;
    if (diff <= 0) return { ep: anime.nextAiringEpisode.episode, text: "Airing now" };
    const days = Math.floor(diff / 86400);
    if (days >= 1) return { ep: anime.nextAiringEpisode.episode, text: `${days} day${days > 1 ? "s" : ""}` };
    const hours = Math.floor(diff / 3600);
    if (hours >= 1) return { ep: anime.nextAiringEpisode.episode, text: `${hours} hour${hours > 1 ? "s" : ""}` };
    const mins = Math.floor(diff / 60);
    return { ep: anime.nextAiringEpisode.episode, text: `${mins} min${mins > 1 ? "s" : ""}` };
  }, [anime?.nextAiringEpisode]);

  if (animeLoading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#ffffff", animation: "watch-spin 0.8s linear infinite" }} />
        <p style={{ color: "#ffffff", fontSize: 13 }}>Loading anime...</p>
      </div>
    );
  }

  if (!anime || animeError) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#ffffff", fontSize: 14 }}>{animeError || "Anime not found"}</p>
        <button onClick={() => navigate(-1)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#ffffff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Go back</button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a] flex">
      {/* ambient bg */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse at 75% 0%, rgba(217,119,6,0.12), transparent 60%),
            radial-gradient(ellipse at 25% 100%, rgba(234,88,12,0.08), transparent 50%),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 4px)
          `
        }}
      />
      <div className="relative z-10 w-full min-h-screen flex flex-col bg-black/95">
        <div className="flex-1 flex min-h-0 relative">

          {/* ─── CENTER COLUMN ─── */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* ─── VIDEO PLAYER ─── */}
            <div className="relative w-full bg-gradient-to-b from-zinc-900/50 to-black overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: 'calc(100vh - 140px)' }}>
              {/* loading */}
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <p className="text-sm text-zinc-500">Loading episodes...</p>
                </div>
              )}
              {/* error */}
              {!loading && error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-xl font-bold">!</div>
                  <p className="text-sm text-zinc-400">{error}</p>
                  <button className="px-5 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors" onClick={() => { if (episodes.length === 0) setRetryCount(c => c + 1); else setStreamRetryCount(c => c + 1); }}>
                    Retry
                  </button>
                </div>
              )}
              {/* hls video */}
              {!loading && !error && streamUrl && !streamLoading && !iframeError && streamMode === "hls" && (
                <video ref={hlsVideoRef} key={`hls-${episode?.episode || 0}-${serverIndex}`} className="w-full h-full object-contain" controls autoPlay playsInline />
              )}
              {/* iframe */}
              {!loading && !error && streamUrl && !streamLoading && !iframeError && streamMode === "iframe" && (
                <iframe ref={iframeRef} key={`${episode?.episode || 0}-${serverIndex}-${langKey}-${seekTo ?? 0}`} className="w-full h-full" src={seekTo != null ? `${streamUrl}${streamUrl.includes("#") ? "&" : "#"}t=${seekTo}` : streamUrl} title={`Episode ${episode?.episode || ""}`} allow="autoplay; fullscreen; encrypted-media" allowFullScreen onError={handleIframeError} />
              )}
              {/* iframe error */}
              {!loading && !error && iframeError && streamUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-xl font-bold">!</div>
                  <p className="text-sm text-zinc-400">Episode not available on this source.</p>
                  <div className="flex gap-3">
                    {serverIndex < langServers().length - 1 && <button className="px-5 py-2 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors" onClick={tryNextServer}>Try Next Source</button>}
                    {epIndex < episodes.length - 1 && <button className="px-5 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors" onClick={() => { setIframeError(false); failedServers.current = new Set(); setEpIndex(i => i + 1); }}>Skip to Next Episode</button>}
                    <button className="px-5 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors" onClick={() => { setIframeError(false); failedServers.current = new Set(); setStreamRetryCount(c => c + 1); }}>Retry</button>
                  </div>
                </div>
              )}
              {/* stream loading */}
              {!loading && !error && streamLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
                  <p className="text-sm text-zinc-500">Loading stream...</p>
                </div>
              )}
              {/* preparing */}
              {!loading && !error && !streamLoading && !streamUrl && episode && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-zinc-500">Preparing stream...</p>
                </div>
              )}

              {/* skip buttons */}
              {streamMode === "hls" && showSkipIntro && (
                <button className="absolute bottom-20 right-4 z-10 flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/80 text-white text-xs font-semibold backdrop-blur-sm hover:bg-amber-500 transition-colors shadow-lg" onClick={handleSkipIntro}>
                  <SkipForward size={14} /> Skip Intro
                </button>
              )}
              {streamMode === "hls" && showSkipOutro && (
                <button className="absolute bottom-20 right-4 z-10 flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/80 text-white text-xs font-semibold backdrop-blur-sm hover:bg-amber-500 transition-colors shadow-lg" onClick={handleSkipOutro}>
                  <SkipForward size={14} /> {epIndex < episodes.length - 1 ? "Next Episode" : "Skip Outro"}
                </button>
              )}

              {/* auto next overlay */}
              {autoNextCountdown !== null && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-6 text-center shadow-2xl">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Next episode in</p>
                    <div className="text-5xl font-bold text-white mb-4">{autoNextCountdown}</div>
                    <div className="flex gap-3 justify-center">
                      <button className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-400 transition-colors" onClick={() => { cancelAutoNext(); setEpIndex(i => i + 1); setSelectedEp(episodes[epIndex + 1]?.episode || (epIndex + 2)); }}>
                        <Play size={14} /> Play Now
                      </button>
                      <button className="px-5 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors" onClick={cancelAutoNext}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* player controls */}
              {streamMode === "hls" && !loading && !error && streamUrl && !streamLoading && (
                <>
                  <button
                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 text-white text-sm font-bold backdrop-blur-sm hover:bg-black/70 transition-colors cursor-pointer border-none"
                    onClick={() => setShowShortcutsHelp(s => !s)}
                    title="Keyboard shortcuts (press ?)"
                  >?</button>
                  <div className="absolute top-3 left-3 z-20">
                    <button className="px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-medium backdrop-blur-sm hover:bg-black/70 transition-colors cursor-pointer border-none" onClick={() => setShowSpeedMenu(p => !p)}>
                      {playbackSpeed}x
                    </button>
                    {showSpeedMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl py-1 z-10 min-w-[80px]">
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                          <button key={s} className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${playbackSpeed === s ? "text-amber-400 bg-amber-500/10" : "text-zinc-400 hover:text-white hover:bg-white/5"}`} onClick={() => handleSpeedChange(s)}>
                            {s}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* shortcuts help */}
              {showShortcutsHelp && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6" onClick={() => setShowShortcutsHelp(false)}>
                  <div className="bg-zinc-900/95 border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-bold text-white tracking-wide">Keyboard Shortcuts</h3>
                      <button className="text-zinc-400 hover:text-white cursor-pointer bg-transparent border-none p-1" onClick={() => setShowShortcutsHelp(false)}>✕</button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
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
                        ['?', 'Toggle this help'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 border-b border-white/5 pb-1.5">
                          <kbd className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 font-mono text-[11px] text-white whitespace-nowrap">{k}</kbd>
                          <span className="text-zinc-400">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── SERVER TOGGLE ─── */}
            {servers.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Source</span>
                <button className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${language === 'sub' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-zinc-400 border border-transparent hover:bg-white/10 hover:text-white'}`} onClick={() => { setLanguage('sub'); try { localStorage.setItem('animewch_last_language', 'sub'); } catch {} }} disabled={!servers.some(s => s.type === 'sub')}>SUB</button>
                <button className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${language === 'dub' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-zinc-400 border border-transparent hover:bg-white/10 hover:text-white'}`} onClick={() => { setLanguage('dub'); try { localStorage.setItem('animewch_last_language', 'dub'); } catch {} }} disabled={!servers.some(s => s.type === 'dub')}>DUB</button>
              </div>
            )}

            {/* ─── BANNER ─── */}
            {alertBannerVisible && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#3d1a04] border-b border-orange-500/20">
                <AlertTriangle size={13} className="text-orange-400 flex-none" />
                <p className="text-xs text-orange-400 flex-1">If the current server doesn't work, feel free to try the other available servers.</p>
                <button className="text-orange-400/70 hover:text-orange-300 cursor-pointer bg-transparent border-none p-1 flex-none" onClick={() => setAlertBannerVisible(false)}><X size={12} /></button>
              </div>
            )}

            {/* ─── VIDEO METADATA ─── */}
            <div className="px-4 py-4 flex flex-col gap-4 border-b border-white/5">
              {/* Episode Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {episode?.title || episodeTitles?.[selectedEp] || `Episode ${selectedEp}`}
              </h1>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Anime Info Row */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-zinc-800 ring-2 ring-white/10 shrink-0 overflow-hidden">
                    {anime?.img && <img src={anime.img} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-base leading-tight">{anime?.name || "Anime"}</span>
                    <span className="text-xs text-zinc-400 font-medium mt-0.5">6.4K users</span>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <button className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-zinc-200 transition-colors">
                    <Bookmark size={14} /> Add to List
                  </button>
                  <div className="flex items-center bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <button className="px-4 py-2.5 hover:bg-white/10 text-white font-medium text-sm flex items-center gap-2 border-r border-white/10 transition-colors">👍 12K</button>
                    <button className="px-4 py-2.5 hover:bg-white/10 text-white font-medium text-sm flex items-center gap-2 transition-colors">👎</button>
                  </div>
                  <button className="bg-white/5 border border-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full font-medium text-sm text-white flex items-center gap-2 transition-colors">
                    Dub <ChevronDown size={14} className="text-zinc-400" />
                  </button>
                  <button className="bg-white/5 border border-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full font-medium text-sm text-white flex items-center gap-2 transition-colors">
                    Server <ChevronDown size={14} className="text-zinc-400" />
                  </button>
                  <button className="bg-white/5 border border-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full font-medium text-sm text-white flex items-center gap-2 transition-colors">
                    <Share2 size={14} /> Share
                  </button>
                  <button className="bg-white/5 border border-white/5 hover:bg-white/10 w-10 h-10 flex items-center justify-center rounded-full text-white transition-colors" title="Report">
                    <Flag size={14} />
                  </button>
                </div>
              </div>

              {/* Stats & Synopsis */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                <div className="text-sm font-semibold text-zinc-400 mb-2">97K views • Apr 4, 2026 • #6 trending</div>
                {anime?.description ? (
                  <p className="text-sm text-zinc-300 leading-relaxed">{anime.description.replace(/<[^>]*>/g, '')}</p>
                ) : (
                  <p className="text-sm text-zinc-300 leading-relaxed">In a world where certain humans command mighty daemons, a young boy discovers his hidden power. The true battle begins now.</p>
                )}
              </div>
            </div>

            {/* ─── COMMENTS ─── */}
            <div className="px-4">
              <Comments
                comments={comments}
                setComments={setComments}
                currentUser={currentUsername}
                isLoggedIn={authService.isLoggedIn()}
                onSeek={handleSeek}
                onAdd={handleAddComment}
                onLikeComment={handleLikeComment}
                onDislikeComment={handleDislikeComment}
                onReplyComment={handleReplyComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                loading={commentsLoading}
              />
            </div>
          </div>

          {/* ─── RIGHT SIDEBAR ─── */}
          <aside className="w-[360px] flex-shrink-0 overflow-y-auto rounded-2xl mr-3 my-3 bg-[#111] border border-[#1e1e1e]">
            <div className="p-4">
              {/* ─── HEADER ─── */}
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-white truncate">
                    Up Next{episodeTitles?.[selectedEp] || episode?.title ? ` — ${episodeTitles?.[selectedEp] || episode?.title}` : ""}
                  </div>
                  <div className="text-xs text-[#888] mt-0.5 truncate">
                    Playing — Episode {selectedEp}{anime?.name ? ` — ${anime.name}` : ""}
                  </div>
                </div>
                <button className="flex items-center justify-center w-8 h-8 rounded-2xl hover:bg-white/5 transition-colors text-[#888] hover:text-white cursor-pointer border-none bg-transparent shrink-0 ml-2" onClick={() => setIsEpisodesExpanded(p => !p)} title={isEpisodesExpanded ? 'Collapse' : 'Expand'}>
                  <ChevronUp size={15} />
                </button>
              </div>

              {/* ─── EPISODES ─── */}
              <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${isEpisodesExpanded ? 'max-h-[70vh]' : 'max-h-0'}`}>
                {/* search */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-2.5 flex-1 bg-[#1a1a1a] rounded-2xl px-4 border border-[#2a2a2a] focus-within:border-[#6c63ff] ring-1 ring-transparent focus-within:ring-[#6c63ff]/20 transition-all" style={{ height: '40px' }}>
                    <Search size={14} className="text-[#888] shrink-0" />
                    <input className="flex-1 bg-transparent text-xs text-white outline-none placeholder-[#555] border-none py-0" type="text" placeholder="Search episodes..." value={epSearch} onChange={e => { setEpSearch(e.target.value); if (!e.target.value) setVisibleCount(50); }} />
                    {epSearch && <button className="text-[#888] hover:text-white cursor-pointer bg-transparent border-none p-0.5 shrink-0" onClick={() => { setEpSearch(""); setVisibleCount(50); }}><X size={12} /></button>}
                  </div>
                  <button className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-white/5 transition-colors text-[#888] hover:text-white cursor-pointer bg-transparent shrink-0" title="Refresh" onClick={() => setRetryCount(c => c + 1)}>
                    <RefreshCw size={13} />
                  </button>
                </div>

                {/* list */}
                <div className="flex flex-col gap-1.5 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader size={16} className="text-zinc-500 animate-spin" />
                    </div>
                  ) : filteredEpisodes.length === 0 ? (
                    <p className="text-xs text-[#555] text-center py-10">{epSearch ? "No matching episodes" : "No episodes"}</p>
                  ) : (
                    <>
                      {filteredEpisodes.slice(0, visibleCount).map((ep, i) => {
                        const realIdx = episodes.indexOf(ep);
                        const isActive = realIdx === epIndex;
                        const isWatched = watchedEpisodes.has(ep.episode) && !isActive;
                        return (
                          <button key={ep.id || realIdx} data-ep={realIdx}
                            className={`flex items-center w-full text-left cursor-pointer border-none p-0 transition-all duration-200 rounded-2xl overflow-hidden ${
                              isActive
                                ? 'bg-[#161622] ring-1 ring-[#6c63ff]/30 shadow-lg shadow-[#6c63ff]/5'
                                : 'bg-transparent hover:bg-white/[0.04]'
                            }`}
                            onClick={() => { setEpIndex(realIdx); setSelectedEp(episodes[realIdx]?.episode || (realIdx + 1)); }}
                          >
                            {/* left accent bar for active */}
                            {isActive && <div className="w-[4px] bg-[#6c63ff] shrink-0 self-stretch rounded-full" style={{ borderRadius: '0 4px 4px 0' }} />}
                            
                            {/* thumbnail */}
                            <div className={`relative shrink-0 ${isActive ? 'bg-[#1a1a2e]' : 'bg-[#1e1e1e]'}`} style={{ width: '120px', height: '90px' }}>
                              {ep.thumbnail || ep.image ? (
                                <img className="w-full h-full object-cover rounded-none" src={ep.thumbnail || ep.image} alt="" loading="lazy" style={{ opacity: isActive ? 0.55 : 1 }} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#555]" style={{ fontSize: '28px', fontWeight: 700 }}>
                                  {ep.episode}
                                </div>
                              )}
                              <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-[#ccc] text-[10px] font-medium px-2 py-0.5 rounded-lg backdrop-blur-sm">
                                Ep {ep.episode}
                              </div>
                            </div>

                            {/* info */}
                            <div className="flex-1 min-w-0" style={{ padding: '10px 14px' }}>
                              <div className={`text-sm font-medium leading-snug truncate ${isWatched ? 'text-[#888]' : 'text-white'}`}>
                                {episodeTitles?.[ep.episode] || ep.title || `Episode ${ep.episode}`}
                              </div>
                              <div className="text-[11px] text-[#666] mt-1.5 truncate">{anime?.name || "Anime"}</div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[11px] text-[#888]">Ep {ep.episode}</span>
                                {isWatched && <span className="text-[11px] text-[#4caf50] font-medium flex items-center gap-0.5 bg-[#4caf50]/10 px-2 py-0.5 rounded-full">✓ Watched</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {(hasMoreEps || filteredEpisodes.length > visibleCount) && (
                        <button className="w-full py-3.5 text-xs text-[#888] hover:text-white font-medium hover:bg-white/[0.04] transition-all cursor-pointer border-none bg-transparent rounded-2xl mt-0.5" onClick={handleLoadMore}>
                          Load More ({filteredEpisodes.length - visibleCount} remaining)
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* next airing */}
                {nextAiring && (
                  <div className="flex items-center gap-3 mt-4 px-4 py-3.5 rounded-2xl bg-[#0a1f12] ring-1 ring-[#2d5a3d]">
                    <Bell size={15} className="text-[#4caf50] shrink-0" />
                    <span className="text-xs text-[#4caf50]">Next ep airing in <strong className="text-[#4caf50] font-semibold">{nextAiring.text}</strong></span>
                  </div>
                )}
              </div>

              {/* ─── MORE LIKE THIS ─── */}
              {recommendations.length > 0 && (
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid #1e1e1e' }}>
                  <div className="text-[11px] font-semibold text-[#555] uppercase tracking-[2px] mb-4 px-1">More Like This</div>
                  <div className="flex flex-col gap-2.5">
                    {recommendations.slice(0, 4).map((rec, i) => (
                      <button key={rec.id || i}
                        className="flex items-center gap-3 w-full p-2.5 text-left transition-all hover:bg-white/[0.04] cursor-pointer border-none bg-transparent rounded-2xl"
                        onClick={() => navigate(`/anime/${rec.id}/info`)}
                      >
                        <div className="relative shrink-0 overflow-hidden rounded-xl bg-[#1e1e1e]" style={{ width: '72px', height: '54px' }}>
                          {rec.image ? (
                            <img className="w-full h-full object-cover" src={rec.image} alt="" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#555] text-xs font-bold">?</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white leading-snug line-clamp-2">{rec.name}</div>
                          <div className="text-[11px] text-[#666] mt-0.5 line-clamp-1">
                            {rec.genres?.slice(0, 2).join(" • ") || rec.format || "Anime"}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
