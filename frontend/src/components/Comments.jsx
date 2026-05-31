import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, Reply, EyeOff, AlertCircle,
  ChevronDown, ChevronUp, Flag, Bold, Italic, Underline,
  Link, Image, Smile, AtSign, Clock,
  MoreHorizontal, Pencil, Trash2, Share2, Check, Loader, Copy,
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

const TIMESTAMP_RE = /\b(\d{1,2}:)?\d{1,2}:\d{2}\b/g;

function parseTimestamp(str) {
  const parts = str.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function renderTextWithTimestamps(text, onSeek) {
  if (!text) return null;
  const parts = [];
  let last = 0, match;
  TIMESTAMP_RE.lastIndex = 0;
  while ((match = TIMESTAMP_RE.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const ts = match[0];
    parts.push(
      <button key={last} className="awc-timestamp" onClick={() => onSeek?.(parseTimestamp(ts))} type="button">
        {ts}
      </button>
    );
    last = TIMESTAMP_RE.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function getUserColor(name) {
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function getRoleBadge(role) {
  if (role === 'admin') return { label: "ADMIN", color: "#ffffff", bg: "rgba(255, 255, 255,0.15)" };
  return null;
}

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

function CommentAvatar({ name, avatar, size = 40 }) {
  if (avatar) {
    return (
      <img
        className="awc-avatar"
        src={avatar}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }
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

function FormatToolbar({ compact }) {
  const btns = [
    { icon: Bold, title: "Bold" },
    { icon: Italic, title: "Italic" },
    { icon: Underline, title: "Underline" },
  ];
  const extra = [
    { icon: Link, title: "Link" },
    { icon: Image, title: "Image" },
    { icon: Smile, title: "Emoji" },
    { icon: AtSign, title: "Mention" },
    { icon: Clock, title: "Timestamp" },
  ];
  const size = compact ? 14 : 16;
  return (
    <div className={compact ? "awc-reply-format-bar" : "awc-format-bar"}>
      {btns.map((b, i) => (
        <button key={i} className="awc-format-btn" title={b.title} type="button" tabIndex={-1}>
          <b.icon size={size} />
        </button>
      ))}
      <div className="awc-format-divider" />
      {extra.map((b, i) => (
        <button key={i} className="awc-format-btn" title={b.title} type="button" tabIndex={-1}>
          <b.icon size={size} />
        </button>
      ))}
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
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="awc-dialog-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="awc-dialog" onClick={e => e.stopPropagation()}>
        <p className="awc-dialog-text">{message}</p>
        <div className="awc-dialog-actions">
          <button className="awc-dialog-btn" onClick={onCancel}>Cancel</button>
          <button className="awc-dialog-btn awc-dialog-btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function SpoilerContent({ revealed, onReveal, text, onSeek }) {
  if (!revealed) {
    return (
      <div className="awc-spoiler-blur" onClick={onReveal} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onReveal()}>
        <AlertCircle size={12} />
        <span>Spoiler — Click to reveal</span>
        <EyeOff size={12} />
      </div>
    );
  }
  return <p className="awc-text">{renderTextWithTimestamps(text, onSeek)}</p>;
}

function ReplyInput({ targetUser, currentUser, onPost, onCancel }) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handlePost = () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    setTimeout(() => {
      onPost(text);
      setText("");
      setPosting(false);
    }, 300);
  };

  return (
    <div className="awc-reply-input-row">
      <div className="awc-reply-input-gutter">
        <CommentAvatar name={currentUser} size={24} />
      </div>
      <div className="awc-reply-input-main">
        <input
          ref={inputRef}
          className="awc-reply-input-field"
          type="text"
          placeholder={`Reply to @${targetUser}...`}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handlePost()}
          disabled={posting}
          maxLength={MAX_CHARS}
        />
        <div className="awc-reply-input-bar">
          <FormatToolbar compact />
          <div className="awc-format-spacer" />
          <button className="awc-reply-cancel-sm" onClick={onCancel}>Cancel</button>
          <button className="awc-reply-post-sm" onClick={handlePost} disabled={!text.trim() || posting}>
            {posting ? <Loader size={11} className="awc-spin" /> : <Send size={11} />}
            {posting ? "" : " Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, isOPCheck, isVerifiedCheck, onLike, onDislike, onEditComment, onDeleteComment, onPostReply, depth = 0, currentUser, parentUser, onSeek }) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likes, setLikes] = useState(comment.likes || 0);
  const [dislikes, setDislikes] = useState(comment.dislikes || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const editInputRef = useRef(null);

  const isOwn = comment.user === currentUser;
  const userColor = getUserColor(comment.user);
  const isOP = isOPCheck(comment.user);
  const badge = isOP
    ? { label: "OP", color: "#ffffff", bg: "rgba(255,255,255,0.15)" }
    : getRoleBadge(comment.role);

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [editing, editText.length]);

  const handleLike = () => {
    if (disliked) { setDisliked(false); setDislikes(d => d - 1); }
    if (!liked) {
      setLikes(l => l + 1);
      setLiked(true);
      onLike?.(comment.id);
    } else {
      setLikes(l => l - 1);
      setLiked(false);
    }
  };

  const handleDislike = () => {
    if (liked) { setLiked(false); setLikes(l => l - 1); }
    if (!disliked) {
      setDislikes(d => d + 1);
      setDisliked(true);
      onDislike?.(comment.id);
    } else {
      setDislikes(d => d - 1);
      setDisliked(false);
    }
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

  const handleReplySubmit = async (text) => {
    const newReply = {
      id: Date.now() + 1,
      user: currentUser,
      text,
      content: text,
      time: Date.now().toString(),
      likes: 0,
      dislikes: 0,
      replies: [],
    };
    await onPostReply(comment.id, newReply);
    setReplyingTo(null);
  };

  const spoilerMatch = !comment.hasSpoiler && comment.text.match(/\|\|(.+?)\|\|/);
  const hasSpoiler = comment.hasSpoiler || !!spoilerMatch;
  const cleanText = spoilerMatch ? comment.text.replace(/\|\|(.+?)\|\|/g, "$1") : comment.text;

  const handleClickReply = (targetId, targetUser) => {
    setReplyingTo(prev => prev?.id === targetId ? null : { id: targetId, user: targetUser });
  };

  const replyCount = comment.replies?.length || 0;

  return (
    <>
      {showDeleteConfirm && (
        <ConfirmDialog
          message="Are you sure you want to delete this comment?"
          onConfirm={() => { onDeleteComment?.(comment.id, depth > 0); setShowDeleteConfirm(false); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      <div className={`awc-item ${depth > 0 ? "awc-reply" : ""}`} id={`comment-${comment.id}`}>
        {depth === 0 && (
          <div className="awc-item-gutter">
            <CommentAvatar name={comment.user} avatar={comment.avatar} size={40} />
          </div>
        )}
        <div className="awc-body">
          <div className="awc-top">
            {depth > 0 && <CommentAvatar name={comment.user} avatar={comment.avatar} size={20} />}
            <span className="awc-user" style={{ color: userColor }}>
              {comment.user}
            </span>
            {badge && (
              <span className="awc-badge" style={{ color: badge.color, background: badge.bg }}>
                {badge.label}
              </span>
            )}
            {depth > 0 && parentUser && (
              <span className="awc-reply-to">@{parentUser}</span>
            )}
            <span className="awc-time" title={getExactTime(comment.time)}>
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
            {copied && <span className="awc-copied-hint"><Check size={10} /> Copied</span>}
          </div>

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
                  <Check size={12} /> Save
                </button>
              </div>
            </div>
          ) : hasSpoiler ? (
            <div className={`awc-spoiler ${spoilerRevealed ? "revealed" : ""}`}>
              <SpoilerContent revealed={spoilerRevealed} onReveal={() => setSpoilerRevealed(true)} text={cleanText} onSeek={onSeek} />
            </div>
          ) : (
            <p className="awc-text">{renderTextWithTimestamps(cleanText, onSeek)}</p>
          )}

          <div className="awc-actions">
            <button className={`awc-action ${liked ? "liked" : ""}`} onClick={handleLike}>
              <ThumbsUp size={16} fill={liked ? "currentColor" : "none"} />
              {likes > 0 && <span className="awc-action-count">{likes}</span>}
            </button>
            <button className={`awc-action ${disliked ? "disliked" : ""}`} onClick={handleDislike}>
              <ThumbsDown size={16} fill={disliked ? "currentColor" : "none"} />
              <span className="awc-action-count">{dislikes}</span>
            </button>
            <button className="awc-action" onClick={() => handleClickReply(comment.id, comment.user)}>
              <Reply size={16} /> Reply
            </button>
          </div>

          {replyingTo?.id === comment.id && (
            <ReplyInput
              targetUser={comment.user}
              currentUser={currentUser}
              onPost={handleReplySubmit}
              onCancel={() => setReplyingTo(null)}
            />
          )}

          {replyCount > 0 && (
            <>
              <button className="awc-reply-toggle" onClick={() => setShowReplies(s => !s)}>
                {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                View {replyCount} {replyCount === 1 ? "reply" : "replies"}
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
                      onDislike={onDislike}
                      onEditComment={onEditComment}
                      onDeleteComment={onDeleteComment}
                      onPostReply={onPostReply}
                      depth={depth + 1}
                      currentUser={currentUser}
                      parentUser={comment.user}
                      onSeek={onSeek}
                    />
                  ))}
                  {replyingTo && replyingTo.id !== comment.id && (
                    <ReplyInput
                      targetUser={replyingTo.user}
                      currentUser={currentUser}
                      onPost={handleReplySubmit}
                      onCancel={() => setReplyingTo(null)}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function addReplyDeep(list, parentId, reply) {
  return list.map(cm => {
    if (cm.id === parentId) return { ...cm, replies: [...(cm.replies || []), reply] };
    if (cm.replies?.length) return { ...cm, replies: addReplyDeep(cm.replies, parentId, reply) };
    return cm;
  });
}



function editCommentDeep(list, id, newText) {
  return list.map(cm => {
    if (cm.id === id) return { ...cm, text: newText };
    if (cm.replies?.length) return { ...cm, replies: editCommentDeep(cm.replies, id, newText) };
    return cm;
  });
}

function deleteCommentDeep(list, id) {
  return list.reduce((acc, cm) => {
    if (cm.id === id) return acc;
    const updated = cm.replies?.length
      ? { ...cm, replies: deleteCommentDeep(cm.replies, id) }
      : cm;
    acc.push(updated);
    return acc;
  }, []);
}

function Comments({ comments: externalComments, setComments, currentUser = "You", isLoggedIn = false, onSeek, onAdd, onLikeComment, onDislikeComment, onReplyComment, onEditComment: onEditCommentApi, onDeleteComment: onDeleteCommentApi, loading: commentsLoading }) {
  const [sort, setSort] = useState("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [text, setText] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const inputRef = useRef(null);
  const sortRef = useRef(null);

  const comments = externalComments || [];

  useEffect(() => {
    const handleClick = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    if (sortOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sortOpen]);

  const sorted = useMemo(() => {
    if (sort === "top") return [...comments].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    if (sort === "liked") return [...comments].sort((a, b) => ((b.likes || 0) - (b.dislikes || 0)) - ((a.likes || 0) - (a.dislikes || 0)));
    return comments;
  }, [comments, sort]);

  const visibleComments = sorted.slice(0, visibleCount);
  const remaining = Math.max(0, sorted.length - visibleCount);
  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label || "Most recent";

  const isOPCheck = useCallback((user) => {
    if (comments.length === 0) return false;
    return user === comments[0]?.user && user !== currentUser;
  }, [comments, currentUser]);

  const isVerifiedCheck = useCallback(() => false, []);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      if (onAdd) {
        await onAdd(text);
      } else {
        const newComment = {
          id: Date.now(),
          user: currentUser,
          text,
          time: Date.now().toString(),
          likes: 0,
          dislikes: 0,
          replies: [],
        };
        setComments?.(c => [newComment, ...c]);
      }
      setText("");
      setPosted(true);
      setTimeout(() => setPosted(false), 3000);
    } catch {}
    setPosting(false);
  };

  const handlePostReply = useCallback(async (parentId, reply) => {
    if (onReplyComment) {
      const res = await onReplyComment(parentId, reply.text || reply.content);
      if (res?.success) return;
    }
  }, [onReplyComment]);

  const handleLike = useCallback(async (id) => {
    if (onLikeComment) {
      await onLikeComment(id);
    }
  }, [onLikeComment]);

  const handleDislike = useCallback(async (id) => {
    if (onDislikeComment) {
      await onDislikeComment(id);
    }
  }, [onDislikeComment]);

  const handleEditComment = useCallback(async (id, newText) => {
    if (onEditCommentApi) {
      await onEditCommentApi(id, newText);
    }
    setComments?.(c => editCommentDeep(c, id, newText));
  }, [setComments, onEditCommentApi]);

  const handleDeleteComment = useCallback(async (id) => {
    if (onDeleteCommentApi) {
      await onDeleteCommentApi(id);
    }
    setComments?.(c => deleteCommentDeep(c, id));
  }, [setComments, onDeleteCommentApi]);

  const handleLoadMore = () => {
    setVisibleCount(c => c + LOAD_MORE_COUNT);
  };

  return (
    <section className="awc">
      <div className="awc-header">
        <div className="awc-header-left">
          <MessageCircle size={16} />
          <span>Comments</span>
          <span className="awc-count-badge">{comments.length}</span>
        </div>
        <div className="awc-sort-wrap" ref={sortRef}>
          <button className="awc-sort-btn" onClick={() => setSortOpen(o => !o)}>
            {currentSortLabel} <ChevronDown size={12} />
          </button>
          {sortOpen && (
            <div className="awc-sort-dropdown">
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.key}
                  className={`awc-sort-option ${sort === o.key ? "active" : ""}`}
                  onClick={() => { setSort(o.key); setSortOpen(false); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="awc-input-box">
        <CommentAvatar name={currentUser} size={40} />
        <div className="awc-input-main">
          <input
            ref={inputRef}
            className="awc-input-field"
            type="text"
            placeholder={isLoggedIn ? "Add comment..." : "Login to comment..."}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !posting && isLoggedIn && handleAdd()}
            disabled={posting || !isLoggedIn}
            maxLength={MAX_CHARS}
          />
          <div className="awc-format-bar">
            <FormatToolbar />
            <div className="awc-format-spacer" />
            <span className={`awc-input-chars ${text.length > MAX_CHARS * 0.9 ? "warn" : ""}`}>
              {text.length}/{MAX_CHARS}
            </span>
            <div className="awc-format-divider" />
            <button className="awc-submit-btn" onClick={handleAdd} disabled={!text.trim() || posting}>
              {posting ? <Loader size={13} className="awc-spin" /> : <Send size={13} />}
              Submit
            </button>
          </div>
        </div>
      </div>

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
            onDislike={handleDislike}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            onPostReply={handlePostReply}
            depth={0}
            currentUser={currentUser}
            parentUser={null}
            onSeek={onSeek}
          />
        ))}
      </div>

      {visibleComments.length > 0 && remaining > 0 && (
        <button className="awc-load-more" onClick={handleLoadMore}>
          <ChevronDown size={12} />
          <span>Load {Math.min(remaining, LOAD_MORE_COUNT)} more</span>
        </button>
      )}
    </section>
  );
}

export default React.memo(Comments);
