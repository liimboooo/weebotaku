import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader, Play, Star, Tv, Calendar, Clock, Monitor, Search, Film,
  X, SkipForward, FastForward
} from "lucide-react";
import { getAnimeById } from "../data/animeData";
import Hls from "hls.js";
import { findStreamingSource, getEpisodes, getStreamUrls, getEpisodePage, getDirectStream, getMiruroStream, getMiruroEpisodes } from "../services/animeApi";
import { fetchAnimeRecommendations } from "../services/anilistApi";
import { loadWatchHistory, addToWatchHistory } from "../services/storage";
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
  const [epSearch, setEpSearch] = useState("");
  const [language, setLanguage] = useState(() => {
    const s = loadSettings();
    if (s.defaultDubbed === "dubbed") return "dub";
    if (s.defaultDubbed === "subbed") return "sub";
    return localStorage.getItem("animewch_last_language") || "sub";
  });
  const [langKey, setLangKey] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
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
  const totalEps = anime?.episodes ?? 12;

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

      if (!timedOut) { clearTimeout(timer); setError("No episodes available for this anime."); setLoading(false); }
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
      if (settings.autoNext !== false && epIndex < episodes.length - 1) {
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
            setSelectedEp(episodes[epIndex + 1]?.episode || (epIndex + 2));
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
    if (!watchAnime?.anilistId) return;
    fetchAnimeRecommendations(watchAnime.anilistId).then(setRecommendations).catch(() => {});
  }, [watchAnime?.anilistId]);

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

  const switchServer = (idx) => {
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
    if (!anime?.anilistId) return new Set();
    const history = loadWatchHistory();
    return new Set(history.filter(h => h.animeId === anime.anilistId).map(h => h.episode));
  }, [anime?.anilistId, episodes]);

  const metadataItems = useMemo(() => {
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

  if (animeLoading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.08)", borderTopColor: "#a855f7", animation: "watch-spin 0.8s linear infinite" }} />
        <p style={{ color: "#5c5c6b", fontSize: 13 }}>Loading anime...</p>
      </div>
    );
  }

  if (!anime || animeError) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#a0a0ab", fontSize: 14 }}>{animeError || "Anime not found"}</p>
        <button onClick={() => navigate(-1)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.08)", color: "#c084fc", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Go back</button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#000", display: "flex" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.008) 0, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 80% 0%, rgba(139,92,246,0.08), transparent 50%), radial-gradient(circle at 20% 100%, rgba(139,92,246,0.03), transparent 40%)" }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", background: "#050508" }}>
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

          {/* ─── CENTER: PLAYER ─── */}
          <div className="watch-center-col">

            <div className="watch-player-stage">
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
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="watch-btn" onClick={() => { if (episodes.length === 0) setRetryCount(c => c + 1); else setStreamRetryCount(c => c + 1); }}>Retry</button>
                  </div>
                </div>
              )}
              {!loading && !error && streamUrl && !streamLoading && !iframeError && streamMode === "hls" && (
                <video ref={hlsVideoRef} key={`hls-${episode?.episode || 0}-${serverIndex}`} className="watch-frame" controls autoPlay playsInline style={{ background: '#000' }} />
              )}
              {!loading && !error && streamUrl && !streamLoading && !iframeError && streamMode === "iframe" && (
                <iframe ref={iframeRef} key={`${episode?.episode || 0}-${serverIndex}-${langKey}-${seekTo ?? 0}`} className="watch-frame" src={seekTo != null ? `${streamUrl}${streamUrl.includes("#") ? "&" : "#"}t=${seekTo}` : streamUrl} title={`Episode ${episode?.episode || ""}`} allow="autoplay; fullscreen; encrypted-media" allowFullScreen onError={handleIframeError} />
              )}
              {!loading && !error && iframeError && streamUrl && (
                <div className="watch-center">
                  <div className="watch-err-badge">!</div>
                  <p className="watch-err-text">Episode not available on this source.</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {serverIndex < langServers().length - 1 && <button className="watch-btn" onClick={tryNextServer}>Try Next Source</button>}
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
                <button className="skip-btn skip-intro" onClick={handleSkipIntro}>
                  <SkipForward size={14} /> Skip Intro
                </button>
              )}
              {streamMode === "hls" && showSkipOutro && (
                <button className="skip-btn skip-outro" onClick={handleSkipOutro}>
                  <SkipForward size={14} /> {epIndex < episodes.length - 1 ? "Next Episode" : "Skip Outro"}
                </button>
              )}

              {autoNextCountdown !== null && (
                <div className="auto-next-overlay">
                  <div className="auto-next-card">
                    <p className="auto-next-label">Next episode in</p>
                    <div className="auto-next-timer">{autoNextCountdown}</div>
                    <div className="auto-next-actions">
                      <button className="auto-next-play" onClick={() => { cancelAutoNext(); setEpIndex(i => i + 1); setSelectedEp(episodes[epIndex + 1]?.episode || (epIndex + 2)); }}>
                        <Play size={14} /> Play Now
                      </button>
                      <button className="auto-next-cancel" onClick={cancelAutoNext}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {streamMode === "hls" && !loading && !error && streamUrl && !streamLoading && (
                <button
                  className="speed-btn"
                  onClick={() => setShowShortcutsHelp(s => !s)}
                  title="Keyboard shortcuts (press ?)"
                  style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, padding: '6px 10px', fontWeight: 700 }}
                >
                  ?
                </button>
              )}

              {streamMode === "hls" && !loading && !error && streamUrl && !streamLoading && (
                <div className="speed-control">
                  <button className="speed-btn" onClick={() => setShowSpeedMenu(p => !p)}>
                    {playbackSpeed}x
                  </button>
                  {showSpeedMenu && (
                    <div className="speed-menu">
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                        <button key={s} className={`speed-option ${playbackSpeed === s ? "active" : ""}`} onClick={() => handleSpeedChange(s)}>
                          {s}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showShortcutsHelp && (
                <div
                  onClick={() => setShowShortcutsHelp(false)}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}
                >
                  <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(20,20,28,0.95)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 14, padding: '24px 28px', maxWidth: 480, width: '100%', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.02em' }}>Keyboard Shortcuts</h3>
                      <button onClick={() => setShowShortcutsHelp(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: 4 }}>✕</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: '0.82rem' }}>
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
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
                          <kbd style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 5, padding: '2px 7px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#c084fc' }}>{k}</kbd>
                          <span style={{ color: '#bbb' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {servers.length > 0 && (
              <div className="watch-lang-toggle">
                <button className={`watch-lang-btn ${language === 'sub' ? 'active' : ''}`} onClick={() => { setLanguage('sub'); try { localStorage.setItem('animewch_last_language', 'sub'); } catch {} }} disabled={!servers.some(s => s.type === 'sub')}>SUB</button>
                <button className={`watch-lang-btn ${language === 'dub' ? 'active' : ''}`} onClick={() => { setLanguage('dub'); try { localStorage.setItem('animewch_last_language', 'dub'); } catch {} }} disabled={!servers.some(s => s.type === 'dub')}>DUB</button>
              </div>
            )}

            <div className="watch-scroll-area">

              {/* ═══ COMMENTS ═══ */}
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

          {/* ─── RIGHT: EPISODES ─── */}
          <aside className="watch-right-col">
            <div className="watch-side-head">
              <Monitor size={13} />
              <span>Episodes</span>
              <span className="watch-side-count">{episodes.length}</span>
            </div>
            <div className="watch-search-wrap">
              <Search size={13} className="watch-search-icon" />
              <input className="watch-search-input" type="text" placeholder="Search episodes..." value={epSearch} onChange={e => { setEpSearch(e.target.value); if (!e.target.value) setVisibleCount(50); }} />
              {epSearch && <button className="watch-search-clear" onClick={() => { setEpSearch(""); setVisibleCount(50); }}><X size={12} /></button>}
            </div>
            <div className="watch-side-scroll" ref={scrollRef} onScroll={handleSideScroll}>
              {loading ? (
                <div className="watch-center" style={{ padding: 40 }}><Loader size={18} className="watch-spin" /></div>
              ) : filteredEpisodes.length === 0 ? (
                <div className="watch-center" style={{ padding: 40 }}><p className="watch-muted">{epSearch ? "No matching episodes" : "No episodes"}</p></div>
              ) : (
                <>
                  {filteredEpisodes.slice(0, visibleCount).map((ep, i) => {
                    const realIdx = episodes.indexOf(ep);
                    const isWatched = watchedEpisodes.has(ep.episode) && realIdx !== epIndex;
                    return (
                      <button key={ep.id || realIdx} data-ep={realIdx} className={`watch-ep-item ${realIdx === epIndex ? "active" : ""}`} onClick={() => { setEpIndex(realIdx); setSelectedEp(episodes[realIdx]?.episode || (realIdx + 1)); }} style={isWatched ? { opacity: 0.55 } : undefined}>
                        <div className="watch-ep-info">
                          <span className="watch-ep-name">
                            Episode {ep.episode}
                            {isWatched && <span style={{ color: '#a78bfa', marginLeft: 6, fontSize: '0.7rem' }} title="Watched">✓</span>}
                          </span>
                          {ep.title && <span className="watch-ep-title">{ep.title}</span>}
                          <span className="watch-ep-date">{ep.airDate ? new Date(ep.airDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) : ep.aired ? "Aired" : "Upcoming"}</span>
                        </div>
                        {realIdx === epIndex && <div className="watch-ep-active-dot" />}
                      </button>
                    );
                  })}
                  {(hasMoreEps || filteredEpisodes.length > visibleCount) && (
                    <button className="watch-ep-load-more" onClick={handleLoadMore}>
                      Load More ({filteredEpisodes.length - visibleCount} remaining)
                    </button>
                  )}
                </>
              )}
            </div>

            {recommendations.length > 0 && (
              <div className="watch-side-rec">
                <div className="watch-side-head" style={{ paddingTop: 8 }}>
                  <Star size={13} />
                  <span>Recommended Anime</span>
                </div>
                {recommendations.slice(0, 5).map((rec, i) => (
                  <button key={rec.id || i} className="watch-rec-item" onClick={() => navigate(`/anime/${rec.id}/info`)}>
                    <div className="watch-rec-thumb">
                      <img src={rec.image} alt="" loading="lazy" decoding="async" />
                    </div>
                    <div className="watch-rec-info">
                      <span className="watch-rec-name">{rec.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}
