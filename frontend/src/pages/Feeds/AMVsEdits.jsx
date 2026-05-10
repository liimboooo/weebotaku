import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageSquare,
  Share2,
  Play,
  Pause,
  X,
  Plus,
  Search,
  Trash2,
  Clock,
  Sparkles,
} from "lucide-react";
import AnimatedPage from "../../components/AnimatedPage";
import { useToast } from "../../components/Toast";

import "./AMVsEdits.css";

const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

const allAnimeTitles = [
  "Jujutsu Kaisen", "One Piece", "Attack on Titan", "Demon Slayer",
  "Naruto", "Bleach", "My Hero Academia", "Dragon Ball",
  "Chainsaw Man", "Vinland Saga", "Solo Leveling", "Tokyo Revengers",
];

const STORAGE_KEY = "amv_edits";
const LIKED_KEY = "amv_liked";
const SAVED_KEY = "amv_saved";

function loadFromStorage(key, fallback) {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; }
  catch { return fallback; }
}

function openVideoDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("AnimeWCH_Videos", 2);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains("videos")) db.createObjectStore("videos", { keyPath: "id" });
      if (!db.objectStoreNames.contains("covers")) db.createObjectStore("covers", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeVideo(id, file) {
  const db = await openVideoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("videos", "readwrite");
    tx.objectStore("videos").put({ id, file });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadVideoBlob(id) {
  const db = await openVideoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("videos", "readonly");
    const req = tx.objectStore("videos").get(id);
    req.onsuccess = () => {
      if (req.result) resolve(URL.createObjectURL(req.result.file));
      else resolve(null);
    };
    req.onerror = () => reject(req.error);
  });
}

async function storeCover(id, dataUrl) {
  const db = await openVideoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("covers", "readwrite");
    tx.objectStore("covers").put({ id, dataUrl });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadCover(id) {
  const db = await openVideoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("covers", "readonly");
    const req = tx.objectStore("covers").get(id);
    req.onsuccess = () => {
      if (req.result) resolve(req.result.dataUrl);
      else resolve("");
    };
    req.onerror = () => reject(req.error);
  });
}

function generateThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);
    video.onloadeddata = () => { video.currentTime = 1; };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 360;
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(video, 0, 0, w, h);
      URL.revokeObjectURL(video.src);
      resolve(canvas.toDataURL("image/jpeg", 0.5));
    };
    video.onerror = () => { URL.revokeObjectURL(video.src); resolve(""); };
    setTimeout(() => { URL.revokeObjectURL(video.src); resolve(""); }, 5000);
  });
}

