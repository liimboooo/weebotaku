import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedPage from "../../components/AnimatedPage";
import communityService from "../../services/communityService";
import authService from "../../services/authService";
import {
  Plus, Heart, MessageCircle, Eye, Trash2, Edit3, X,
  Send, TrendingUp, Clock, ThumbsUp, Hash, MoreHorizontal,
  Image as ImageIcon, Link as LinkIcon, ChevronDown,
} from "lucide-react";
import "./CommunityPage.css";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "discussion", label: "Discussion" },
  { key: "review", label: "Reviews" },
  { key: "recommendation", label: "Recs" },
  { key: "meme", label: "Memes" },
  { key: "fanart", label: "Fan Art" },
  { key: "question", label: "Questions" },
];

const SORTS = [
  { key: "recent", label: "Recent", icon: Clock },
  { key: "trending", label: "Trending", icon: TrendingUp },
  { key: "most_liked", label: "Most Liked", icon: ThumbsUp },
];

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(date).toLocaleDateString();
}

function PostCard({ post, currentUserId, onLike, onDelete, onComment, onNavigateProfile }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const liked = post.likes?.includes(currentUserId);
  const user = post.user || {};

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    await onComment(post._id, commentText.trim());
    setCommentText("");
    setSubmitting(false);
  };

  return (
    <motion.div
      className="cm-post"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      layout
    >
      <div className="cm-post-header">
        <div
          className="cm-post-author"
          onClick={() => onNavigateProfile(user.username)}
        >
          {user.avatar ? (
            <img src={user.avatar} alt={user.username} className="cm-post-avatar" />
          ) : (
            <div className="cm-post-avatar cm-post-avatar--fallback">
              {user.username?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <span className="cm-post-username">{user.username || "Unknown"}</span>
            <span className="cm-post-time">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        <div className="cm-post-meta">
          <span className="cm-post-category">{post.category}</span>
          {post.user?._id === currentUserId && (
            <button className="cm-post-delete" onClick={() => onDelete(post._id)} aria-label="Delete">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <h3 className="cm-post-title">{post.title}</h3>
      <p className="cm-post-content">{post.content}</p>

      {post.images?.length > 0 && (
        <div className="cm-post-images">
          {post.images.map((img, i) => (
            <img key={i} src={img} alt="" className="cm-post-image" loading="lazy" />
          ))}
        </div>
      )}

      {post.tags?.length > 0 && (
        <div className="cm-post-tags">
          {post.tags.map(tag => (
            <span key={tag} className="cm-post-tag"><Hash size={11} />{tag}</span>
          ))}
        </div>
      )}

      <div className="cm-post-actions">
        <button className={`cm-action ${liked ? "cm-action--liked" : ""}`} onClick={() => onLike(post._id)}>
          <Heart size={16} fill={liked ? "currentColor" : "none"} />
          <span>{post.likes?.length || 0}</span>
        </button>
        <button className="cm-action" onClick={() => setShowComments(!showComments)}>
          <MessageCircle size={16} />
          <span>{post.comments?.length || 0}</span>
        </button>
        <div className="cm-action cm-action--static">
          <Eye size={16} />
          <span>{post.views || 0}</span>
        </div>
      </div>

      {showComments && (
        <div className="cm-comments">
          {post.comments?.map(c => {
            const cu = c.user || {};
            return (
              <div key={c._id} className="cm-comment">
                <div className="cm-comment-avatar-wrap" onClick={() => onNavigateProfile(cu.username)}>
                  {cu.avatar ? (
                    <img src={cu.avatar} alt={cu.username} className="cm-comment-avatar" />
                  ) : (
                    <div className="cm-comment-avatar cm-comment-avatar--fallback">
                      {cu.username?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="cm-comment-body">
                  <span className="cm-comment-user">{cu.username}</span>
                  <span className="cm-comment-text">{c.content}</span>
                  <span className="cm-comment-time">{timeAgo(c.createdAt)}</span>
                </div>
              </div>
            );
          })}
          {currentUserId && (
            <form className="cm-comment-form" onSubmit={handleSubmitComment}>
              <input
                className="cm-comment-input"
                placeholder="Write a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                maxLength={2000}
              />
              <button type="submit" className="cm-comment-submit" disabled={!commentText.trim() || submitting}>
                <Send size={14} />
              </button>
            </form>
          )}
        </div>
      )}
    </motion.div>
  );
}

function CreatePostModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("discussion");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    await onCreate({ title: title.trim(), content: content.trim(), category, tags });
    setLoading(false);
  };

  return (
    <motion.div
      className="cm-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="cm-modal"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="cm-modal-head">
          <h3>Create Post</h3>
          <button className="cm-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="cm-modal-body">
          <input
            className="cm-input"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            required
          />
          <textarea
            className="cm-textarea"
            placeholder="What's on your mind?"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            maxLength={10000}
            required
          />
          <select className="cm-select" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.filter(c => c.key !== "all").map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <div className="cm-tag-input-row">
            <input
              className="cm-input cm-input--tag"
              placeholder="Add tag..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              maxLength={30}
            />
            {tags.map(t => (
              <span key={t} className="cm-tag-chip" onClick={() => setTags(tags.filter(x => x !== t))}>
                #{t} <X size={10} />
              </span>
            ))}
          </div>
          <div className="cm-modal-foot">
            <button type="button" className="cm-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="cm-btn-primary" disabled={loading || !title.trim() || !content.trim()}>
              {loading ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPosts = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (category !== "all") params.category = category;
      if (sort !== "recent") params.sort = sort;

      let res;
      if (sort === "trending") {
        res = await communityService.getTrending();
      } else {
        res = await communityService.getAllPosts(params);
      }

      if (reset || p === 1) {
        setPosts(res.data || []);
        if (reset) setPage(1);
      } else {
        setPosts(prev => [...prev, ...(res.data || [])]);
      }
      setHasMore(p < (res.pages || 1));
    } catch {
      if (reset || p === 1) setPosts([]);
    }
    setLoading(false);
  }, [category, sort, page]);

  useEffect(() => { fetchPosts(true); }, [category, sort]);
  useEffect(() => { if (page > 1) fetchPosts(); }, [page]);

  const handleCreate = async (data) => {
    try {
      const res = await communityService.createPost(data);
      if (res.success) {
        setPosts(prev => [res.data, ...prev]);
        setShowCreate(false);
      }
    } catch {}
  };

  const handleLike = async (postId) => {
    try {
      const res = await communityService.likePost(postId);
      if (res.success) {
        setPosts(prev => prev.map(p => {
          if (p._id !== postId) return p;
          const likes = [...(p.likes || [])];
          if (res.liked) { likes.push(currentUserId); }
          else { const i = likes.indexOf(currentUserId); if (i > -1) likes.splice(i, 1); }
          return { ...p, likes };
        }));
      }
    } catch {}
  };

  const handleDelete = async (postId) => {
    try {
      await communityService.deletePost(postId);
      setPosts(prev => prev.filter(p => p._id !== postId));
    } catch {}
  };

  const handleComment = async (postId, text) => {
    try {
      const res = await communityService.addComment(postId, text);
      if (res.success) {
        setPosts(prev => prev.map(p => {
          if (p._id !== postId) return p;
          return { ...p, comments: [...(p.comments || []), res.data] };
        }));
      }
    } catch {}
  };

  return (
    <AnimatedPage>
      <div className="cm-page">
        <div className="cm-container">
          <div className="cm-header">
            <div>
              <h1 className="cm-title">Community</h1>
              <p className="cm-subtitle">Share, discuss, and connect with other anime fans</p>
            </div>
            {currentUserId && (
              <button className="cm-create-btn" onClick={() => setShowCreate(true)}>
                <Plus size={16} /> New Post
              </button>
            )}
          </div>

          <div className="cm-toolbar">
            <div className="cm-categories">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  className={`cm-cat ${category === c.key ? "active" : ""}`}
                  onClick={() => setCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="cm-sorts">
              {SORTS.map(s => (
                <button
                  key={s.key}
                  className={`cm-sort ${sort === s.key ? "active" : ""}`}
                  onClick={() => setSort(s.key)}
                >
                  <s.icon size={13} /> {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cm-feed">
            {loading && posts.length === 0 ? (
              <div className="cm-loading">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="cm-skeleton-post">
                    <div className="cm-skeleton-header">
                      <div className="cm-skeleton-circle" />
                      <div className="cm-skeleton-lines">
                        <div className="cm-skeleton-line cm-skeleton-line--short" />
                        <div className="cm-skeleton-line cm-skeleton-line--xs" />
                      </div>
                    </div>
                    <div className="cm-skeleton-line cm-skeleton-line--long" />
                    <div className="cm-skeleton-line cm-skeleton-line--med" />
                  </div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {posts.map(post => (
                  <PostCard
                    key={post._id}
                    post={post}
                    currentUserId={currentUserId}
                    onLike={handleLike}
                    onDelete={handleDelete}
                    onComment={handleComment}
                    onNavigateProfile={(u) => u && navigate(`/profile/${u}`)}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <div className="cm-empty">
                <MessageCircle size={48} />
                <h3>No posts yet</h3>
                <p>Be the first to start a conversation!</p>
                {currentUserId && (
                  <button className="cm-create-btn" onClick={() => setShowCreate(true)}>
                    <Plus size={14} /> Create Post
                  </button>
                )}
              </div>
            )}

            {hasMore && !loading && (
              <button className="cm-load-more" onClick={() => setPage(p => p + 1)}>
                Load More
              </button>
            )}
            {loading && posts.length > 0 && (
              <div className="cm-loading-more">Loading...</div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showCreate && (
            <CreatePostModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
