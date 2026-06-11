import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader, Play, Star, Tv, Calendar, Clock, Monitor, Film,
  X, RefreshCw, AlertTriangle, Bell, ChevronDown, ChevronUp,
  Share2, Bookmark, Flag, LayoutGrid, List, ArrowUp, ArrowDown, MessageCircle,
  ThumbsUp, ThumbsDown
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getAnimeById } from "../data/animeData";
import Hls from "hls.js";
import { findStreamingSource, getStreamUrls, getEpisodePage, getDirectStream, getMiruroStream, getMiruroEpisodes, getConsumetStream } from "../services/animeApi";
import { loadWatchHistory, addToWatchHistory, addToWatchlist, removeFromWatchlist, isInWatchlist } from "../services/storage";
import { fetchAnimeRecommendations } from "../services/anilistApi";
import commentService from "../services/commentService";
import authService from "../services/authService";
import { getSocket, joinAnimeRoom, leaveAnimeRoom } from "../services/socket";
import reportService from "../services/reportService";
import reactionService from "../services/reactionService";
import settingsService from "../services/settingsService";
import Comments from "../components/Comments";
import useDocumentTitle from "../hooks/useDocumentTitle";
import VideoPlayer from "../components/VideoPlayer";
import "../components/TopTrending.css";

