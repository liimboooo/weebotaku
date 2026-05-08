import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Eye,
  Heart,
  MessageSquare,
  Play,
  Music,
  Sparkles,
  Star,
  Zap,
  X,
  Plus,
  Search,
  Users,
  Globe,
  Link2,
  Video,
  Share2
} from "lucide-react";
import AnimatedPage from "../../components/AnimatedPage";
import Header from "../../components/Header";
import Background from "../../components/Background";
import "./AMVsEdits.css";

// Re-using logic from WatchTogetherCreative
function getEmbedSource(urlString) {
  if (!urlString) return null;
  // Handle blob URLs for local uploads
  if (urlString.startsWith("blob:")) {
    return {
      kind: "video",
      url: urlString,
      title: "Local Upload",
    };
  }
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
          title: "YouTube edit",
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

const initialAMVs = [
  {
    id: 1,
    title: "Domain Expansion",
    creator: "@kuroline",
    anime: "Jujutsu Kaisen",
    image: "/beta-1.jpg",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Placeholder
    category: "Hard Edit",
    likes: 14200,
    comments: 412,
    note: "Sync-heavy composition with a neon pulse and brutal transitions.",
    bitrate: "8500",
    resolution: "4K"
  },
  {
    id: 2,
    title: "King of Pirates",
    creator: "@saltstrokes",
    anime: "One Piece",
    image: "/beta-2.jpg",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    category: "Story",
    likes: 22800,
    comments: 901,
    note: "A cinematic tribute built around motion blur and emotional peaks.",
    bitrate: "6000",
    resolution: "1080p"
  },
  {
    id: 3,
    title: "The Final Stand",
    creator: "@noircanvas",
    anime: "Attack on Titan",
    image: "/beta-3.jpg",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    category: "VFX",
    likes: 10700,
    comments: 278,
    note: "A monochrome masterpiece with dynamic shakes and custom glow effects.",
    bitrate: "12000",
    resolution: "4K"
  },
];

const categories = ["All", "Hard Edit", "Story", "VFX", "Technique", "Atmospheric"];

export default function AMVsEdits() {
  const [amvs, setAmvs] = useState(initialAMVs);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAmv, setSelectedAmv] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [likedAmvs, setLikedAmvs] = useState([]);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [uploadType, setUploadType] = useState("url"); // "url" or "local"
  const [newUrl, setNewUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [newAnime, setNewAnime] = useState("Other");
  const [newCategory, setNewCategory] = useState("Hard Edit");

  const filteredAmvs = amvs.filter(amv => {
    const matchesFilter = activeFilter === "All" || amv.category === activeFilter;
    const matchesSearch = amv.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          amv.anime.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          amv.creator.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleResonate = (id) => {
    if (likedAmvs.includes(id)) {
      setLikedAmvs(likedAmvs.filter(i => i !== id));
      setAmvs(amvs.map(a => a.id === id ? { ...a, likes: a.likes - 1 } : a));
    } else {
      setLikedAmvs([...likedAmvs, id]);
      setAmvs(amvs.map(a => a.id === id ? { ...a, likes: a.likes + 1 } : a));
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!newTitle) return;
    if (uploadType === "url" && !newUrl) return;
    if (uploadType === "local" && !videoFile) return;

    let finalUrl = newUrl;
    let finalImage = "/beta-1.jpg";

    if (uploadType === "local" && videoFile) {
      finalUrl = URL.createObjectURL(videoFile);
    }
    if (coverFile) {
      finalImage = URL.createObjectURL(coverFile);
    }

    const newAmv = {
      id: Date.now(),
      title: newTitle,
      creator: "@zabi", // Default user
      anime: newAnime,
      image: finalImage,
      sourceUrl: finalUrl,
      category: newCategory,
      likes: 0,
      comments: 0,
      note: "Newly uplinked signal. Awaiting community sync.",
      bitrate: "Local",
      resolution: "Local"
    };

    setAmvs([newAmv, ...amvs]);
    setIsUploadOpen(false);
    // Reset form
    setNewTitle("");
    setNewUrl("");
    setVideoFile(null);
    setCoverFile(null);
    setUploadType("url");
  };

  const currentSource = selectedAmv ? getEmbedSource(selectedAmv.sourceUrl) : null;

  // Cleanup effect for blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      amvs.forEach(amv => {
        if (amv.sourceUrl && amv.sourceUrl.startsWith("blob:")) {
          URL.revokeObjectURL(amv.sourceUrl);
        }
        if (amv.image && amv.image.startsWith("blob:")) {
          URL.revokeObjectURL(amv.image);
        }
      });
    };
  }, [amvs]);

  return (
    <AnimatedPage>
      <div className="zenith-amv-page">
        <Background />
        <Header />

        <main className="zenith-amv-shell">
          {/* Neural Hero Section */}
          <motion.section 
            className="zenith-amv-hero"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="hero-content">
              <span className="zenith-eyebrow"><Zap size={14} /> Neural Uplink Active</span>
              <h1>
                <span className="zenith-title-small">Zenith</span>
                <span className="zenith-title-big">Studio</span>
              </h1>
              <p className="hero-desc">
                Command center for the collective's visual signal. High-bitrate AMVs, frame-perfect edits, 
                and cinematic tributes synced to the pulse of the community.
              </p>
              
              <div className="hero-actions">
                <button className="launch-btn" onClick={() => setIsUploadOpen(true)}>
                  <Plus size={18} /> Upload Signal
                </button>
                <div className="hero-metrics">
                  <div className="metric">
                    <strong>{amvs.length}</strong>
                    <span>Total Signals</span>
                  </div>
                  <div className="metric">
                    <strong>24.8k</strong>
                    <span>Daily Resonances</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="hero-visual">
              <div className="visual-orb" />
              <div className="visual-grid" />
              <div className="featured-ticker">
                <span className="ticker-label">LATEST DROP</span>
                <span className="ticker-text">{amvs[0].title} by {amvs[0].creator}</span>
              </div>
            </div>
          </motion.section>

          {/* Control Deck */}
          <section className="control-deck">
            <div className="search-module">
              <Search size={18} className="search-icon" />
              <input 
                placeholder="Search signals, editors, or anime..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-module">
              {categories.map(cat => (
                <button 
                  key={cat}
                  className={`filter-btn ${activeFilter === cat ? 'active' : ''}`}
                  onClick={() => setActiveFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {/* Signal Gallery */}
          <section className="signal-gallery">
            <AnimatePresence mode="popLayout">
              {filteredAmvs.map((amv) => (
                <motion.article 
                  key={amv.id}
                  className="signal-card"
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="card-thumb" onClick={() => setSelectedAmv(amv)}>
                    <img src={amv.image} alt={amv.title} />
                    <div className="card-overlay">
                      <div className="play-ring">
                        <Play size={24} fill="currentColor" />
                      </div>
                      <div className="technical-meta">
                        <span>{amv.resolution}</span>
                        <span>{amv.bitrate} kbps</span>
                      </div>
                    </div>
                    <div className="card-category-badge">{amv.category}</div>
                  </div>

                  <div className="card-content">
                    <div className="card-header">
                      <div>
                        <h3>{amv.title}</h3>
                        <span className="anime-name">{amv.anime}</span>
                      </div>
                      <span className="creator-tag">{amv.creator}</span>
                    </div>
                    <p className="card-desc">{amv.note}</p>
                    <div className="card-footer">
                      <div className="footer-actions">
                        <button 
                          className={`resonate-btn ${likedAmvs.includes(amv.id) ? 'active' : ''}`}
                          onClick={() => handleResonate(amv.id)}
                        >
                          <Heart size={16} fill={likedAmvs.includes(amv.id) ? "currentColor" : "none"} />
                          {amv.likes.toLocaleString()}
                        </button>
                        <button className="comm-btn">
                          <MessageSquare size={16} />
                          {amv.comments}
                        </button>
                      </div>
                      <button className="share-btn"><Share2 size={16} /></button>
                    </div>
                  </div>
                  <div className="card-glow" />
                </motion.article>
              ))}
            </AnimatePresence>
          </section>
        </main>

        {/* Video Player Modal */}
        <AnimatePresence>
          {selectedAmv && (
            <div className="modal-overlay" onClick={() => setSelectedAmv(null)}>
              <motion.div 
                className="player-modal"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-head">
                  <div className="head-info">
                    <span className="live-status"><span className="pulse-dot" /> SYNCED</span>
                    <h2>{selectedAmv.title}</h2>
                  </div>
                  <button className="close-btn" onClick={() => setSelectedAmv(null)}><X size={24} /></button>
                </div>

                <div className="player-body">
                  <div className="video-viewport">
                    {currentSource?.kind === "iframe" ? (
                      <iframe 
                        key={currentSource.url}
                        src={currentSource.url} 
                        title={currentSource.title} 
                        allow="autoplay; fullscreen" 
                      />
                    ) : (
                      <video 
                        key={currentSource?.url}
                        src={currentSource?.url} 
                        controls 
                        autoPlay 
                        onAbort={(e) => {
                          // Prevent fatal crash on aborts
                          if (process.env.NODE_ENV === 'development') {
                            console.warn("Media fetch aborted gracefully.");
                          }
                        }}
                      />
                    )}
                  </div>
                  
                  <div className="player-sidebar">
                    <div className="sidebar-section">
                      <label>Creator</label>
                      <div className="creator-profile">
                        <div className="avatar-placeholder">{selectedAmv.creator[1].toUpperCase()}</div>
                        <span>{selectedAmv.creator}</span>
                      </div>
                    </div>
                    <div className="sidebar-section">
                      <label>Technical Signal</label>
                      <div className="tech-grid">
                        <div className="tech-item"><Zap size={14} /> {selectedAmv.bitrate} kbps</div>
                        <div className="tech-item"><Globe size={14} /> {selectedAmv.resolution}</div>
                        <div className="tech-item"><Users size={14} /> {selectedAmv.likes.toLocaleString()} syncs</div>
                      </div>
                    </div>
                    <div className="sidebar-section">
                      <label>Editor's Note</label>
                      <p>{selectedAmv.note}</p>
                    </div>
                    <button className="resonate-action-btn" onClick={() => handleResonate(selectedAmv.id)}>
                      <Heart size={18} fill={likedAmvs.includes(selectedAmv.id) ? "currentColor" : "none"} />
                      {likedAmvs.includes(selectedAmv.id) ? "Synchronized" : "Resonate Signal"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Upload Modal */}
        <AnimatePresence>
          {isUploadOpen && (
            <div className="modal-overlay" onClick={() => setIsUploadOpen(false)}>
              <motion.div 
                className="upload-modal"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-head">
                  <h2>Initialize Uplink</h2>
                  <button onClick={() => setIsUploadOpen(false)}><X size={20} /></button>
                </div>
                <form className="modal-body" onSubmit={handleUploadSubmit}>
                  <div className="field">
                    <label>Edit Title</label>
                    <input 
                      placeholder="Signal designation..." 
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Upload Method</label>
                    <div className="filter-module" style={{ width: 'fit-content' }}>
                      <button 
                        type="button"
                        className={`filter-btn ${uploadType === 'url' ? 'active' : ''}`}
                        onClick={() => setUploadType('url')}
                      >URL Uplink</button>
                      <button 
                        type="button"
                        className={`filter-btn ${uploadType === 'local' ? 'active' : ''}`}
                        onClick={() => setUploadType('local')}
                      >Local Signal</button>
                    </div>
                  </div>

                  {uploadType === "url" ? (
                    <div className="field">
                      <label>Source URL</label>
                      <div className="input-with-icon">
                        <Link2 size={16} />
                        <input 
                          placeholder="YouTube, Twitch, or Direct link..." 
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          required={uploadType === "url"}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="field">
                      <label>Video File</label>
                      <div className="input-with-icon">
                        <Video size={16} />
                        <input 
                          type="file" 
                          accept="video/*"
                          onChange={(e) => setVideoFile(e.target.files[0])}
                          required={uploadType === "local"}
                          style={{ padding: '8px' }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="field">
                    <label>Cover Image (Optional)</label>
                    <div className="input-with-icon">
                      <Globe size={16} />
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setCoverFile(e.target.files[0])}
                        style={{ padding: '8px' }}
                      />
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label>Anime</label>
                      <select value={newAnime} onChange={(e) => setNewAnime(e.target.value)}>
                        <option>One Piece</option>
                        <option>Jujutsu Kaisen</option>
                        <option>Attack on Titan</option>
                        <option>Demon Slayer</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Category</label>
                      <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                        {categories.filter(c => c !== "All").map(c => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={() => setIsUploadOpen(false)}>Cancel</button>
                    <button type="submit" className="start-btn"><Zap size={16} /> Sync Signal</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
