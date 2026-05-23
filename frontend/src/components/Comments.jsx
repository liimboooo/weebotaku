import React, { useState, useMemo } from "react";
import {
  MessageCircle, ThumbsUp, ThumbsDown,
  Reply, Pin, EyeOff, AlertCircle, X, ArrowLeft,
  Heart, ChevronDown, ChevronUp, Flag, Clock
} from "lucide-react";
import "./Comments.css";

const SORT_TABS = [
  { key: "top", label: "Top" },
  { key: "newest", label: "Newest" },
  { key: "liked", label: "Most Liked" },
];

const INITIAL_VISIBLE = 5;
const LOAD_MORE_COUNT = 5;

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
  if (!isNaN(num)) {
    const diff = Date.now() - num;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }
  return timeStr;
}

function getBadge(user, isOP, isVerified) {
  if (isOP) return { label: "OP", color: "#a855f7", bg: "rgba(168,85,247,0.15)" };
  if (isVerified) return { label: "Verified", color: "#06b6d4", bg: "rgba(6,182,212,0.15)" };
  return null;
}

function SpoilerContent({ revealed, onReveal, text, spoilerText }) {
  if (!revealed) {
    return (
      <div className="awc-spoiler-blur" onClick={onReveal}>
        <AlertCircle size={13} />
        <span>{spoilerText || "Spoiler — Click to reveal"}</span>
      </div>
    );
  }
  return <p className="awc-text">{text}</p>;
}

function CommentAvatar({ name, size = 30 }) {
  const initials = getInitials(name);
  const colors = [
    "#a855f7", "#ec4899", "#3b82f6", "#06b6d4",
    "#8b5cf6", "#f59e0b", "#10b981", "#ef4444",
  ];
  const colorIndex = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return (
    <div
      className="awc-avatar"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${colors[colorIndex]}, ${colors[(colorIndex + 1) % colors.length]})`,
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
}

function CommentItem({ comment, isOPCheck, isVerifiedCheck, onLike, onReply, depth = 0 }) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(comment.likes || 0);
  const [showReplies, setShowReplies] = useState(true);

  const badge = getBadge(comment.user, isOPCheck(comment.user), isVerifiedCheck(comment.user));

  const handleLike = () => {
    if (!liked) {
      setLikes(l => l + 1);
      setLiked(true);
      onLike?.(comment.id);
    }
  };

  const spoilerMatch = !comment.hasSpoiler && comment.text.match(/\|\|(.+?)\|\|/);
  const hasSpoiler = comment.hasSpoiler || !!spoilerMatch;
  const cleanText = spoilerMatch ? comment.text.replace(/\|\|(.+?)\|\|/g, "$1") : comment.text;

  return (
    <div className={`awc-item ${comment.pinned ? "awc-pinned" : ""} ${depth > 0 ? "awc-reply" : ""}`} style={{ marginLeft: depth * 20 }}>
      {comment.pinned && depth === 0 && (
        <div className="awc-pin-badge"><Pin size={10} /> Pinned</div>
      )}
      <CommentAvatar name={comment.user} size={depth > 0 ? 24 : 30} />
      <div className="awc-body">
        <div className="awc-top">
          <span className="awc-user">{comment.user}</span>
          {badge && (
            <span className="awc-badge" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
          )}
          <span className="awc-time">
            <Clock size={9} />
            {formatTimestamp(comment.time)}
          </span>
        </div>

        {hasSpoiler ? (
          <div className={`awc-spoiler ${spoilerRevealed ? "revealed" : ""}`}>
            <SpoilerContent
              revealed={spoilerRevealed}
              onReveal={() => setSpoilerRevealed(true)}
              text={cleanText}
            />
          </div>
        ) : (
          <p className="awc-text">{comment.text}</p>
        )}

        <div className="awc-actions">
          <button className={`awc-action ${liked ? "liked" : ""}`} onClick={handleLike}>
            <Heart size={11} fill={liked ? "currentColor" : "none"} /> {likes}
          </button>
          {!comment.dislikes === undefined && (
            <button className="awc-action">
              <ThumbsDown size={11} /> {comment.dislikes}
            </button>
          )}
          <button className="awc-action" onClick={() => onReply(comment.id)}>
            <Reply size={11} /> Reply
          </button>
          <button className="awc-action awc-action-report">
            <Flag size={11} />
          </button>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <>
            <button className="awc-reply-toggle" onClick={() => setShowReplies(s => !s)}>
              {showReplies ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
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
                    onReply={onReply}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Comments({ comments: externalComments, setComments, currentUser = "You" }) {
  const [sort, setSort] = useState("top");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

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

  const isOPCheck = (user) => {
    if (comments.length === 0) return false;
    const firstCommentUser = comments[0]?.user;
    return user === firstCommentUser && user !== currentUser;
  };

  const isVerifiedCheck = (user) => {
    return user === "OtakuPro" || user === "AnimeKing";
  };

  const handleAdd = () => {
    if (!text.trim()) return;
    const newComment = {
      id: Date.now(),
      user: currentUser,
      text: text,
      time: Date.now().toString(),
      likes: 0,
      replies: [],
      pinned: false,
    };
    if (replyTo) {
      setComments?.(c => c.map(cm =>
        cm.id === replyTo
          ? { ...cm, replies: [...cm.replies, { ...newComment, id: Date.now() + 1 }] }
          : cm
      ));
      setReplyTo(null);
    } else {
      setComments?.(c => [newComment, ...c]);
    }
    setText("");
  };

  const handleLike = (id) => {
    setComments?.(c => c.map(cm =>
      cm.id === id ? { ...cm, likes: (cm.likes || 0) + 1 }
        : { ...cm, replies: cm.replies.map(r => r.id === id ? { ...r, likes: (r.likes || 0) + 1 } : r) }
    ));
  };

  const handleLoadMore = () => {
    setVisibleCount(c => c + LOAD_MORE_COUNT);
  };

  return (
    <section className="awc">
      <div className="awc-header">
        <div className="awc-header-left">
          <MessageCircle size={13} />
          <span>Comments</span>
          <span className="awc-badge-count">{comments.length}</span>
        </div>
        <div className="awc-sorts">
          {SORT_TABS.map(st => (
            <button
              key={st.key}
              className={`awc-sort ${sort === st.key ? "active" : ""}`}
              onClick={() => setSort(st.key)}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      <div className="awc-input-row">
        <CommentAvatar name={currentUser} size={30} />
        <div className="awc-input-wrap">
          <input
            className="awc-input"
            type="text"
            placeholder={replyTo ? "Write a reply..." : "Join the discussion..."}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          <div className="awc-input-actions">
            <button className="awc-input-btn" title="Send" onClick={handleAdd}>
              <ArrowLeft size={12} style={{ transform: "rotate(90deg)" }} />
            </button>
          </div>
        </div>
      </div>

      {replyTo && (
        <div className="awc-reply-indicator">
          <Reply size={11} />
          Replying to a comment
          <button onClick={() => { setReplyTo(null); setText(""); }}>
            <X size={12} />
          </button>
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
            onReply={(id) => setReplyTo(id)}
            depth={0}
          />
        ))}
      </div>

      {remaining > 0 && (
        <button className="awc-load-more" onClick={handleLoadMore}>
          <ChevronDown size={13} />
          Load {Math.min(remaining, LOAD_MORE_COUNT)} more {remaining > LOAD_MORE_COUNT ? `(+${remaining - LOAD_MORE_COUNT} remaining)` : "comments"}
        </button>
      )}
    </section>
  );
}
