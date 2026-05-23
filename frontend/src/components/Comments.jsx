import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, Reply, Pin, EyeOff, AlertCircle,
  X, ArrowLeft, Heart, ChevronDown, ChevronUp, Flag, Clock,
  MoreHorizontal, Pencil, Trash2, Share2, Check, Loader, Copy
} from "lucide-react";
import "./Comments.css";

const SORT_TABS = [
  { key: "top", label: "Top" },
  { key: "newest", label: "Newest" },
  { key: "liked", label: "Most Liked" },
];

const INITIAL_VISIBLE = 5;
const LOAD_MORE_COUNT = 5;
const MAX_CHARS = 500;

const AVATAR_COLORS = [
  "#a855f7", "#ec4899", "#3b82f6", "#06b6d4",
  "#8b5cf6", "#f59e0b", "#10b981", "#ef4444",
];

const USER_ROLES = {
  "AnimeKing": { color: "#a855f7", role: "OP", badgeBg: "rgba(168,85,247,0.15)" },
  "OtakuPro": { color: "#06b6d4", role: "VERIFIED", badgeBg: "rgba(6,182,212,0.15)" },
  "MangaReader": { color: "#f59e0b", role: "CONTRIBUTOR", badgeBg: "rgba(245,158,11,0.15)" },
  "NightWatcher": { color: "#a0a0ab", role: null, badgeBg: null },
};