function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function AMVsEdits() {
  const [ready, setReady] = useState(false);
  const [edits, setEdits] = useState([]);
  const [selectedEdit, setSelectedEdit] = useState(null);
  const [likedEdits, setLikedEdits] = useState(() => loadFromStorage(LIKED_KEY, []));
  const [savedEdits, setSavedEdits] = useState(() => loadFromStorage(SAVED_KEY, []));
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("new");
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoHover, setVideoHover] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef(null);
  const viewedSet = useRef(new Set());
  const masonryRef = useRef(null);
  const heroBgRef = useRef(null);
  const { showToast } = useToast();

  // Load metadata from localStorage + hydrate videos & covers from IndexedDB
  useEffect(() => {
    (async () => {
      const stored = loadFromStorage(STORAGE_KEY, []);
      const hydrated = await Promise.all(stored.map(async (e) => ({
        ...e,
        status: e.status || ["Ongoing","Completed"][Math.floor(Math.random()*2)],
        cover: e.cover && !e.cover.startsWith("data:") ? e.cover : await loadCover(e.id),
        videoUrl: await loadVideoBlob(e.id) || "",
      })));
      setEdits(hydrated);
      setReady(true);
    })();
  }, []);

  // Persist metadata (without videoUrl & cover) to localStorage
  useEffect(() => {
    if (ready) {
      const toStore = edits.map(({ videoUrl, cover, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }
  }, [edits, ready]);

  useEffect(() => { localStorage.setItem(LIKED_KEY, JSON.stringify(likedEdits)); }, [likedEdits]);
  useEffect(() => { localStorage.setItem(SAVED_KEY, JSON.stringify(savedEdits)); }, [savedEdits]);

  // Close modal on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setSelectedEdit(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Body scroll lock when pin modal is open
  useEffect(() => {
    if (selectedEdit) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [selectedEdit]);

  // Reset video state when switching edits in pin modal
  useEffect(() => {
    setVideoPlaying(false);
    setVideoStarted(false);
    setVideoProgress(0);
    setVideoHover(false);
  }, [selectedEdit?.id]);

  // Scroll masonry to top when filter or search changes
  useEffect(() => {
    if (masonryRef.current) {
      masonryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchQuery]);

  // Parallax effect on hero background
  useEffect(() => {
    const handleScroll = () => {
      if (heroBgRef.current) {
        const offset = window.scrollY;
        heroBgRef.current.style.transform = `translateY(${offset * 0.3}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredEdits = edits.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.anime.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.hashtags.some(h => h.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  }).sort((a, b) => {
    if (sortBy === "new") return b.timestamp - a.timestamp;
    if (sortBy === "old") return a.timestamp - b.timestamp;
    if (sortBy === "popular") return b.likes - a.likes;
    return 0;
  });

  const creatorEdits = selectedEdit
    ? edits.filter(e => e.creator === selectedEdit.creator && e.id !== selectedEdit.id).slice(0, 4)
    : [];

  const bestEdit = edits.length > 0 ? edits.reduce((best, e) => e.likes > (best?.likes || 0) ? e : best, edits[0]) : null;

  const handleResonate = (id) => {
    if (likedEdits.includes(id)) {
      setLikedEdits(likedEdits.filter(i => i !== id));
      setEdits(edits.map(e => e.id === id ? { ...e, likes: e.likes - 1 } : e));
      if (selectedEdit?.id === id) setSelectedEdit(prev => prev ? { ...prev, likes: prev.likes - 1 } : prev);
    } else {
      setLikedEdits([...likedEdits, id]);
      setEdits(edits.map(e => e.id === id ? { ...e, likes: e.likes + 1 } : e));
      if (selectedEdit?.id === id) setSelectedEdit(prev => prev ? { ...prev, likes: prev.likes + 1 } : prev);
    }
  };

  const handleShare = (edit) => {
    navigator.clipboard.writeText(
      `${edit.title} by ${edit.creator} - ${window.location.origin}/feeds/amvs`
    );
    showToast("Link copied to clipboard!", "success");
  };

  const handleSave = (id) => {
    if (savedEdits.includes(id)) {
      setSavedEdits(savedEdits.filter(i => i !== id));
    } else {
      setSavedEdits([...savedEdits, id]);
    }
  };

  const handleVideoTime = () => {
    if (videoRef.current) {
      setVideoProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleVideoToggle = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  // Upload state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState("form");
  const [newTitle, setNewTitle] = useState("");
  const [newAnime, setNewAnime] = useState("");
  const [newHashtags, setNewHashtags] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(40);
  const [submitting, setSubmitting] = useState(false);

  // Body scroll lock when upload modal is open
  useEffect(() => {
    if (isUploadOpen) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [isUploadOpen]);

  const handleFileSelect = (file) => {
    if (!file) return;
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement("video");
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      const dur = tempVideo.duration;
      setVideoDuration(dur);
      if (dur > 40) {
        setTrimEnd(Math.min(40, dur));
        setUploadStep("trim");
      } else {
        setTrimEnd(dur);
        setUploadStep("form");
      }
      URL.revokeObjectURL(url);
    };
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle || !videoFile) return;
    const finalDuration = trimEnd - trimStart;
    if (finalDuration > 40) {
      showToast("Video must be 40 seconds or less", "error");
      return;
    }
    setSubmitting(true);
    const id = Date.now();
    await storeVideo(id, videoFile);
    const blobUrl = URL.createObjectURL(videoFile);
    const coverDataUrl = coverFile
      ? await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(coverFile); })
      : await generateThumbnail(videoFile);
    if (coverDataUrl) await storeCover(id, coverDataUrl);
    const tags = [...new Set(newHashtags.match(/#[\w]+/g) || [])].slice(0, 5);
    const newEdit = {
      id,
      title: newTitle,
      creator: "@" + (localStorage.getItem("username") || "you"),
      anime: newAnime || "Other",
      cover: coverDataUrl || "",
      videoUrl: blobUrl,
      likes: 0,
      views: 0,
      comments: 0,
      hashtags: tags.length > 0 ? tags : ["#AnimeEdit"],
      duration: Math.round(finalDuration),
      timestamp: Date.now(),
      aspectRatio: ["9/16","3/4","1/1","4/3","16/9"][Math.floor(Math.random()*5)],
      status: ["Ongoing","Completed"][Math.floor(Math.random()*2)],
    };
    setEdits([newEdit, ...edits]);
    resetUpload();
    showToast("Edit uploaded!", "success");
  };

  const resetUpload = () => {
    setIsUploadOpen(false);
    setUploadStep("form");
    setNewTitle("");
    setNewAnime("");
    setNewHashtags("");
    setVideoFile(null);
    setCoverFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(40);
    setSubmitting(false);
  };

  // Comment state in player
  const [editComments, setEditComments] = useState({});
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    if (selectedEdit) {
      const stored = JSON.parse(localStorage.getItem(`amv_comments_${selectedEdit.id}`) || "[]");
      setEditComments(prev => ({ ...prev, [selectedEdit.id]: stored }));
    }
  }, [selectedEdit?.id]);

  const handlePostComment = () => {
    if (!selectedEdit || !commentText.trim()) return;
    const user = localStorage.getItem("username") || "Anonymous";
    const avatar = localStorage.getItem("userAvatar") || "";
    const comment = { id: Date.now(), user, avatar, text: commentText.trim(), timestamp: Date.now() };
    const current = editComments[selectedEdit.id] || [];
    const updated = [...current, comment];
    setEditComments(prev => ({ ...prev, [selectedEdit.id]: updated }));
    localStorage.setItem(`amv_comments_${selectedEdit.id}`, JSON.stringify(updated));
    setEdits(edits.map(e => e.id === selectedEdit.id ? { ...e, comments: e.comments + 1 } : e));
    setSelectedEdit(prev => prev ? { ...prev, comments: prev.comments + 1 } : prev);
    setCommentText("");
    showToast("Comment posted!", "success");
  };

  const handleDeleteComment = (cid) => {
    if (!selectedEdit) return;
    const current = editComments[selectedEdit.id] || [];
    const updated = current.filter(c => c.id !== cid);
    setEditComments(prev => ({ ...prev, [selectedEdit.id]: updated }));
    localStorage.setItem(`amv_comments_${selectedEdit.id}`, JSON.stringify(updated));
    setEdits(edits.map(e => e.id === selectedEdit.id ? { ...e, comments: Math.max(0, e.comments - 1) } : e));
    setSelectedEdit(prev => prev ? { ...prev, comments: Math.max(0, prev.comments - 1) } : prev);
  };

  const handleDeleteEdit = async (id) => {
    if (!window.confirm("Delete this edit permanently?")) return;
    const db = await openVideoDB();
    const tx = db.transaction(["videos", "covers"], "readwrite");
    tx.objectStore("videos").delete(id);
    tx.objectStore("covers").delete(id);
    setEdits(edits.filter(e => e.id !== id));
    setSelectedEdit(null);
    showToast("Edit deleted", "success");
  };

  return (
    <AnimatedPage>
      <div className="anime-edits-page">
        {!ready ? (
          <div className="edits-loading"><div className="edits-loading-spinner" /></div>
        ) : (
        <>        
        {/* Hero Section */}
        <section className="edits-hero">
          <div className="edits-hero-bg" ref={heroBgRef}>
            <video
              className="edits-hero-video"
              src={SAMPLE_VIDEO}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
            <div className="edits-hero-overlay" />
          </div>
          <div className="edits-hero-content">
            <span className="edits-hero-eyebrow">ANIME EDITS COMMUNITY</span>
            <h1 className="edits-hero-title">Discover &amp; Share Creative Anime Edits</h1>
            <p className="edits-hero-sub">The ultimate community for high-fidelity anime AMVs and fan-made edits.</p>
            <div className="edits-hero-cta">
              <button className="edits-cta-primary" onClick={() => masonryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <Sparkles size={16} /> Explore Trends
              </button>
              <button className="edits-cta-secondary" onClick={() => setIsUploadOpen(true)}>
                <Plus size={16} /> Upload Your Edit
              </button>
            </div>
          </div>
          <div className="edits-hero-transition" />
        </section>

        <div className="edits-controls">
          <div className="edits-nav-row">
            <div className="edits-sort-module">
              {["new", "old", "popular"].map(s => (
                <button
                  key={s}
                  className={`edits-sort-btn ${sortBy === s ? "active" : ""}`}
                  onClick={() => setSortBy(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="edits-nav-right">
              <div className="edits-nav-search">
                <Search size={15} />
                <input
                  placeholder="Search edits, anime, creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="edits-search-clear" onClick={() => setSearchQuery("")}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="edits-masonry" ref={masonryRef}>
          <AnimatePresence>
            {filteredEdits.length > 0 ? filteredEdits.map((edit, i) => (
              <motion.div
                key={edit.id}
                className="masonry-item"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setSelectedEdit(edit)}
              >
                <div className="edits-card">
                  <div className="edits-poster" style={{ aspectRatio: edit.aspectRatio }}>
                    {edit.cover ? <img src={edit.cover} alt={edit.title} /> : <div className="edits-poster-fallback"><Play size={24} /></div>}
                    <div className="edits-duration-badge">
                      <Clock size={10} /> {edit.duration}s
                    </div>
                    {savedEdits.includes(edit.id) && <div className="edits-saved-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="#e50914" stroke="#e50914" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div>}
                    <div className="edits-poster-overlay">
                      <p className="edits-overlay-desc">{edit.hashtags.slice(0, 3).join(" · ")}</p>
                    </div>
                  </div>
                  <div className="edits-card-info">
                    <h3 className="edits-card-title">{edit.title}</h3>
                    <div className="edits-creator-row">
                      <div className="edits-creator-avatar">{edit.creator.charAt(1).toUpperCase()}</div>
                      <span className="edits-creator-handle">{edit.creator}</span>
                    </div>
                    <div className="edits-engagement-row">
                      <span><Heart size={11} /> {formatCount(edit.likes)}</span>
                      <span><MessageSquare size={11} /> {formatCount(edit.comments)}</span>
                      <span><Play size={11} /> {formatCount(edit.views)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="edits-empty-state">
                <div className="edits-empty-icon"><Play size={40} /></div>
                {edits.length === 0 ? (
                  <>
                    <p>No edits yet — upload your first edit!</p>
                    <button className="edits-upload-btn" onClick={() => setIsUploadOpen(true)}>
                      <Plus size={18} /> Upload
                    </button>
                  </>
                ) : (
                  <>
                    <p>No edits found matching your search.</p>
                    <p className="edits-empty-hint">Try a different search term or clear filters.</p>
                  </>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Player Modal */}
        <AnimatePresence>
          {selectedEdit && (
            <div className="pin-overlay" onClick={() => setSelectedEdit(null)}>
              <motion.div
                className="pin-modal"
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button className="pin-close" onClick={() => setSelectedEdit(null)}><X size={20} /></button>

                <div className="pin-split">
                  <div className="pin-video-side">
                    <div
                      className="pin-video-wrap"
                      onMouseEnter={() => setVideoHover(true)}
                      onMouseLeave={() => setVideoHover(false)}
                    >
                      {selectedEdit.videoUrl ? (
                      <video
                        key={selectedEdit.id}
                        ref={videoRef}
                        src={selectedEdit.videoUrl}
                        autoPlay
                        muted
                        playsInline
                        className="pin-video"
                        onPlay={() => {
                          setVideoPlaying(true);
                          setVideoStarted(true);
                          if (!viewedSet.current.has(selectedEdit.id)) {
                            viewedSet.current.add(selectedEdit.id);
                            setEdits(prev => prev.map(e => e.id === selectedEdit.id ? { ...e, views: e.views + 1 } : e));
                            setSelectedEdit(prev => prev ? { ...prev, views: prev.views + 1 } : prev);
                          }
                        }}
                        onPause={() => setVideoPlaying(false)}
                        onEnded={() => { setVideoPlaying(false); setVideoProgress(0); }}
                        onTimeUpdate={handleVideoTime}
                        onClick={handleVideoToggle}
                      />
                      ) : (
                        <div className="pin-video-fallback">
                          <Play size={32} />
                          <span>Video unavailable</span>
                        </div>
                      )}
                      {selectedEdit.cover && <div className={`pin-video-cover ${videoStarted ? "faded" : ""}`} style={{ backgroundImage: `url(${selectedEdit.cover})` }} />}
                      {/* Slim progress bar + tiny play/pause icon — visible on hover */}
                      <div className={`pin-video-bar ${videoHover ? "visible" : ""}`}>
                        <div className="pin-bar-left">
                          {videoPlaying ? <Pause size={11} /> : <Play size={11} fill="currentColor" />}
                        </div>
                        <div className="pin-bar-track">
                          <div className="pin-bar-fill" style={{ width: `${videoProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pin-info-side">
                    {/* ── Sticky Top: Creator, Title, Actions, Description ── */}
                    <div className="pin-top-sticky">
                      <div className="pin-header">
                        <div className="pin-creator">
                          <div className="pin-avatar">
                            {selectedEdit.creator.charAt(1).toUpperCase()}
                          </div>
                          <div>
                            <strong>{selectedEdit.creator}</strong>
                            <span>{selectedEdit.anime}</span>
                          </div>
                        </div>
                        {selectedEdit.creator === "@" + (localStorage.getItem("username") || "you") && (
                          <button className="pin-delete-btn" onClick={() => handleDeleteEdit(selectedEdit.id)} title="Delete">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      <h2 className="pin-title">{selectedEdit.title}</h2>

                      <div className="pin-stats-row">
                        <span><Heart size={13} fill={likedEdits.includes(selectedEdit.id) ? "#e50914" : "none"} color={likedEdits.includes(selectedEdit.id) ? "#e50914" : "currentColor"} /> {formatCount(selectedEdit.likes)}</span>
                        <span><Play size={13} /> {formatCount(selectedEdit.views)}</span>
                        <span>{timeAgo(selectedEdit.timestamp)}</span>
                      </div>

                      <div className="pin-actions-row">
                        <button
                          className={`pin-glass-btn ${likedEdits.includes(selectedEdit.id) ? "active" : ""}`}
                          onClick={() => handleResonate(selectedEdit.id)}
                          title="Like"
                        >
                          <Heart size={17} fill={likedEdits.includes(selectedEdit.id) ? "#e50914" : "none"} color={likedEdits.includes(selectedEdit.id) ? "#e50914" : "#fff"} />
                        </button>
                        <button className="pin-glass-btn" onClick={() => handleShare(selectedEdit)} title="Share">
                          <Share2 size={17} />
                        </button>
                        <button
                          className={`pin-glass-btn ${savedEdits.includes(selectedEdit.id) ? "saved" : ""}`}
                          onClick={() => handleSave(selectedEdit.id)}
                          title="Save"
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill={savedEdits.includes(selectedEdit.id) ? "#e50914" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        </button>
                      </div>

                      <div className="pin-divider" />

                      <div className="pin-description">
                        <p>A stunning {selectedEdit.anime} fan edit by {selectedEdit.creator}. {selectedEdit.duration}s of pure fire.</p>
                        <div className="pin-hashtags">
                          {selectedEdit.hashtags.map(tag => (
                            <span key={tag} className="pin-hashtag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── Scrollable Middle: Comments ── */}
                    <div className="pin-scrollable">
                      <div className="pin-comments-head">
                        <MessageSquare size={15} />
                        <span>Comments ({selectedEdit.comments})</span>
                      </div>

                      <div className="pin-comments-list">
                        {(editComments[selectedEdit.id] || []).length > 0 ? (
                          [...(editComments[selectedEdit.id] || [])].reverse().map(c => (
                            <div className="pin-comment" key={c.id}>
                              <div className="pin-c-avatar">
                                {c.avatar ? <img src={c.avatar} alt="" /> : <span>{c.user.charAt(0)}</span>}
                              </div>
                              <div className="pin-c-body">
                                <div className="pin-c-head">
                                  <strong>{c.user}</strong>
                                  <span>{timeAgo(c.timestamp)}</span>
                                </div>
                                <p>{c.text}</p>
                              </div>
                              {c.user === (localStorage.getItem("username") || "Anonymous") && (
                                <button className="pin-c-delete" onClick={() => handleDeleteComment(c.id)}>
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="pin-c-empty">
                            <MessageSquare size={28} strokeWidth={1} />
                            <p>Be the first to comment</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Sticky Bottom: Comment Composer ── */}
                    <div className="pin-composer-sticky">
                      <div className="pin-composer-avatar">
                        {(localStorage.getItem("username") || "A").charAt(0).toUpperCase()}
                      </div>
                      <input
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handlePostComment(); } }}
                      />
                      <button className="pin-post-btn" onClick={handlePostComment}>Post</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Creator Bar */}
        {selectedEdit && creatorEdits.length > 0 && (
          <div className="creator-bar-section">
            <h3 className="creator-bar-heading">More by <span className="creator-bar-handle">{selectedEdit.creator}</span></h3>
            <div className="creator-bar-grid">
              {creatorEdits.map(edit => (
                <motion.div
                  key={edit.id}
                  className="creator-bar-card"
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedEdit(edit)}
                >
                  <div className="creator-bar-thumb" style={{ aspectRatio: edit.aspectRatio }}>
                    {edit.cover ? <img src={edit.cover} alt={edit.title} /> : <div className="creator-bar-fallback"><Play size={20} /></div>}
                    <div className="creator-bar-overlay">
                      <Play size={16} fill="currentColor" />
                    </div>
                  </div>
                  <div className="creator-bar-info">
                    <strong>{edit.title}</strong>
                    <span><Heart size={10} /> {formatCount(edit.likes)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Modal */}
        <AnimatePresence>
          {isUploadOpen && (
            <div className="modal-overlay" onClick={resetUpload}>
              <motion.div
                className="upload-modal"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-head">
                  <h2>{uploadStep === "trim" ? "Trim Your Video" : "Upload Edit"}</h2>
                  <button onClick={resetUpload}><X size={20} /></button>
                </div>

                <form className="modal-body" onSubmit={handleUploadSubmit}>
                  {uploadStep === "trim" && videoFile ? (
                    <div className="trimmer-section">
                      <p className="trimmer-note">
                        Your video is <strong>{Math.round(videoDuration)}s</strong> long.<br />
                        Select a <strong>40-second window</strong> below.
                      </p>
                      <div className="trimmer-preview">
                        <video src={URL.createObjectURL(videoFile)} className="trimmer-preview-video" controls />
                      </div>
                      <div className="trimmer-sliders">
                        <label>
                          Start: {Math.round(trimStart)}s
                          <input
                            type="range"
                            min={0}
                            max={Math.max(0, videoDuration - 40)}
                            step={0.5}
                            value={trimStart}
                            onChange={(e) => {
                              const s = parseFloat(e.target.value);
                              setTrimStart(s);
                              if (trimEnd - s > 40) setTrimEnd(s + 40);
                            }}
                          />
                        </label>
                        <label>
                          End: {Math.round(trimEnd)}s ({Math.round(trimEnd - trimStart)}s)
                          <input
                            type="range"
                            min={trimStart + 1}
                            max={videoDuration}
                            step={0.5}
                            value={trimEnd}
                            onChange={(e) => {
                              const en = parseFloat(e.target.value);
                              if (en - trimStart > 40) setTrimStart(en - 40);
                              setTrimEnd(en);
                            }}
                          />
                        </label>
                      </div>
                      <div className="trimmer-actions">
                        <button type="button" className="upload-cancel-btn" onClick={() => { setTrimStart(0); setTrimEnd(Math.min(40, videoDuration)); setUploadStep("form"); }}>Back</button>
                        <button type="button" className="upload-confirm-btn" onClick={() => setUploadStep("form")}>Done</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="field">
                        <label>Video</label>
                        <div className="upload-video-input">
                          <input type="file" accept="video/*" onChange={(e) => handleFileSelect(e.target.files[0])} id="video-upload" hidden />
                          {videoFile ? (
                            <div className="upload-file-preview">
                              <video src={URL.createObjectURL(videoFile)} controls className="upload-preview-video" />
                              <button type="button" className="upload-remove-file" onClick={() => { setVideoFile(null); setVideoDuration(0); }}>
                                <X size={14} /> Remove
                              </button>
                            </div>
                          ) : (
                            <label htmlFor="video-upload" className="upload-video-label">
                              <Plus size={24} />
                              <span>Choose video file</span>
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="field">
                        <label>Cover Image (optional)</label>
                        <div className="upload-cover-input">
                          <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} id="cover-upload" hidden />
                          {coverFile ? (
                            <div className="upload-file-preview cover-preview">
                              <img src={URL.createObjectURL(coverFile)} alt="Cover" className="upload-preview-cover" />
                              <button type="button" className="upload-remove-file" onClick={() => setCoverFile(null)}>
                                <X size={14} /> Remove
                              </button>
                            </div>
                          ) : (
                            <label htmlFor="cover-upload" className="upload-video-label cover-label">
                              <Plus size={20} />
                              <span>Choose cover image</span>
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="field">
                        <label>Title</label>
                        <input placeholder="Edit title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
                      </div>

                      <div className="field">
                        <label>Anime</label>
                        <select value={newAnime} onChange={(e) => setNewAnime(e.target.value)}>
                          <option value="">Select anime</option>
                          {allAnimeTitles.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>

                      <div className="field">
                        <label>Hashtags (space separated, max 5)</label>
                        <input placeholder="#AnimeEdit #EpicEdit" value={newHashtags} onChange={(e) => setNewHashtags(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} />
                      </div>

                      {videoDuration > 0 && (
                        <div className="upload-duration-info">
                          <Clock size={14} />
                          <span>
                            Duration: {Math.round(videoDuration)}s
                            {videoDuration > 40 && <span className="duration-warning"> — exceeds 40s, will be trimmed</span>}
                          </span>
                        </div>
                      )}

                      <div className="modal-footer">
                        <button type="button" className="upload-cancel-btn" onClick={resetUpload}>Cancel</button>
                        <button type="submit" className="upload-confirm-btn" disabled={submitting || !newTitle || !videoFile}>
                          {submitting ? "Uploading..." : "Upload Edit"}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </>
      )}
    </div>
    </AnimatedPage>
  );
}