const SETTINGS_KEY = "otaku_settings";
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
  const [isEpisodesExpanded, setIsEpisodesExpanded] = useState(() => window.innerWidth >= 640);
  const [bookmarked, setBookmarked] = useState(() => id ? isInWatchlist(id) : false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [sidebarView, setSidebarView] = useState('thumbnail');
  const [brokenThumbs, setBrokenThumbs] = useState(new Set());
  const [sortOrder, setSortOrder] = useState('asc');
  const [recommendations, setRecommendations] = useState([]);
  const [alertBannerVisible, setAlertBannerVisible] = useState(true);
  const [epSearch, setEpSearch] = useState("");
  const [language, setLanguage] = useState(() => {
    const s = loadSettings();
    if (s.defaultDubbed === "dubbed") return "dub";
    if (s.defaultDubbed === "subbed") return "sub";
    return localStorage.getItem("otaku_last_language") || "sub";
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
  const [autoNext, setAutoNext] = useState(() => loadSettings().autoNext !== false);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => loadSettings().playbackSpeed || 1);
  const [hlsLevels, setHlsLevels] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showMobileComments, setShowMobileComments] = useState(false);
  const [showMobileSource, setShowMobileSource] = useState(false);
  const [showServerSelector, setShowServerSelector] = useState(false);

  const [liked, setLiked] = useState(null);
  const [likesCount, setLikesCount] = useState(null);
  const [dislikesCount, setDislikesCount] = useState(null);
  const [reacting, setReacting] = useState(false);
  const [commentsError, setCommentsError] = useState(false);
  const [reportMsg, setReportMsg] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('bug');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoveringTimeline, setHoveringTimeline] = useState(false);
  const [timelineHoverTime, setTimelineHoverTime] = useState(0);
  const hlsVideoRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const autoNextTimerRef = useRef(null);
  const sidebarRef = useRef(null);
  const epTimerRef = useRef(null);

  const handleSeek = useCallback((seconds) => {
    setSeekTo(seconds);
  }, []);

  function formatTime(s) {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const togglePlay = () => {
    const video = hlsVideoRef.current;
    if (!video) return;
    video.paused ? video.play().catch(() => {}) : video.pause();
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

  const togglePiP = async () => {
    const video = hlsVideoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
    } catch (e) { console.error('[Otaku] PiP failed:', e); }
  };

  const toggleFullscreen = () => {
    const stage = playerStageRef.current;
    if (!stage) return;
    document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen();
  };

  const openReport = useCallback(() => {
    setReportCategory('bug');
    setReportDetails('');
    setReportDone(false);
    setReportMsg(null);
    setShowReportModal(true);
  }, []);

  const submitReport = useCallback(async () => {
    if (!reportDetails.trim() || reportSubmitting) return;
    setReportSubmitting(true);
    setReportMsg(null);
    try {
      // Backend requires { category, details }; bundle context into details.
      await reportService.submit({
        category: reportCategory,
        details: `${apiAnime?.name || `Anime ${id}`} — Ep ${selectedEp || 1}\n${reportDetails.trim()}\n${window.location.href}`,
      });
      setReportDone(true);
      setTimeout(() => { setShowReportModal(false); setReportDone(false); }, 1600);
    } catch {
      setReportMsg('Failed to submit. Please try again.');
    }
    setReportSubmitting(false);
  }, [reportCategory, reportDetails, reportSubmitting, apiAnime, id, selectedEp]);

  const scrollRef = useRef(null);
  const iframeRef = useRef(null);
  const playerStageRef = useRef(null);
  const failedServers = useRef(new Set());
  const serversRef = useRef(servers);
  const epIndexRef = useRef(epIndex);
  const episodesRef = useRef(episodes);
  const autoNextRef = useRef(autoNext);
  const lastHistorySaveRef = useRef(false);
  const allEpsRef = useRef([]);
  useEffect(() => { epIndexRef.current = epIndex; }, [epIndex]);
  useEffect(() => { episodesRef.current = episodes; }, [episodes]);
  useEffect(() => { serversRef.current = servers; }, [servers]);
  useEffect(() => { autoNextRef.current = autoNext; }, [autoNext]);

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
  const currentAvatar = currentUser?.avatar || localStorage.getItem('avatar') || '';

  const getCommentUser = (u) => {
    if (!u) return { username: 'Unknown', avatar: '', role: 'user' };
    if (typeof u === 'object') return { username: u.username || 'Unknown', avatar: u.avatar || '', role: u.role || 'user' };
    return { username: 'Unknown', avatar: '', role: 'user' };
  };

  const mapComment = useCallback((c) => {
    const u = getCommentUser(c.user);
    return {
    id: c._id,
    user: u.username,
    avatar: u.avatar,
    role: u.role,
    text: c.content,
    time: new Date(c.createdAt).getTime().toString(),
    likes: c.likes?.length || 0,
    dislikes: c.dislikes?.length || 0,
    likedByMe: c.likedByMe || false,
    dislikedByMe: c.dislikedByMe || false,
    replies: (c.replies || []).map(r => {
      const ru = getCommentUser(r.user);
      return {
      id: r._id,
      user: ru.username,
      avatar: ru.avatar,
      role: ru.role,
      text: r.content,
      time: new Date(r.createdAt).getTime().toString(),
      likes: r.likes?.length || 0,
      dislikes: r.dislikes?.length || 0,
      likedByMe: r.likedByMe || false,
      dislikedByMe: r.dislikedByMe || false,
      replies: [],
    }; }),
    pinned: c.pinned || false,
    hasSpoiler: c.isSpoiler || false,
  }; }, []);

  useEffect(() => {
    setCommentsLoading(true);
    setCommentsError(false);
    commentService.getComments(id, { episode: selectedEp })
      .then(res => {
        if (res.success) setComments(res.data.map(mapComment));
        else setCommentsError(true);
      })
      .catch(() => { setCommentsError(true); })
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

  const handleAddComment = useCallback(async (text, isSpoiler) => {
    const res = await commentService.createComment(parseInt(id), text, { episode: selectedEp, isSpoiler });
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

  const handleEditComment = useCallback(async (commentId, newText, isSpoiler) => {
    const res = await commentService.editComment(commentId, newText, isSpoiler);
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
    if (!id) return;
    let cancelled = false;
    reactionService.get(id).then(res => {
      if (cancelled || !res?.success) return;
      setLikesCount(res.data.likes);
      setDislikesCount(res.data.dislikes);
      setLiked(res.data.liked ? true : res.data.disliked ? false : null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const handleReact = useCallback(async (type) => {
    if (reacting) return;
    // Logged-out users get an optimistic local toggle only (POST requires auth).
    if (!authService.isLoggedIn()) {
      if (type === 'like') setLiked(l => l === true ? null : true);
      else setLiked(l => l === false ? null : false);
      return;
    }
    setReacting(true);
    try {
      const res = type === 'like' ? await reactionService.like(id) : await reactionService.dislike(id);
      if (res?.success) {
        setLikesCount(res.data.likes);
        setDislikesCount(res.data.dislikes);
        setLiked(res.data.liked ? true : res.data.disliked ? false : null);
      }
    } catch (e) { console.error('[Otaku] Reaction failed:', e); }
    setReacting(false);
  }, [id, reacting]);
  useEffect(() => {
    const epFromUrl = searchParams.get("ep");
    if (epFromUrl) {
      const epNum = parseInt(epFromUrl, 10);
      if (!isNaN(epNum) && epNum > 0) { setSelectedEp(epNum); return; }
    }
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
        } else if (attempt < 1) {
          await new Promise(r => setTimeout(r, 800));
          if (!cancelled) load(attempt + 1);
        } else {
          setAnimeLoading(false);
          setAnimeError("Could not load this anime.");
        }
      } catch {
        if (cancelled) return;
        if (attempt < 1) {
          await new Promise(r => setTimeout(r, 800));
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
    fetchAnimeRecommendations(apiAnime.id).then(r => { if (!cancelled) setRecommendations(r); }).catch(err => console.error('[Otaku] Failed to load recommendations:', err));
    if (apiAnime.episodes > 50) setSortOrder('desc');
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
    if (!sourceLookupDone || !watchAnime) return;
    let timedOut = false;
    let cancelled = false;
    const hasEpsRef = { current: false };
    const timer = setTimeout(() => {
      timedOut = true;
      setError(hasEpsRef.current ? "Stream not available for this episode." : "Request timed out. Try again.");
      setLoading(false);
    }, 12000);
    epTimerRef.current = timer;

    const epCount = anime?.episodes || 0;
    if (epCount > 0) {
      const placeholders = Array.from({ length: epCount }, (_, i) => ({
        episode: i + 1, title: `Episode ${i + 1}`, url: String(i + 1), thumbnail: anime?.img || '',
      }));
      allEpsRef.current = placeholders;
      const idx = Math.min(Math.max(0, selectedEp - 1), epCount - 1);
      const initialCount = Math.max(60, idx + 1);
      setEpisodes(placeholders.slice(0, initialCount));
      setVisibleCount(Math.max(50, idx + 1));
      hasEpsRef.current = true;
      setEpIndex(idx);
      setLoading(false);
      if (epCount > 100) return;
    } else {
      const mockEps = Array.from({ length: 12 }, (_, i) => ({
        episode: i + 1, title: `Episode ${i + 1}`, url: String(i + 1), thumbnail: anime?.img || '', airDate: null,
      }));
      allEpsRef.current = mockEps;
      setEpisodes(mockEps);
      hasEpsRef.current = true;
      setEpIndex(Math.min(Math.max(0, (selectedEp || 1) - 1), mockEps.length - 1));
      setLoading(false);
    }

    (async () => {
      try {
        const miruroEps = await getMiruroEpisodes(watchAnime.anilistId);
        if (cancelled) return;
        if (miruroEps?.providers) {
          const provNames = Object.keys(miruroEps.providers);
          for (const pname of provNames) {
            const epList = miruroEps.providers[pname]?.sub || miruroEps.providers[pname]?.dub || [];
            if (epList.length > 0) {
              clearTimeout(timer);
              const allEps = epList.map(ep => ({ episode: ep.number, title: ep.title || `Episode ${ep.number}`, url: String(ep.number), thumbnail: ep.image || ep.thumbnail || anime?.img || '', description: ep.description || ep.overview || ep.summary || '' }));
              allEpsRef.current = allEps;
              const idx = Math.min(Math.max(0, selectedEp - 1), allEps.length - 1);
              const initialCount = Math.max(60, idx + 1);
              setEpisodes(allEps.slice(0, initialCount));
              setVisibleCount(Math.max(50, idx + 1));
              setEpIndex(idx);
              timedOut = false;
              setError("");
              return;
            }
          }
        }
      } catch (e) { console.error('[Otaku] Failed to get Miruro episodes:', e); }
    })();

    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchAnime, sourceLookupDone, retryCount]);

  const loadMoreEpisodes = async () => {
    const nextPage = epPage + 1;
    const result = await getEpisodePage(
      watchAnime.title || watchAnime.slug, watchAnime.tagSlug,
      watchAnime.source, watchAnime.sourceBase, watchAnime.anilistId, nextPage
    );
    if (result?.episodes?.length > 0) {
      setEpisodes(prev => [...prev, ...result.episodes]);
      setEpPage(nextPage);
      setHasMoreEps(result.hasMore);
    }
    if (!result?.hasMore) setAllEpsLoaded(true);
  };

  useEffect(() => {
    if (!sidebarRef.current || epIndex < 0) return;
    const el = sidebarRef.current.querySelector(`[data-ep-index="${epIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [epIndex, sortOrder]);

  useEffect(() => {
    if (streamUrl && epTimerRef.current) {
      clearTimeout(epTimerRef.current);
      epTimerRef.current = null;
      setError("");
    }
  }, [streamUrl]);

  const episode = episodes[epIndex] || null;

  useEffect(() => {
    if (!episode || !watchAnime) return;
    let cancelled = false;
    addToWatchHistory(parseInt(id), episode.episode, anime?.name, anime?.img, 0, anime?.episodes);
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
          // Fetch the preferred language FIRST and start playback as soon as it's
          // ready, instead of waiting for both sub+dub. Load the other in background.
          const primaryCat = language === 'dub' ? 'dub' : 'sub';
          const otherCat = primaryCat === 'sub' ? 'dub' : 'sub';
          const labelFor = (cat) => (cat === 'dub' ? 'Dub (HLS)' : 'Sub (HLS)');

          const primary = await getMiruroStream(aniId, epNum, primaryCat).catch(() => null);
          if (cancelled) return;
          if (primary?.intro || primary?.outro) {
            setIntroOutro({ intro: primary.intro || null, outro: primary.outro || null });
          }

          if (primary?.stream?.url) {
            setStreamMode('hls');
            setServers([{ label: labelFor(primaryCat), url: primary.stream.url, type: primaryCat }]);
            setStreamUrl(primary.stream.url);
            setStreamLoading(false);
            // Background: add the other language to the server list without blocking
            getMiruroStream(aniId, epNum, otherCat).then(other => {
              if (cancelled || !other?.stream?.url || other.stream.url === primary.stream.url) return;
              if (other.intro || other.outro) setIntroOutro(prev => ({ intro: prev.intro || other.intro || null, outro: prev.outro || other.outro || null }));
              setServers(prev => prev.some(s => s.type === otherCat) ? prev : [...prev, { label: labelFor(otherCat), url: other.stream.url, type: otherCat }]);
            }).catch(() => {});
            return;
          }

          // Preferred missing — try the other language before deeper fallbacks
          const other = await getMiruroStream(aniId, epNum, otherCat).catch(() => null);
          if (cancelled) return;
          if (other?.intro || other?.outro) {
            setIntroOutro(prev => ({ intro: prev.intro || other.intro || null, outro: prev.outro || other.outro || null }));
          }
          if (other?.stream?.url) {
            hlsServers.push({ label: labelFor(otherCat), url: other.stream.url, type: otherCat });
          }

          if (hlsServers.length === 0) {
            try {
              const consumet = await getConsumetStream(aniId, epNum, watchAnime.title || anime?.name || '', 'sub');
              if (cancelled) return;
              if (consumet?.stream?.url) {
                hlsServers.push({ label: 'Sub (HLS)', url: consumet.stream.url, type: 'sub' });
              }
            } catch (e) { console.error('[Otaku] Failed to get Consumet stream:', e); }
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
            } catch (e) { console.error('[Otaku] Failed to get stream URLs:', e); }
          }
        }

        if (cancelled) return;
        const hlsServersFiltered = hlsServers.filter(s => !failedServers.current.has(s.url));
        if (hlsServersFiltered.length > 0) {
          setStreamMode("hls");
          setServers(hlsServers);
          const preferred = hlsServersFiltered.find(s => s.type === language) || hlsServersFiltered[0];
          setStreamUrl(preferred.url);
          setStreamLoading(false);
          return;
        }

        setStreamMode("iframe");
        const urls = await getStreamUrls(episode.url, watchAnime.source, watchAnime.anilistId, parseInt(id), watchAnime.slug);
        if (cancelled) return;
        if (urls.length > 0) { setServers(urls); }
        else setError("No video servers found.");
      } catch (e) { console.error('[Otaku] Stream load error:', e); if (!cancelled) setError("Failed to load stream."); }
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
      } else {
        setStreamRetryCount(c => c + 1);
      }
    }
  }, [servers, language, streamMode]);

  const savedPositionRef = useRef(0);
  const [resumeAt, setResumeAt] = useState(null);
  const resumeTimerRef = useRef(null);

  const showResumeToast = (pos) => {
    setResumeAt(pos);
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setResumeAt(null), 7000);
  };
  const handleStartOver = () => {
    const video = hlsVideoRef.current;
    if (video) { video.currentTime = 0; video.play?.().catch(() => {}); }
    setResumeAt(null);
    clearTimeout(resumeTimerRef.current);
  };

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
        setHlsLevels(data.levels.map((l, i) => ({
          index: i, height: l.height, width: l.width, bitrate: l.bitrate,
          name: l.name || (l.height ? `${l.height}p` : `Quality ${i}`),
        })));
        if (currentQuality >= 0 && currentQuality < data.levels.length) {
          hls.currentLevel = currentQuality;
        } else if (data.levels.length > 1) {
          hls.currentLevel = data.levels.length - 1;
          setCurrentQuality(data.levels.length - 1);
        }
        if (prevPos > 2) { video.currentTime = prevPos; showResumeToast(prevPos); }
        video.play().catch(err => console.error('[Otaku] HLS video play failed:', err));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        hls.destroy();
        hlsInstanceRef.current = null;
        const currentUrl = streamUrl;
        const allServers = serversRef.current;
        const nextSrv = allServers.find(s => s.url !== currentUrl && !failedServers.current.has(s.url));
        if (nextSrv) {
          failedServers.current.add(currentUrl);
          setStreamUrl(nextSrv.url);
          const newIdx = allServers.findIndex(s => s.url === nextSrv.url);
          if (newIdx !== -1) setServerIndex(newIdx);
        } else {
          setStreamRetryCount(c => c + 1);
        }
      });
      hlsInstanceRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        if (prevPos > 2) { video.currentTime = prevPos; showResumeToast(prevPos); }
        video.play().catch(err => console.error('[Otaku] Native video play failed:', err));
      }, { once: true });
      video.addEventListener("error", () => {
        const currentUrl = streamUrl;
        const allServers = serversRef.current;
        const nextSrv = allServers.find(s => s.url !== currentUrl && !failedServers.current.has(s.url));
        if (nextSrv) {
          failedServers.current.add(currentUrl);
          setStreamUrl(nextSrv.url);
          const newIdx = allServers.findIndex(s => s.url === nextSrv.url);
          if (newIdx !== -1) setServerIndex(newIdx);
        } else {
          setStreamRetryCount(c => c + 1);
        }
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

      if (dur && t > 5 && t % 15 < 1 && !lastHistorySaveRef.current) {
        lastHistorySaveRef.current = true;
        setTimeout(() => { lastHistorySaveRef.current = false; }, 5000);
        addToWatchHistory(parseInt(id), episode.episode, anime?.name, anime?.img, t, anime?.episodes);
      }
    };

    const onEnded = () => {
      setPlaying(false);
      addToWatchHistory(parseInt(id), episode.episode, anime?.name, anime?.img, video.duration || 0, anime?.episodes);
      const currentEpIdx = epIndexRef.current;
      const currentEps = episodesRef.current;
      if (autoNextRef.current && currentEpIdx < currentEps.length - 1) {
        setEpIndex(i => i + 1);
        setSelectedEp(currentEps[currentEpIdx + 1]?.episode || (currentEpIdx + 2));
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
      try { localStorage.setItem('otaku_volume', String(video.volume)); localStorage.setItem('otaku_muted', String(video.muted)); } catch (e) { /* noop */ }
    };
    const onLoadedMeta = () => {
      setDuration(video.duration);
      // Restore saved volume/mute across sessions
      try {
        const sv = localStorage.getItem('otaku_volume');
        const sm = localStorage.getItem('otaku_muted');
        if (sv != null && !Number.isNaN(parseFloat(sv))) video.volume = Math.min(1, Math.max(0, parseFloat(sv)));
        if (sm != null) video.muted = sm === 'true';
      } catch (e) { /* noop */ }
      setVolume(video.volume);
      setMuted(video.muted);
    };
    // Buffering / seeking feedback
    const onWaiting = () => setBuffering(true);
    const onStalled = () => setBuffering(true);
    const onSeeking = () => setBuffering(true);
    const onPlayingEv = () => setBuffering(false);
    const onSeeked = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);
    const onProgress = () => {
      try { if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1)); } catch (e) { /* noop */ }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("loadedmetadata", onLoadedMeta);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("playing", onPlayingEv);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("progress", onProgress);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("loadedmetadata", onLoadedMeta);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("playing", onPlayingEv);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("progress", onProgress);
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
    if (autoNext && epIndex < episodes.length - 1) {
      setEpIndex(i => i + 1);
      setSelectedEp(episodes[epIndex + 1]?.episode || (epIndex + 2));
    } else {
      const video = hlsVideoRef.current;
      if (video && introOutro.outro) {
        video.currentTime = introOutro.outro.end;
        setShowSkipOutro(false);
      }
    }
  }, [autoNext, introOutro.outro, epIndex, episodes]);

  const cancelAutoNext = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setAutoNextCountdown(null);
  }, []);

  const handleToggleLanguage = useCallback(() => {
    setLanguage(l => {
      const next = l === 'sub' ? 'dub' : 'sub';
      try { localStorage.setItem('otaku_last_language', next); } catch (e) { console.error('[Otaku] Failed to save language pref:', e); }
      return next;
    });
  }, []);

  const goToNextEpisode = useCallback(() => {
    cancelAutoNext();
    setEpIndex(i => i + 1);
    setSelectedEp(episodes[epIndex + 1]?.episode || (epIndex + 2));
  }, [cancelAutoNext, epIndex, episodes]);

  const handleSpeedChange = useCallback((speed) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    const video = hlsVideoRef.current;
    if (video) video.playbackRate = speed;
    try {
      const s = JSON.parse(localStorage.getItem("otaku_settings") || "{}");
      s.playbackSpeed = speed;
      localStorage.setItem("otaku_settings", JSON.stringify(s));
      settingsService.save(s);
    } catch (e) { console.error('[Otaku] Failed to save settings:', e); }
  }, []);

  const handleToggleAutoNext = useCallback(() => {
    setAutoNext(p => {
      const next = !p;
      try {
        const s = JSON.parse(localStorage.getItem("otaku_settings") || "{}");
        s.autoNext = next;
        localStorage.setItem("otaku_settings", JSON.stringify(s));
        settingsService.save(s);
      } catch {}
      return next;
    });
  }, []);

  const handleQualityChange = useCallback((levelIndex) => {
    setCurrentQuality(levelIndex);
    const hls = hlsInstanceRef.current;
    if (hls) hls.currentLevel = levelIndex;
  }, []);

  const qualityRef = useRef(currentQuality);
  useEffect(() => { qualityRef.current = currentQuality; }, [currentQuality]);

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
        case 'k': e.preventDefault(); video.paused ? video.play().catch(() => {}) : video.pause(); break;
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
    const stage = playerStageRef.current;
    if (!stage) return;
    let timer = null;
    const scheduleHide = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setShowControls(false);
        stage.style.cursor = "none";
      }, 3000);
    };
    const show = () => {
      setShowControls(true);
      stage.style.cursor = "default";
      scheduleHide();
    };
    const onLeave = () => {
      clearTimeout(timer);
      setShowControls(false); // hide on leave
      stage.style.cursor = "default";
    };
    stage.addEventListener("mousemove", show);
    stage.addEventListener("mouseenter", show);
    stage.addEventListener("mouseleave", onLeave);
    stage.addEventListener("touchstart", show, { passive: true });
    scheduleHide(); // hide a few seconds after load even without mouse movement
    return () => {
      stage.removeEventListener("mousemove", show);
      stage.removeEventListener("mouseenter", show);
      stage.removeEventListener("mouseleave", onLeave);
      stage.removeEventListener("touchstart", show);
      clearTimeout(timer);
      stage.style.cursor = "default";
    };
  }, []);

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
    const nextVisible = visibleCount + 50;
    if (nextVisible > episodes.length && allEpsRef.current.length > episodes.length) {
      setEpisodes(allEpsRef.current.slice(0, nextVisible));
    }
    setVisibleCount(nextVisible);
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

  const handleSelectServer = useCallback((srv) => {
    const ls = servers.filter(s => s.type === srv.type);
    const idx = ls.findIndex(s => s.url === srv.url);
    if (idx !== -1) {
      setLanguage(srv.type);
      setServerIndex(idx);
      setIframeError(false);
      failedServers.current = new Set();
      setStreamUrl(streamMode === "hls" ? srv.url : toStreamUrl(srv));
      try { localStorage.setItem('otaku_last_language', srv.type); } catch {}
    }
  }, [servers, streamMode]);

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

  const sortedEpisodes = useMemo(() => {
    const list = [...filteredEpisodes];
    if (sortOrder === 'desc') list.reverse();
    return list;
  }, [filteredEpisodes, sortOrder]);

  const watchedEpisodes = useMemo(() => {
    if (!anime?.id) return new Set();
    const history = loadWatchHistory();
    return new Set(history.filter(h => h.animeId === anime.id).map(h => h.episode));
  }, [anime?.id, episodes]);

  const [episodeTitles, setEpisodeTitles] = useState(null);

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
      <div className="w-full min-h-screen bg-[#0a0a0a] overflow-x-hidden">
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
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
            {/* Center column skeleton */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Player skeleton */}
              <div className="relative mt-3 sm:mt-8 mb-3 sm:mb-5 lg:ml-[40px] lg:mr-0 lg:w-[calc(100%-40px)] w-full mx-0 sm:rounded-3xl rounded-xl bg-[#111115] animate-pulse" style={{ aspectRatio: '16/9', maxHeight: '65vh' }} />
              {/* Content area skeleton */}
              <div className="w-full lg:ml-[40px] lg:mr-0 lg:w-[calc(100%-40px)] px-3 sm:px-4 py-4 flex flex-col gap-4">
                <div className="h-7 sm:h-9 w-3/4 bg-[#14151a] animate-pulse rounded-lg" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#14151a] animate-pulse shrink-0" />
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-32 bg-[#14151a] animate-pulse rounded" />
                      <div className="h-3 w-20 bg-[#14151a] animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-24 bg-[#14151a] animate-pulse rounded-full" />
                    <div className="h-8 w-20 bg-[#14151a] animate-pulse rounded-full" />
                    <div className="h-8 w-20 bg-[#14151a] animate-pulse rounded-full hidden sm:block" />
                  </div>
                </div>
              </div>
            </div>
            {/* Sidebar skeleton */}
            <div className="w-full lg:w-[380px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 mt-4 lg:mt-8">
              <div className="p-4 sm:p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-[#14151a] animate-pulse rounded" />
                    <div className="h-5 w-24 bg-[#14151a] animate-pulse rounded" />
                  </div>
                  <div className="h-6 w-6 bg-[#14151a] animate-pulse rounded" />
                </div>
                <div className="h-8 w-full bg-[#14151a] animate-pulse rounded-lg" />
                <div className="flex flex-col gap-2">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex gap-3 p-2 bg-[#111115] animate-pulse rounded-xl">
                      <div className="w-24 aspect-video bg-[#14151a] rounded-lg" />
                      <div className="flex-1 flex flex-col gap-2 justify-center">
                        <div className="h-3 w-full bg-[#14151a] rounded" />
                        <div className="h-3 w-2/3 bg-[#14151a] rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!anime || animeError) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#ffffff", fontSize: 14 }}>{animeError || "Anime not found"}</p>
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg border border-white/20 bg-white/10 text-white cursor-pointer text-xs sm:text-sm font-bold hover:bg-white/20 transition-colors">Go back</button>
          <button onClick={() => { setAnimeError(""); setAnimeLoading(true); getAnimeById(id).then(a => { if (a) { setApiAnime(a); setAnimeLoading(false); } else { setAnimeLoading(false); setAnimeError("Could not load this anime."); } }).catch(() => { setAnimeLoading(false); setAnimeError("Failed to load anime details."); }); }} className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg border border-white/20 bg-white/10 text-white cursor-pointer text-xs sm:text-sm font-bold hover:bg-white/20 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a] flex overflow-x-hidden">
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
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">

          {/* --- CENTER COLUMN --- */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* --- VIDEO PLAYER --- */}
            <div ref={playerStageRef} className="ad-player-container relative z-10 bg-zinc-900 overflow-hidden mt-3 sm:mt-6 mb-2 sm:mb-3 lg:ml-[40px] lg:mr-0 lg:w-[calc(100%-40px)] w-full mx-0 sm:rounded-3xl rounded-xl shadow-2xl" style={{ aspectRatio: '16/9', maxHeight: '65vh' }}>
              {/* loading */}
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <p className="text-sm text-zinc-500">Loading episodes...</p>
                </div>
              )}
              {/* error */}
              {!loading && error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center text-white text-lg sm:text-xl font-bold">!</div>
                  <p className="text-[11px] sm:text-sm text-zinc-400 text-center">{error}</p>
                  {(retryCount + streamRetryCount) < 3 ? (
                    <button className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white/10 text-white text-[11px] sm:text-sm font-medium hover:bg-white/20 transition-colors" onClick={() => { if (episodes.length === 0) setRetryCount(c => c + 1); else setStreamRetryCount(c => c + 1); }}>
                      Retry
                    </button>
                  ) : (
                    <p className="text-xs text-zinc-500">No more sources available</p>
                  )}
                </div>
              )}
              {/* hls video */}
              {!loading && !error && streamUrl && !streamLoading && !iframeError && streamMode === "hls" && (
                <video ref={hlsVideoRef} key={`hls-${episode?.episode || 0}-${serverIndex}`} className="w-full h-full object-contain" autoPlay playsInline style={{ background: '#000' }} />
              )}
              {/* iframe */}
              {!loading && !error && streamUrl && !streamLoading && !iframeError && streamMode === "iframe" && (
                <iframe ref={iframeRef} key={`${episode?.episode || 0}-${serverIndex}-${langKey}-${seekTo ?? 0}`} className="w-full h-full" src={seekTo != null ? `${streamUrl}${streamUrl.includes("#") ? "&" : "#"}t=${seekTo}` : streamUrl} title={`Episode ${episode?.episode || ""}`} allow="autoplay; fullscreen; encrypted-media" allowFullScreen onError={handleIframeError} />
              )}
              {/* iframe error */}
              {!loading && !error && iframeError && streamUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center text-white text-lg sm:text-xl font-bold">!</div>
                  <p className="text-[11px] sm:text-sm text-zinc-400">Episode not available on this source.</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {serverIndex < langServers().length - 1 && <button className="px-4 py-1.5 max-[480px]:px-3 max-[480px]:py-1 max-[480px]:text-xs sm:px-5 sm:py-2 sm:text-sm rounded-full bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors" onClick={tryNextServer}>Try Next Source</button>}
                      {epIndex < episodes.length - 1 && <button className="px-4 py-1.5 max-[480px]:px-3 max-[480px]:py-1 max-[480px]:text-xs sm:px-5 sm:py-2 sm:text-sm rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors" onClick={() => { setIframeError(false); failedServers.current = new Set(); setEpIndex(i => i + 1); }}>Skip to Next Episode</button>}
                      <button className="px-4 py-1.5 max-[480px]:px-3 max-[480px]:py-1 max-[480px]:text-xs sm:px-5 sm:py-2 sm:text-sm rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors" onClick={() => { setIframeError(false); failedServers.current = new Set(); setStreamRetryCount(c => c + 1); }}>Retry</button>
                    </div>
                </div>
              )}
              {/* stream loading */}
              {!loading && !error && streamLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <p className="text-xs sm:text-sm text-zinc-500">Loading stream...</p>
                </div>
              )}
              {/* preparing */}
              {!loading && !error && !streamLoading && !streamUrl && episode && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xs sm:text-sm text-zinc-500">Preparing stream...</p>
                </div>
              )}

              {streamUrl && !loading && !error && !streamLoading && (
              <VideoPlayer
                streamMode={streamMode}
                playing={playing}
                currentTime={currentTime}
                duration={duration}
                buffering={buffering}
                buffered={buffered}
                volume={volume}
                muted={muted}
                showControls={showControls}
                episode={episode}
                anime={anime}
                showSkipIntro={showSkipIntro}
                showSkipOutro={showSkipOutro}
                playbackSpeed={playbackSpeed}
                showSpeedMenu={showSpeedMenu}
                hoveringTimeline={hoveringTimeline}
                timelineHoverTime={timelineHoverTime}
                autoNextCountdown={autoNextCountdown}
                showShortcutsHelp={showShortcutsHelp}
                togglePlay={togglePlay}
                skipBack={skipBack}
                skipForward={skipForward}
                handleTimelineClick={handleTimelineClick}
                handleTimelineHover={handleTimelineHover}
                setHoveringTimeline={setHoveringTimeline}
                toggleMute={toggleMute}
                handleVolumeSlider={handleVolumeSlider}
                toggleFullscreen={toggleFullscreen}
                togglePiP={togglePiP}
                introOutro={introOutro}
                handleSpeedChange={handleSpeedChange}
                setShowSpeedMenu={setShowSpeedMenu}
                setShowShortcutsHelp={setShowShortcutsHelp}
                handleSkipIntro={handleSkipIntro}
                handleSkipOutro={handleSkipOutro}
                cancelAutoNext={cancelAutoNext}
                goToNextEpisode={goToNextEpisode}
                formatTime={formatTime}
                epIndex={epIndex}
                episodesLength={episodes.length}
                language={language}
                onToggleLanguage={handleToggleLanguage}
                serverIndex={serverIndex}
                onSwitchServer={switchServerFn}
                onSelectServer={handleSelectServer}
                autoNext={autoNext}
                onToggleAutoNext={handleToggleAutoNext}
                hlsLevels={hlsLevels}
                currentQuality={currentQuality}
                onQualityChange={handleQualityChange}
                servers={servers}
              />
              )}

              {/* Resume-from toast */}
              {resumeAt != null && streamMode === "hls" && (
                <div className="absolute bottom-16 sm:bottom-20 left-3 sm:left-4 z-30 flex items-center gap-3 px-3 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 shadow-2xl">
                  <span className="text-[11px] sm:text-xs text-white">Resumed from <strong className="text-white">{formatTime(resumeAt)}</strong></span>
                  <button onClick={handleStartOver} className="text-[11px] sm:text-xs font-bold text-white/80 hover:text-white underline underline-offset-2">Start over</button>
                  <button onClick={() => setResumeAt(null)} className="text-white/50 hover:text-white" aria-label="Dismiss"><X size={13} /></button>
                </div>
              )}
            </div>

            <div className="ad-content-container w-full lg:ml-[40px] lg:mr-0 lg:w-[calc(100%-40px)] px-0 sm:px-0">
              {/* --- SERVER SELECTOR --- */}
              {servers.length > 0 && langServers().length > 1 && (
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/5">
                  <span className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider font-medium">Server</span>
                  <div className="relative">
                    <button className="flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors" onClick={() => setShowServerSelector(p => !p)}>
                      {langServers()[serverIndex]?.label || 'Auto'} <ChevronDown size={10} />
                    </button>
                    {showServerSelector && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowServerSelector(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl py-1 min-w-[160px] sm:min-w-[180px] max-w-[220px] shadow-2xl z-50"
                        >
                          {langServers().map((srv, idx) => (
                            <button
                              key={`${srv.url}-${idx}`}
                              className={`w-full text-left px-3 py-1.5 text-[11px] sm:text-xs flex items-center gap-2 ${idx === serverIndex ? 'bg-white/15 text-white' : 'text-zinc-300 hover:text-white hover:bg-zinc-800'}`}
                              onClick={() => { switchServerFn(idx); setShowServerSelector(false); }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M21 12a9 9 0 00-9-9 9 9 0 00-9 9 9 9 0 009 9 9 9 0 009-9"/></svg>
                              {srv.label}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* --- BANNER --- */}
              {alertBannerVisible && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border-b border-white/15">
                  <AlertTriangle size={11} className="text-white flex-none sm:inline hidden" />
                  <p className="text-[11px] sm:text-xs text-white flex-1">If the current server doesn't work, feel free to try the other available servers.</p>
                  <button className="text-white/70 hover:text-white cursor-pointer bg-transparent border-none p-1 flex-none" onClick={() => setAlertBannerVisible(false)}><X size={10} /></button>
                </div>
              )}

              {/* --- VIDEO METADATA --- */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex flex-col gap-3 sm:gap-4 border-b border-white/5">
                {/* Episode Title */}
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-white leading-tight">
                  {episode?.title || episodeTitles?.[selectedEp] || `Episode ${selectedEp}`}
                </h1>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                  {/* Anime Info Row */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-800 ring-2 ring-white/10 shrink-0 overflow-hidden">
                      {anime?.img && <img src={anime.img} alt={anime?.name || ''} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex flex-col">
                      <button className="font-bold text-white text-sm sm:text-base leading-tight hover:text-white transition-colors text-left" onClick={() => navigate(`/anime/${id}/info`)}>
                        {anime?.name || "Anime"}
                      </button>
                      {anime?.myAnimeListUrl && (
                        <a href={anime.myAnimeListUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-xs text-zinc-400 font-medium mt-0.5 hover:text-zinc-300 transition-colors">
                          View on MAL
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <div className="relative">
                      <button
                        className={`px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full font-bold text-[11px] sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors ${bookmarked ? 'bg-white/10 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
                        onClick={() => { if (!bookmarked) { setShowStatusMenu(s => !s); } else { removeFromWatchlist(id); setBookmarked(false); } }}
                      >
                        <Bookmark size={11} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'In List' : 'Add to List'}
                      </button>
                      {showStatusMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl py-1 min-w-[130px] sm:min-w-[140px] shadow-2xl z-50"
                          >
                            {["Planning","Watching","Completed","Paused","Dropped"].map(s => (
                              <button
                                key={s}
                                className="w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                                onClick={() => {
                                  addToWatchlist({ id, name: anime?.name || episode?.title || `Episode ${selectedEp}`, img: anime?.img, type: 'anime', listStatus: s });
                                  setBookmarked(true);
                                  setShowStatusMenu(false);
                                }}
                              >{s}</button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <button disabled={reacting} className={`px-2 sm:px-4 py-1.5 sm:py-2.5 font-medium text-[11px] sm:text-sm flex items-center gap-1 sm:gap-2 border-r border-white/10 transition-colors disabled:opacity-60 ${liked === true ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-white'}`} onClick={() => handleReact('like')}>{reacting ? <Loader size={14} className="animate-spin" /> : <ThumbsUp size={14} fill={liked === true ? 'currentColor' : 'none'} />} {likesCount != null ? (likesCount >= 1000 ? `${(likesCount / 1000).toFixed(1)}K` : likesCount) : 0}</button>
                      <button disabled={reacting} className={`px-2 sm:px-4 py-1.5 sm:py-2.5 font-medium text-[11px] sm:text-sm flex items-center gap-1 sm:gap-2 transition-colors disabled:opacity-60 ${liked === false ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-white'}`} onClick={() => handleReact('dislike')}><ThumbsDown size={14} fill={liked === false ? 'currentColor' : 'none'} /> {dislikesCount != null && dislikesCount > 0 ? (dislikesCount >= 1000 ? `${(dislikesCount / 1000).toFixed(1)}K` : dislikesCount) : ''}</button>
                    </div>
                    {/* Desktop: show all buttons */}
                    <button className="hidden sm:flex bg-white/5 border border-white/5 hover:bg-white/10 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-full font-medium text-[11px] sm:text-sm text-white items-center gap-1 sm:gap-2 transition-colors" title={`Switch to ${language === 'sub' ? 'Dub' : 'Sub'}`} onClick={() => { setLanguage(l => l === 'sub' ? 'dub' : 'sub'); try { localStorage.setItem('otaku_last_language', language === 'sub' ? 'dub' : 'sub'); } catch (e) { console.error('[Otaku] Failed to save language pref:', e); } }}>
                      <Tv size={12} className="text-zinc-400" /> {language === 'dub' ? 'Dub' : 'Sub'}
                    </button>
                    <button className="hidden sm:flex bg-white/5 border border-white/5 hover:bg-white/10 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-full font-medium text-[11px] sm:text-sm text-white items-center gap-1 sm:gap-2 transition-colors" onClick={() => { if (navigator.share) navigator.share({ title: anime?.name, url: window.location.href }); else navigator.clipboard?.writeText(window.location.href); }}>
                      <Share2 size={12} /> Share
                    </button>
                    <button className="hidden sm:flex bg-white/5 border border-white/5 hover:bg-white/10 w-8 sm:w-10 h-8 sm:h-10 items-center justify-center rounded-full text-white transition-colors" title="Report" onClick={openReport}>
                      <Flag size={11} />
                    </button>
                    {reportMsg && (
                      <span className="hidden sm:inline text-[11px] text-zinc-400 ml-2">{reportMsg}</span>
                    )}
                    {/* Mobile "More" button */}
                    <div className="relative sm:hidden">
                      <button className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-white transition-colors" onClick={() => setShowMoreActions(p => !p)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                      {showMoreActions && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowMoreActions(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl py-1 min-w-[140px] shadow-2xl z-50"
                          >
                            <button className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2" onClick={() => { setLanguage(l => l === 'sub' ? 'dub' : 'sub'); try { localStorage.setItem('otaku_last_language', language === 'sub' ? 'dub' : 'sub'); } catch (e) { console.error('[Otaku] Failed to save language pref:', e); } setShowMoreActions(false); }}>
                              <Tv size={12} /> {language === 'sub' ? 'Switch to Dub' : 'Switch to Sub'}
                            </button>
                            <button className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2" onClick={() => { if (servers.length > 1) { setServerIndex(i => (i + 1) % servers.length); } setShowMoreActions(false); }}>
                              <Monitor size={12} /> Server
                            </button>
                            <button className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2" onClick={() => { if (navigator.share) navigator.share({ title: anime?.name, url: window.location.href }); else navigator.clipboard?.writeText(window.location.href); setShowMoreActions(false); }}>
                              <Share2 size={12} /> Share
                            </button>
                    <button className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2" onClick={() => { openReport(); setShowMoreActions(false); }}>
                      <Flag size={12} /> Report
                    </button>
                            {reportMsg && (
                              <div className="px-4 py-2 text-[11px] text-zinc-400">{reportMsg}</div>
                            )}
                          </motion.div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats & Synopsis */}
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 sm:p-4">
                  <div className="text-[11px] sm:text-sm font-semibold text-zinc-400 mb-2">
                    {[
                      anime?.episodes && `${anime.episodes} episodes`,
                      anime?.season,
                      anime?.year && !String(anime?.season || '').includes(String(anime.year)) ? anime.year : null,
                      anime?.status,
                    ].filter(Boolean).join(' • ')}
                  </div>
                  {(anime?.synopsis || anime?.description) ? (
                    (() => {
                      const desc = (anime.synopsis || anime.description).replace(/<[^>]*>/g, '').trim();
                      const long = desc.length > 220;
                      return (
                        <>
                          <p
                            className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line"
                            style={!descExpanded && long ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
                          >
                            {desc}
                          </p>
                          {long && (
                            <button onClick={() => setDescExpanded(v => !v)} className="mt-1.5 text-[11px] sm:text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                              {descExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">No synopsis available.</p>
                  )}
                </div>
              </div>

              {/* --- COMMENTS --- */}
              <div className="px-3 sm:px-4">
                {/* Mobile: collapsible comments */}
                <button
                  className="flex sm:hidden items-center gap-2 w-full py-3 px-4 rounded-xl bg-white/5 border border-white/5 text-white text-sm font-semibold mb-3"
                  onClick={() => setShowMobileComments(p => !p)}
                >
                  <MessageCircle size={14} />
                  <span>Comments</span>
                  <span className="text-xs text-zinc-500 ml-1">({comments?.length || 0})</span>
                  <ChevronDown size={12} className={`ml-auto transition-transform ${showMobileComments ? 'rotate-180' : ''}`} />
                </button>
                <div className={`sm:block ${showMobileComments ? 'block' : 'hidden'}`}>
                  {commentsError && !commentsLoading && (
                    <div className="flex items-center gap-2 px-4 py-3 mb-3 rounded-xl bg-white/10 border border-white/15">
                      <AlertTriangle size={14} className="text-white" />
                      <p className="text-xs text-white flex-1">Failed to load comments.</p>
                      <button className="text-xs text-white hover:text-white underline bg-transparent border-none cursor-pointer" onClick={() => { setCommentsError(false); setCommentsLoading(true); commentService.getComments(id, { episode: selectedEp }).then(res => { if (res.success) setComments(res.data.map(mapComment)); else setCommentsError(true); }).catch(() => setCommentsError(true)).finally(() => setCommentsLoading(false)); }}>Retry</button>
                    </div>
                  )}
                  <Comments
                    comments={comments}
                    setComments={setComments}
                    currentUser={currentUsername}
                    currentAvatar={currentAvatar}
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
            </div>
          </div>

          {/* --- RIGHT SIDEBAR --- */}
          <aside className="w-full lg:w-[380px] shrink-0 overflow-y-auto overflow-x-hidden rounded-2xl sm:rounded-3xl lg:mr-4 mx-2 sm:mx-4 my-2 sm:my-4 bg-[#0f0f0f]/95 backdrop-blur-xl border border-white/[0.06] shadow-2xl shadow-black/50">
            <div className="p-3 sm:p-4">
              {/* --- HEADER --- */}
              <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-semibold text-white/90 truncate">
                    Up Next{episodeTitles?.[selectedEp] || episode?.title ? ` - ${episodeTitles?.[selectedEp] || episode?.title || ''}` : ''}
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#777] mt-0.5 truncate">
                    Playing - Episode {selectedEp || 1}{anime?.name ? ` - ${anime?.name || ''}` : ''}
                  </div>
                </div>
                <button className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-2xl hover:bg-white/[0.06] transition-all text-[#777] hover:text-white cursor-pointer border-none bg-transparent shrink-0 ml-2" onClick={() => setIsEpisodesExpanded(p => !p)} title={isEpisodesExpanded ? 'Collapse' : 'Expand'}>
                  <ChevronUp size={13} className="transition-transform duration-200" style={{ transform: isEpisodesExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }} />
                </button>
              </div>

              {/* --- EPISODES --- */}
              <div className={`overflow-hidden transition-[max-height] duration-400 ease-out ${isEpisodesExpanded ? 'max-h-[40vh] lg:max-h-[70vh]' : 'max-h-0'}`}>
                {/* search & filters bar */}
                <div className="flex items-center gap-1 sm:gap-1.5 mb-3 sm:mb-4">
                  <div className="relative flex items-center flex-1 bg-white/[0.04] rounded-full px-2 sm:px-3 border border-white/[0.06] focus-within:border-white/20 transition-all" style={{ height: '30px' }}>
                    <svg className="text-[#555] shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input className="flex-1 bg-transparent text-[11px] sm:text-xs text-white/80 outline-none placeholder-[#555] border-none py-0 ml-1.5 sm:ml-2" type="text" placeholder="Search" value={epSearch} onChange={e => { setEpSearch(e.target.value); if (!e.target.value) setVisibleCount(50); }} />
                    {epSearch && <button className="text-[#555] hover:text-white cursor-pointer bg-transparent border-none p-0.5 shrink-0" onClick={() => { setEpSearch(""); setVisibleCount(50); }}><X size={10} /></button>}
                  </div>
                  <button className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-[#666] hover:text-white cursor-pointer bg-transparent shrink-0" title="Refresh" onClick={() => setRetryCount(c => c + 1)}>
                    <RefreshCw size={11} />
                  </button>
                  <button
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-2xl border transition-all cursor-pointer bg-transparent shrink-0 ${sortOrder === 'desc' ? 'bg-white/[0.08] border-white/[0.12] text-white' : 'bg-white/[0.04] border-white/[0.06] text-[#666] hover:text-white hover:bg-white/[0.08]'}`}
                    title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                    onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  </button>
                  <button
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-2xl border transition-all cursor-pointer bg-transparent shrink-0 ${sidebarView === 'list' ? 'bg-white/[0.08] border-white/[0.12] text-white' : 'bg-white/[0.04] border-white/[0.06] text-[#666] hover:text-white hover:bg-white/[0.08]'}`}
                    title={sidebarView === 'thumbnail' ? 'List view' : 'Thumbnail view'}
                    onClick={() => setSidebarView(p => p === 'thumbnail' ? 'list' : 'thumbnail')}
                  >
                    {sidebarView === 'thumbnail' ? <List size={11} /> : <LayoutGrid size={11} />}
                  </button>
                </div>

                {/* list */}
                <div ref={sidebarRef} className="flex flex-col overflow-y-auto overflow-x-hidden max-h-[240px] lg:max-h-[400px]">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader size={16} className="text-zinc-500 animate-spin" />
                    </div>
                  ) : sortedEpisodes.length === 0 ? (
                    <p className="text-xs text-[#555] text-center py-12">{epSearch ? 'No matching episodes' : 'No episodes'}</p>
                  ) : (
                    <>
                      <AnimatePresence mode="wait">
                        {sortedEpisodes.slice(0, visibleCount).map((ep, i) => {
                          const realIdx = episodes.indexOf(ep);
                          const isActive = realIdx === epIndex;
                          const epTitle = ep?.title || episodeTitles?.[ep?.episode] || 'Untitled';
                          const epNum = ep?.episode || realIdx + 1;
                          return (
                            <motion.div
                              key={ep?.id || realIdx}
                              data-ep-index={realIdx}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.2, delay: i * 0.015 }}
                              className={`relative flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-300 group rounded-[18px] mx-1 ${isActive ? 'bg-[rgba(22,22,28,0.8)] border border-white/[0.07] shadow-[inset_16px_0_40px_-15px_rgba(255,255,255,0.08)]' : 'bg-[rgba(17,17,20,0.5)] border border-white/[0.02] hover:bg-[rgba(22,22,28,0.8)] hover:border-white/[0.07]'}`}
                              onClick={() => { setEpIndex(realIdx); setSelectedEp(episodes[realIdx]?.episode || (realIdx + 1)); }}
                            >
                              {isActive && <div className="absolute left-0 top-3 bottom-3 w-[3.5px] rounded-r-[4px] bg-white z-[2]" />}
                              {sidebarView === 'thumbnail' ? (
                                <>
                                  <div className="relative w-28 sm:w-36 aspect-video flex-shrink-0 rounded-lg sm:rounded-xl overflow-hidden bg-neutral-900 shadow-lg ring-1 ring-white/[0.03] group-hover:ring-white/10 transition-all duration-300">
                                    {ep?.thumbnail && !brokenThumbs.has(ep?.id || realIdx) ? (
                                      <>
                                        <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={ep.thumbnail} alt={ep.title || `Episode ${epNum}`} loading="lazy" onError={() => setBrokenThumbs(prev => new Set(prev).add(ep?.id || realIdx))} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                                      </>
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center">
                                        <Film size={18} className="text-neutral-600" />
                                      </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 px-1.5 sm:px-2.5 py-1 sm:py-2 flex items-center justify-between">
                                      <span className="text-[10px] sm:text-[11px] font-bold text-white/90 drop-shadow-lg">Ep {epNum}</span>
                                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg>
                                      </div>
                                    </div>
                                    {isActive && <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-xl pointer-events-none" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-[11px] sm:text-sm font-bold truncate transition-colors ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                                      {epTitle}
                                    </div>
                                    {ep?.description && (
                                      <div className="text-[10px] sm:text-[11px] text-[#888] mt-0.5 leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {ep.description.replace(/<[^>]*>/g, '')}
                                      </div>
                                    )}
                                  </div>
                                  {isActive && (
                                    <div className="shrink-0 w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className={`text-sm font-bold shrink-0 w-6 text-right ${isActive ? 'text-white' : 'text-[#555]'}`}>{epNum}.</span>
                                  <div className="min-w-0 flex-1">
                                    <span className={`text-sm font-bold truncate block transition-colors ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>{epTitle}</span>
                                  </div>
                                  {isActive && (
                                    <div className="shrink-0 w-[18px] h-[18px] rounded-full bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center">
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg>
                                    </div>
                                  )}
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {(allEpsRef.current.length > visibleCount) && (
                        <div className="-mx-4 px-4 mt-1 py-3 text-center text-xs font-bold text-neutral-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer" onClick={handleLoadMore}>
                          Load More ({allEpsRef.current.length - visibleCount} remaining)
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* --- NEXT AIRING --- */}
              {nextAiring && (
                <div className="flex items-center gap-2 sm:gap-3 -mx-4 mt-0 px-3 sm:px-4 py-2.5 sm:py-3.5 bg-[#0a1f12] border-t border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-[#4caf50] animate-pulse shrink-0 shadow-[0_0_8px_#4caf50]/50" />
                  <Bell size={14} className="text-[#4caf50]/70 shrink-0" />
                  <span className="text-xs text-[#4caf50]/90">Next ep airing in <strong className="text-[#4caf50] font-semibold">{nextAiring?.text || ''}</strong></span>
                </div>
              )}

              {/* --- MORE LIKE THIS --- */}
              {recommendations?.length > 0 && (
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="text-[11px] font-semibold text-[#555] uppercase tracking-[2px] mb-4 px-1">More Like This</div>
                  <div className="flex flex-col gap-2">
                    {recommendations.slice(0, 4).map((rec, i) => (
                      <div key={rec?.id || i} className="trending-card group" onClick={() => navigate(`/anime/${rec?.id || ''}/info`)}>
                        <div className="card-bg-artwork" style={{ backgroundImage: `url(${rec?.image || ''})` }} />
                        <div className="card-gradient-mask" />
                        <div className="info-cluster" style={{ maxWidth: '100%', gap: '12px' }}>
                          <div className="rank-wrapper">
                            {rec?.image ? (
                              <img className="w-full h-full object-cover rounded-xl ring-1 ring-white/[0.08] shadow-lg" src={rec.image} alt={rec?.title || rec?.name || ''} />
                            ) : (
                              <div className="w-full h-full rounded-xl bg-neutral-800 flex items-center justify-center text-[#555] text-sm font-bold">?</div>
                            )}
                          </div>
                          <div className="meta-text-block">
                            <h3 className="anime-title">{rec?.name || 'Unknown'}</h3>
                            <div className="sub-meta-row">
                              {rec?.rating && <span className="rating-block"><Star size={10} /> {rec.rating}%</span>}
                              <span className="type-label">{rec?.genres?.slice(0, 2).join(' • ') || rec?.format || 'Anime'}</span>
                            </div>
                          </div>
                        </div>
                        <button className="glass-play-btn" onClick={(e) => { e.stopPropagation(); navigate(`/anime/${rec?.id || ''}/info`); }}>
                          <Play size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

        </div>
      </div>

      {/* --- REPORT MODAL --- */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { if (!reportSubmitting) setShowReportModal(false); }}
          >
            <motion.div
              className="w-full max-w-sm bg-[#0d0d10]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {reportDone ? (
                <div className="flex flex-col items-center text-center gap-3 px-6 py-10">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <p className="text-white font-semibold">Report submitted</p>
                  <p className="text-xs text-zinc-400">Thanks — our team will review it.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white font-semibold text-sm"><Flag size={15} /> Report a problem</div>
                    <button onClick={() => setShowReportModal(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={16} /></button>
                  </div>
                  <div className="px-5 py-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      {[
                        { value: 'bug', label: 'Video not playing / broken' },
                        { value: 'content', label: 'Wrong or missing episode' },
                        { value: 'moderation', label: 'Inappropriate content' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setReportCategory(opt.value)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-sm transition-colors ${reportCategory === opt.value ? 'bg-white/15 border-white/40 text-white' : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'}`}
                        >
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${reportCategory === opt.value ? 'border-white/40' : 'border-zinc-600'}`}>
                            {reportCategory === opt.value && <span className="w-2 h-2 rounded-full bg-white" />}
                          </span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reportDetails}
                      onChange={e => setReportDetails(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Describe what went wrong…"
                      className="w-full bg-black/40 border border-white/10 focus:border-white/40 rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none placeholder-zinc-600 transition-colors"
                    />
                    {reportMsg && <p className="text-xs text-white">{reportMsg}</p>}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button onClick={() => setShowReportModal(false)} className="px-4 py-2 rounded-full text-sm font-semibold text-zinc-300 hover:bg-white/10 transition-colors">Cancel</button>
                      <button
                        onClick={submitReport}
                        disabled={!reportDetails.trim() || reportSubmitting}
                        className="px-5 py-2 rounded-full text-sm font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      >
                        {reportSubmitting ? <><Loader size={14} className="animate-spin" /> Sending…</> : 'Submit report'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
