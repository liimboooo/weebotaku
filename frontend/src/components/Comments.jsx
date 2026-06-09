import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle, Reply, ChevronDown, ChevronUp,
  MoreHorizontal, Pencil, Trash2, Check, Loader,
  ThumbsUp, ThumbsDown, Send
} from "lucide-react";
import {
  COMMENTS_SORT_OPTIONS as SORT_OPTIONS,
  COMMENTS_INITIAL_VISIBLE as INITIAL_VISIBLE,
  COMMENTS_LOAD_MORE_COUNT as LOAD_MORE_COUNT,
  COMMENTS_MAX_CHARS as MAX_CHARS,
  AVATAR_COLORS,
} from "../utils/constants";
import "./Comments.css";

function getInitials(name) {
  return name
    .split(/[\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
}

function CommentAvatar({ name, avatar, size = 40 }) {
  const [imgError, setImgError] = useState(false);

  if (avatar && !imgError) {
    return (
      <img className="awc-avatar" src={avatar} alt={name} onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
    );
  }
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return (
    <div className="awc-avatar" style={{
      width: size, height: size,
      background: `linear-gradient(135deg, ${AVATAR_COLORS[idx]}, ${AVATAR_COLORS[(idx + 1) % AVATAR_COLORS.length]})`,
      fontSize: size * 0.4,
    }}>
      {getInitials(name)}
    </div>
  );
}

function formatTime(timeStr) {
  const num = parseInt(timeStr);
  if (!isNaN(num) && num > 1000000000000) {
    const diff = Date.now() - num;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }
  return timeStr || "Just now";
}

function formatExactTime(timeStr) {
  const num = parseInt(timeStr);
  if (!isNaN(num) && num > 1000000000000) {
    return new Date(num).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
  return timeStr;
}

function CommentItem({ comment, isOPCheck, onLike, onDislike, onEditComment, onDeleteComment, onPostReply, depth = 0, currentUser, parentUser }) {
  const navigate = useNavigate();
  const goProfile = () => { if (comment.user !== "Unknown" && comment.user !== "Guest") navigate(`/profile/${comment.user}`); };
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likes, setLikes] = useState(comment.likes || 0);
  const [dislikes, setDislikes] = useState(comment.dislikes || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isOwn = comment.user === currentUser;
  const isOP = comment.user !== currentUser && comment.user === (parentUser || comment.user);

  useEffect(() => {
    if (menuOpen) {
      const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [menuOpen]);

  const handleLike = () => {
    if (disliked) { setDisliked(false); setDislikes(d => d - 1); }
    if (!liked) { setLikes(l => l + 1); setLiked(true); onLike?.(comment.id); }
    else { setLikes(l => l - 1); setLiked(false); }
  };

  const handleDislike = () => {
    if (liked) { setLiked(false); setLikes(l => l - 1); }
    if (!disliked) { setDislikes(d => d + 1); setDisliked(true); onDislike?.(comment.id); }
    else { setDislikes(d => d - 1); setDisliked(false); }
  };

  const handleReplyPost = () => {
    if (!replyText.trim()) return;
    onPostReply?.(comment.id, replyText);
    setReplyText("");
    setReplying(false);
  };

  return (
    <>
      {showDeleteConfirm && (
        <div className="awc-dialog-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="awc-dialog" onClick={e => e.stopPropagation()}>
            <p className="awc-dialog-text">Delete this comment?</p>
            <div className="awc-dialog-actions">
              <button className="awc-dialog-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="awc-dialog-btn awc-dialog-btn-danger" onClick={() => { onDeleteComment?.(comment.id); setShowDeleteConfirm(false); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <div className={`awc-item ${depth > 0 ? "awc-reply" : ""}`} id={`comment-${comment.id}`}>
        {depth === 0 && (
          <div className="awc-item-gutter">
            <div className="awc-avatar-click" onClick={goProfile} style={{ cursor: 'pointer' }}>
              <CommentAvatar name={comment.user} avatar={comment.avatar} size={40} />
            </div>
          </div>
        )}
        <div className="awc-body">
          <div className="awc-top">
            {depth > 0 && <div className="awc-avatar-click" onClick={goProfile} style={{ cursor: 'pointer' }}><CommentAvatar name={comment.user} avatar={comment.avatar} size={20} /></div>}
            <span className="awc-user-click" onClick={goProfile} style={{ cursor: 'pointer' }}>{comment.user}</span>
            {depth > 0 && parentUser && <span className="awc-reply-to">@{parentUser}</span>}
            <span className="awc-time" title={formatExactTime(comment.time)}>{formatTime(comment.time)}</span>
            <div className="awc-options-wrap">
              <button className="awc-options-btn" onClick={() => setMenuOpen(o => !o)} title="More"><MoreHorizontal size={16} /></button>
              {menuOpen && (
                <div className="awc-options-menu" ref={menuRef}>
                  {isOwn && (
                    <>
                      <button className="awc-options-item" onClick={() => { setEditing(true); setMenuOpen(false); }}><Pencil size={12} /> Edit</button>
                      <button className="awc-options-item awc-options-item-danger" onClick={() => { setShowDeleteConfirm(true); setMenuOpen(false); }}><Trash2 size={12} /> Delete</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {editing ? (
            <div className="awc-edit-wrap">
              <input className="awc-edit-input" type="text" value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && editText.trim()) { onEditComment?.(comment.id, editText); setEditing(false); }
                  if (e.key === "Escape") { setEditing(false); setEditText(comment.text || ""); }
                }}
                autoFocus />
            </div>
          ) : (
            <p className="awc-text">{comment.text}</p>
          )}

          <div className="awc-actions">
            <button className={`awc-action ${liked ? "liked" : ""}`} onClick={handleLike}>
              <ThumbsUp size={16} fill={liked ? "currentColor" : "none"} />
              {likes > 0 && <span>{likes}</span>}
            </button>
            <button className={`awc-action ${disliked ? "disliked" : ""}`} onClick={handleDislike}>
              <ThumbsDown size={16} fill={disliked ? "currentColor" : "none"} />
              {dislikes > 0 && <span>{dislikes}</span>}
            </button>
            <button className="awc-action" onClick={() => setReplying(r => !r)}>
              <Reply size={16} /> Reply
            </button>
          </div>

          {replying && (
            <div className="awc-reply-input-row">
              <div className="awc-reply-input-main">
                <input className="awc-reply-input-field" type="text"
                  placeholder={`Reply to @${comment.user}...`}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleReplyPost()}
                  autoFocus />
                <div className="awc-reply-input-bar">
                  <button className="awc-reply-cancel-sm" onClick={() => setReplying(false)}>Cancel</button>
                  <button className="awc-reply-post-sm" onClick={handleReplyPost} disabled={!replyText.trim()}>
                    <Send size={11} /> Reply
                  </button>
                </div>
              </div>
            </div>
          )}

          {(comment.replies?.length || 0) > 0 && (
            <>
              <button className="awc-reply-toggle" onClick={() => setShowReplies(s => !s)}>
                {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
              </button>
              {showReplies && (
                <div className="awc-replies">
                  {comment.replies.map(r => (
                    <CommentItem key={r.id} comment={r} isOPCheck={isOPCheck}
                      onLike={onLike} onDislike={onDislike}
                      onEditComment={onEditComment} onDeleteComment={onDeleteComment}
                      onPostReply={onPostReply} depth={depth + 1}
                      currentUser={currentUser} parentUser={comment.user} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function deleteCommentDeep(list, id) {
  return list.reduce((acc, cm) => {
    if (cm.id === id) return acc;
    const updated = cm.replies?.length ? { ...cm, replies: deleteCommentDeep(cm.replies, id) } : cm;
    acc.push(updated);
    return acc;
  }, []);
}

function editCommentDeep(list, id, newText) {
  return list.map(cm => {
    if (cm.id === id) return { ...cm, text: newText };
    if (cm.replies?.length) return { ...cm, replies: editCommentDeep(cm.replies, id, newText) };
    return cm;
  });
}

export default function Comments({ comments: externalComments, setComments, currentUser = "You", currentAvatar = "", isLoggedIn = false, onSeek, onAdd, onLikeComment, onDislikeComment, onReplyComment, onEditComment: onEditCommentApi, onDeleteComment: onDeleteCommentApi, loading: commentsLoading }) {
  const navigate = useNavigate();
  const [sort, setSort] = useState("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [text, setText] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const sortRef = useRef(null);

  const list = externalComments || [];

  useEffect(() => {
    const handler = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false); };
    if (sortOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  const sorted = useMemo(() => {
    if (sort === "top") return [...list].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    return list;
  }, [list, sort]);

  const visible = sorted.slice(0, visibleCount);
  const remaining = Math.max(0, sorted.length - visibleCount);
  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label || "Newest";

  const handleAdd = async () => {
    if (!text.trim() || !isLoggedIn || posting) return;
    setPosting(true);
    try {
      if (onAdd) await onAdd(text);
      else setComments?.(c => [{ id: Date.now(), user: currentUser, text, time: Date.now().toString(), likes: 0, dislikes: 0, replies: [] }, ...c]);
      setText("");
      setPosted(true);
      setTimeout(() => setPosted(false), 3000);
    } catch (e) { console.error('[AnimeWch] Comment post failed:', e); }
    setPosting(false);
  };

  const handlePostReply = useCallback(async (parentId, content) => {
    try { await onReplyComment?.(parentId, content); }
    catch (e) { console.error('[AnimeWch] Reply failed:', e); }
  }, [onReplyComment]);

  const handleLike = useCallback(async (id) => { await onLikeComment?.(id); }, [onLikeComment]);
  const handleDislike = useCallback(async (id) => { await onDislikeComment?.(id); }, [onDislikeComment]);

  const handleEdit = useCallback(async (id, newText) => {
    await onEditCommentApi?.(id, newText);
    setComments?.(c => editCommentDeep(c, id, newText));
  }, [setComments, onEditCommentApi]);

  const handleDelete = useCallback(async (id) => {
    await onDeleteCommentApi?.(id);
    setComments?.(c => deleteCommentDeep(c, id));
  }, [setComments, onDeleteCommentApi]);

  return (
    <section className="awc">
      <div className="awc-header">
        <div className="awc-header-left">
          <MessageCircle size={16} />
          <span>Comments</span>
          <span className="awc-count-badge">{list.length}</span>
        </div>
        <div className="awc-sort-wrap" ref={sortRef}>
          <button className="awc-sort-btn" onClick={() => setSortOpen(o => !o)}>
            {currentSortLabel} <ChevronDown size={12} />
          </button>
          {sortOpen && (
            <div className="awc-sort-dropdown">
              {SORT_OPTIONS.map(o => (
                <button key={o.key} className={`awc-sort-option ${sort === o.key ? "active" : ""}`}
                  onClick={() => { setSort(o.key); setSortOpen(false); }}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="awc-input-box">
        <div className="awc-avatar-click" onClick={() => { if (isLoggedIn) navigate('/profile'); }} style={{ cursor: 'pointer' }}>
          <CommentAvatar name={currentUser} avatar={currentAvatar} size={40} />
        </div>
        <div className="awc-input-main">
          <input className="awc-input-field" type="text"
            placeholder={isLoggedIn ? "Add comment..." : "Login to comment..."}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            disabled={posting || !isLoggedIn}
            maxLength={MAX_CHARS} />
          <div className="awc-input-bar">
            <span className={`awc-input-chars ${text.length > MAX_CHARS * 0.9 ? "warn" : ""}`}>
              {text.length}/{MAX_CHARS}
            </span>
            <button className="awc-submit-btn" onClick={handleAdd} disabled={!text.trim() || posting}>
              {posting ? <Loader size={13} className="awc-spin" /> : <Send size={13} />}
              Submit
            </button>
          </div>
        </div>
      </div>

      {posted && (
        <div className="awc-success-banner">
          <Check size={12} /> Comment posted
        </div>
      )}

      <div className="awc-list">
        {visible.map(cm => (
          <CommentItem key={cm.id} comment={cm}
            isOPCheck={() => false}
            onLike={handleLike} onDislike={handleDislike}
            onEditComment={handleEdit} onDeleteComment={handleDelete}
            onPostReply={handlePostReply} depth={0}
            currentUser={currentUser} parentUser={null} />
        ))}
      </div>

      {visible.length > 0 && remaining > 0 && (
        <button className="awc-load-more" onClick={() => setVisibleCount(c => c + LOAD_MORE_COUNT)}>
          <ChevronDown size={12} />
          <span>Load {Math.min(remaining, LOAD_MORE_COUNT)} more</span>
        </button>
      )}
    </section>
  );
}