function getInitials(name) {
  return name
    .split(/[\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
}

function formatTimestamp(timeStr) {
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

function getExactTime(timeStr) {
  const num = parseInt(timeStr);
  if (!isNaN(num) && num > 1000000000000) {
    return new Date(num).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
  return timeStr;
}

function CommentAvatar({ name, size = 30 }) {
  const initials = getInitials(name);
  const colorIndex = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return (
    <div
      className="awc-avatar"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${AVATAR_COLORS[colorIndex]}, ${AVATAR_COLORS[(colorIndex + 1) % AVATAR_COLORS.length]})`,
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
}

function OptionsMenu({ isOwn, onEdit, onDelete, onReport, onShare, onCopyLink }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !btnRef.current?.contains(e.target))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      const first = menuRef.current?.querySelector("button");
      first?.focus();
    }
  }, [open]);

  return (
    <div className="awc-options-wrap">
      <button ref={btnRef} className="awc-options-btn" onClick={() => setOpen(o => !o)} title="More" aria-label="More options" aria-expanded={open}>
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="awc-options-menu" ref={menuRef} role="menu">
          {isOwn && (
            <>
              <button className="awc-options-item" role="menuitem" onClick={() => { onEdit?.(); setOpen(false); }}>
                <Pencil size={12} /> Edit
              </button>
              <button className="awc-options-item awc-options-item-danger" role="menuitem" onClick={() => { onDelete?.(); setOpen(false); }}>
                <Trash2 size={12} /> Delete
              </button>
            </>
          )}
          <button className="awc-options-item" role="menuitem" onClick={() => { onCopyLink?.(); setOpen(false); }}>
            <Copy size={12} /> Copy Link
          </button>
          <button className="awc-options-item" role="menuitem" onClick={() => { onReport?.(); setOpen(false); }}>
            <Flag size={12} /> Report
          </button>
          <button className="awc-options-item" role="menuitem" onClick={() => { onShare?.(); setOpen(false); }}>
            <Share2 size={12} /> Share
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="awc-dialog-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="awc-dialog" ref={dialogRef} onClick={e => e.stopPropagation()}>
        <p className="awc-dialog-text">{message}</p>
        <div className="awc-dialog-actions">
          <button className="awc-dialog-btn" onClick={onCancel}>Cancel</button>
          <button className="awc-dialog-btn awc-dialog-btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function SpoilerContent({ revealed, onReveal, text }) {
  if (!revealed) {
    return (
      <div className="awc-spoiler-blur" onClick={onReveal} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onReveal()}>
        <AlertCircle size={14} />
        <span>Spoiler — Click to reveal</span>
        <EyeOff size={12} className="awc-spoiler-eye" />
      </div>
    );
  }
  return <p className="awc-text">{text}</p>;
}

function CommentItem({ comment, isOPCheck, isVerifiedCheck, onLike, onEditComment, onDeleteComment, onReply, depth = 0, currentUser, parentUser }) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(comment.likes || 0);
  const [showReplies, setShowReplies] = useState(true);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);
  const replyInputRef = useRef(null);
  const editInputRef = useRef(null);

  const isOwn = comment.user === currentUser;
  const userRole = USER_ROLES[comment.user] || { color: "#a0a0ab", role: null, badgeBg: null };
  const isOP = isOPCheck(comment.user);
  const isVerified = isVerifiedCheck(comment.user);
  const badge = isOP
    ? { label: "OP", color: "#a855f7", bg: "rgba(168,85,247,0.15)", tip: "Original Poster" }
    : isVerified
      ? { label: "Verified", color: "#06b6d4", bg: "rgba(6,182,212,0.15)", tip: "Verified User" }
      : userRole.role
        ? { label: userRole.role, color: userRole.color, bg: userRole.badgeBg, tip: userRole.role }
        : null;

  useEffect(() => {
    if (showReplyInput && replyInputRef.current) replyInputRef.current.focus();
  }, [showReplyInput]);

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [editing, editText.length]);

  const handleLike = () => {
    if (!liked) {
      setLikes(l => l + 1);
      setLiked(true);
      onLike?.(comment.id);
    }
  };

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    setPosting(true);
    setTimeout(() => {
      const newReply = {
        id: Date.now() + 1,
        user: currentUser,
        text: replyText,
        time: Date.now().toString(),
        likes: 0,
        replies: [],
      };
      onReply(comment.id, newReply);
      setReplyText("");
      setShowReplyInput(false);
      setPosting(false);
    }, 300);
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    onEditComment?.(comment.id, editText, depth > 0);
    setEditing(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const spoilerMatch = !comment.hasSpoiler && comment.text.match(/\|\|(.+?)\|\|/);
  const hasSpoiler = comment.hasSpoiler || !!spoilerMatch;
  const cleanText = spoilerMatch ? comment.text.replace(/\|\|(.+?)\|\|/g, "$1") : comment.text;

  return (
    <>
      {showDeleteConfirm && (
        <ConfirmDialog
          message="Are you sure you want to delete this comment?"
          onConfirm={() => { onDeleteComment?.(comment.id, depth > 0); setShowDeleteConfirm(false); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      <div
        className={`awc-item ${comment.pinned && depth === 0 ? "awc-pinned" : ""} ${depth > 0 ? "awc-reply" : ""}`}
        style={{ "--depth": depth }}
      >
        <div className="awc-item-gutter">
          {depth > 0 && <div className="awc-reply-line" />}
          <CommentAvatar name={comment.user} size={depth > 0 ? 24 : 30} />
        </div>
        <div className="awc-body">
          <div className="awc-top">
            <span className="awc-user" style={{ color: userRole.color }}>
              {comment.user}
            </span>
            {badge && (
              <span className="awc-badge" style={{ color: badge.color, background: badge.bg }} title={badge.tip}>
                {badge.label}
              </span>
            )}
            {depth > 0 && parentUser && (
              <span className="awc-reply-to">In reply to <strong>@{parentUser}</strong></span>
            )}
            <span className="awc-time" title={getExactTime(comment.time)}>
              <Clock size={9} />
              {formatTimestamp(comment.time)}
            </span>
            <OptionsMenu
              isOwn={isOwn}
              onEdit={() => setEditing(true)}
              onDelete={() => setShowDeleteConfirm(true)}
              onReport={() => {}}
              onShare={() => {}}
              onCopyLink={handleCopyLink}
            />
            {copied && <span className="awc-copied-hint"><Check size={9} /> Copied</span>}
          </div>

          {comment.pinned && depth === 0 && (
            <div className="awc-pin-badge"><Pin size={10} /> Pinned by moderator</div>
          )}

          {editing ? (
            <div className="awc-edit-wrap">
              <input
                ref={editInputRef}
                className="awc-edit-input"
                type="text"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") { setEditing(false); setEditText(comment.text || ""); }
                }}
              />
              <div className="awc-edit-actions">
                <button className="awc-edit-cancel" onClick={() => { setEditing(false); setEditText(comment.text || ""); }}>Cancel</button>
                <button className="awc-edit-save" onClick={handleSaveEdit} disabled={!editText.trim()}>
                  <Check size={11} /> Save
                </button>
              </div>
            </div>
          ) : hasSpoiler ? (
            <div className={`awc-spoiler ${spoilerRevealed ? "revealed" : ""}`}>
              <SpoilerContent revealed={spoilerRevealed} onReveal={() => setSpoilerRevealed(true)} text={cleanText} />
            </div>
          ) : (
            <p className="awc-text">{cleanText}</p>
          )}

          <div className="awc-actions">
            <button className={`awc-action ${liked ? "liked" : ""}`} onClick={handleLike}>
              <Heart size={11} fill={liked ? "currentColor" : "none"} /> {likes}
            </button>
            <button className="awc-action" onClick={() => setShowReplyInput(s => !s)}>
              <Reply size={11} /> Reply
            </button>
          </div>

          {showReplyInput && (
            <div className="awc-reply-input-wrap">
              <CommentAvatar name={currentUser} size={22} />
              <div className="awc-reply-input-inner">
                <input
                  ref={replyInputRef}
                  className="awc-reply-input"
                  type="text"
                  placeholder={`Reply to @${comment.user}...`}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !posting && handleReplySubmit()}
                  disabled={posting}
                  maxLength={MAX_CHARS}
                />
                <span className={`awc-reply-chars ${replyText.length > MAX_CHARS * 0.9 ? "warn" : ""}`}>
                  {replyText.length}/{MAX_CHARS}
                </span>
                <div className="awc-reply-btns">
                  <button className="awc-reply-cancel" onClick={() => { setShowReplyInput(false); setReplyText(""); }}>Cancel</button>
                  <button className="awc-reply-post" onClick={handleReplySubmit} disabled={!replyText.trim() || posting}>
                    {posting ? <Loader size={11} className="awc-spin" /> : <ArrowLeft size={11} style={{ transform: "rotate(90deg)" }} />}
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <>
              <button className="awc-reply-toggle" onClick={() => setShowReplies(s => !s)}>
                {showReplies ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {showReplies ? "Hide" : "Show"} {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
              </button>
              {showReplies && (
                <div className="awc-replies">
                  {comment.replies.map(r => (
                    <CommentItem
                      key={r.id}
                      comment={r}
                      isOPCheck={isOPCheck}
                      isVerifiedCheck={isVerifiedCheck}
                      onLike={onLike}
                      onEditComment={onEditComment}
                      onDeleteComment={onDeleteComment}
                      onReply={onReply}
                      depth={depth + 1}
                      currentUser={currentUser}
                      parentUser={comment.user}
                    />
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

export default function Comments({ comments: externalComments, setComments, currentUser = "You" }) {
  const [sort, setSort] = useState("top");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const inputRef = useRef(null);

  const comments = externalComments || [];

  const sorted = useMemo(() => {
    const pinned = comments.filter(c => c.pinned);
    const rest = comments.filter(c => !c.pinned);
    if (sort === "top") return [...pinned, ...rest.sort((a, b) => (b.likes || 0) - (a.likes || 0))];
    if (sort === "liked") return [...pinned, ...rest.sort((a, b) => ((b.likes || 0) - (b.dislikes || 0)) - ((a.likes || 0) - (a.dislikes || 0)))];
    return [...pinned, ...rest];
  }, [comments, sort]);

  const visibleComments = sorted.slice(0, visibleCount);
  const remaining = Math.max(0, sorted.length - visibleCount);

  const isOPCheck = useCallback((user) => {
    if (comments.length === 0) return false;
    const firstCommentUser = comments[0]?.user;
    return user === firstCommentUser && user !== currentUser;
  }, [comments, currentUser]);

  const isVerifiedCheck = useCallback((user) => {
    return user === "OtakuPro" || user === "AnimeKing";
  }, []);

  const handleAdd = () => {
    if (!text.trim()) return;
    setPosting(true);
    setTimeout(() => {
      const newComment = {
        id: Date.now(),
        user: currentUser,
        text: text,
        time: Date.now().toString(),
        likes: 0,
        replies: [],
        pinned: false,
      };
      setComments?.(c => [newComment, ...c]);
      setText("");
      setPosting(false);
      setPosted(true);
      setTimeout(() => setPosted(false), 3000);
    }, 400);
  };

  const handleReply = useCallback((parentId, reply) => {
    setComments?.(c => c.map(cm =>
      cm.id === parentId ? { ...cm, replies: [...cm.replies, reply] } : cm
    ));
  }, [setComments]);

  const handleLike = useCallback((id) => {
    setComments?.(c => c.map(cm =>
      cm.id === id
        ? { ...cm, likes: (cm.likes || 0) + 1 }
        : { ...cm, replies: cm.replies.map(r => r.id === id ? { ...r, likes: (r.likes || 0) + 1 } : r) }
    ));
  }, [setComments]);

  const handleEditComment = useCallback((id, newText, isReply) => {
    setComments?.(c => c.map(cm => {
      if (cm.id === id) return { ...cm, text: newText };
      return { ...cm, replies: cm.replies.map(r => r.id === id ? { ...r, text: newText } : r) };
    }));
  }, [setComments]);

  const handleDeleteComment = useCallback((id, isReply) => {
    setComments?.(c => {
      if (isReply) return c.map(cm => ({ ...cm, replies: cm.replies.filter(r => r.id !== id) }));
      return c.filter(cm => cm.id !== id);
    });
  }, [setComments]);

  const handleLoadMore = () => {
    setVisibleCount(c => c + LOAD_MORE_COUNT);
  };

  return (
    <section className="awc">
      <div className="awc-header">
        <div className="awc-header-left">
          <MessageCircle size={14} />
          <span>Comments</span>
          <span className="awc-badge-count">{comments.length}</span>
        </div>
        <div className="awc-sorts">
          {SORT_TABS.map(st => (
            <button key={st.key} className={`awc-sort ${sort === st.key ? "active" : ""}`} onClick={() => setSort(st.key)}>
              {st.label}
            </button>
          ))}
        </div>
      </div>

      <div className="awc-input-row">
        <CommentAvatar name={currentUser} size={30} />
        <div className="awc-input-wrap">
          <input
            ref={inputRef}
            className="awc-input"
            type="text"
            placeholder={replyTo ? "Write a reply..." : "Join the discussion..."}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !posting && handleAdd()}
            disabled={posting}
            maxLength={MAX_CHARS}
          />
          <span className={`awc-input-chars ${text.length > MAX_CHARS * 0.9 ? "warn" : ""}`}>
            {text.length}/{MAX_CHARS}
          </span>
          <div className="awc-input-actions">
            <button className="awc-input-btn" title="Send" onClick={handleAdd} disabled={!text.trim() || posting}>
              {posting ? <Loader size={12} className="awc-spin" /> : <ArrowLeft size={12} style={{ transform: "rotate(90deg)" }} />}
            </button>
          </div>
        </div>
      </div>

      {replyTo && (
        <div className="awc-reply-indicator">
          <Reply size={11} />
          Replying to a comment
          <button onClick={() => { setReplyTo(null); setText(""); }}><X size={12} /></button>
        </div>
      )}

      {posted && (
        <div className="awc-success-banner">
          <Check size={12} /> Comment posted successfully
        </div>
      )}

      <div className="awc-list">
        {visibleComments.map(cm => (
          <CommentItem
            key={cm.id}
            comment={cm}
            isOPCheck={isOPCheck}
            isVerifiedCheck={isVerifiedCheck}
            onLike={handleLike}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            onReply={handleReply}
            depth={0}
            currentUser={currentUser}
            parentUser={null}
          />
        ))}
      </div>

      {visibleComments.length > 0 && remaining > 0 && (
        <button className="awc-load-more" onClick={handleLoadMore}>
          <ChevronDown size={14} />
          <span>Load {Math.min(remaining, LOAD_MORE_COUNT)} more comment{Math.min(remaining, LOAD_MORE_COUNT) !== 1 ? "s" : ""}</span>
          {remaining > LOAD_MORE_COUNT && <span className="awc-load-remaining">{remaining - LOAD_MORE_COUNT} remaining</span>}
        </button>
      )}
    </section>
  );
}
