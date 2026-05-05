import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageSquare, Trash2, Edit2, Flag } from "lucide-react";
import "./Reviews.css";

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function Reviews({ animeId, selectedEp }) {
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(10);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [username, setUsername] = useState("Guest User");
  const [activeFilter, setActiveFilter] = useState("ep");
  const [userLikedComments, setUserLikedComments] = useState([]);
  const [visibleReplies, setVisibleReplies] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [visibleSpoilers, setVisibleSpoilers] = useState({});

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);
    const storedAvatar = localStorage.getItem("userAvatar");
    if (storedAvatar) {
      // if user avatar exists, replace default avatar generation
    }

    const storedComments = localStorage.getItem(`comments_${animeId}`);
    if (storedComments) {
      setComments(JSON.parse(storedComments));
    } else {
      setComments([]);
    }

    const liked = JSON.parse(localStorage.getItem("userLikedComments") || "[]");
    setUserLikedComments(liked);
  }, [animeId]);

  const saveComments = (updatedComments) => {
    setComments(updatedComments);
    localStorage.setItem(`comments_${animeId}`, JSON.stringify(updatedComments));
  };

  const handlePostComment = () => {
    if (newComment.trim() === "") return;
    const avatarFromProfile = localStorage.getItem("userAvatar") || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    const comment = {
      id: Date.now(),
      user: username,
      avatar: avatarFromProfile,
      text: newComment,
      rating: rating,
      episode: selectedEp,
      likes: 0,
      timestamp: Date.now(),
      replies: [],
      isPinned: false,
      isEdited: false
    };
    saveComments([comment, ...comments]);
    setNewComment("");
    setRating(10);
  };

  const handlePostReply = (commentId) => {
    if (replyText.trim() === "") return;
    const avatarFromProfile = localStorage.getItem("userAvatar") || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    const reply = {
      id: Date.now(),
      user: username,
      avatar: avatarFromProfile,
      text: replyText,
      likes: 0,
      timestamp: Date.now(),
      isEdited: false
    };
    const updated = comments.map(c => {
      if (c.id === commentId) {
        return { ...c, replies: [...(c.replies || []), reply] };
      }
      return c;
    });
    saveComments(updated);
    setReplyingTo(null);
    setReplyText("");
    if (!visibleReplies.includes(commentId)) {
      setVisibleReplies([...visibleReplies, commentId]);
    }
  };

  const handleEditComment = (commentId, newText) => {
    if (newText.trim() === "") return;
    const updated = comments.map(c => {
      if (c.id === commentId) {
        return { ...c, text: newText, isEdited: true };
      }
      return c;
    });
    saveComments(updated);
    setEditingId(null);
    setEditText("");
  };

  const handleLikeComment = (commentId, isReply = false, parentId = null) => {
    const isLiked = userLikedComments.includes(commentId);
    let newUserLiked = [...userLikedComments];

    if (isLiked) {
      newUserLiked = newUserLiked.filter(id => id !== commentId);
    } else {
      newUserLiked.push(commentId);
    }

    setUserLikedComments(newUserLiked);
    localStorage.setItem("userLikedComments", JSON.stringify(newUserLiked));

    const updated = comments.map(c => {
      if (!isReply && c.id === commentId) {
        return { ...c, likes: isLiked ? c.likes - 1 : c.likes + 1 };
      } else if (isReply && c.id === parentId) {
        const updatedReplies = c.replies.map(r => 
          r.id === commentId ? { ...r, likes: isLiked ? r.likes - 1 : r.likes + 1 } : r
        );
        return { ...c, replies: updatedReplies };
      }
      return c;
    });
    saveComments(updated);
  };

  const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const toggleReplies = (id) => {
    setVisibleReplies(prev => 
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const toggleSpoiler = (id) => {
    setVisibleSpoilers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  let filteredComments = activeFilter === "all"
    ? comments
    : comments.filter(c => c.episode === selectedEp);

  // Sort comments
  if (sortBy === "newest") {
    filteredComments = [...filteredComments].sort((a, b) => b.timestamp - a.timestamp);
  } else if (sortBy === "oldest") {
    filteredComments = [...filteredComments].sort((a, b) => a.timestamp - b.timestamp);
  } else if (sortBy === "mostLiked") {
    filteredComments = [...filteredComments].sort((a, b) => b.likes - a.likes);
  }

  const CommentCard = ({ comment, isReply = false, parentComment = null }) => (
    <motion.div 
      className={`comment-thread ${isReply ? 'reply-thread' : ''}`}
      variants={itemVariants}
      layout
    >
      <div className={`review-card ${isReply ? 'reply-card' : ''}`}>
        <div className="review-header">
          <div className="review-user">
            <img 
              src={comment.avatar} 
              alt={comment.user} 
              onClick={() => navigate(`/profile`)}
              style={{ cursor: 'pointer' }}
            />
            <div className="user-info">
              <h4>
                  <span className="review-user-name" onClick={() => navigate(`/profile`)}>
                    {comment.user}
                  </span>
                <span className="timestamp">{timeAgo(comment.timestamp || Date.now())}</span>
                {comment.isEdited && <span className="edited-badge">(edited)</span>}
              </h4>
              {comment.rating && (
                <div className="comment-rating">
                  <span className="star-icon">★</span>
                  <span>{comment.rating}/10</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="review-actions">
            <button 
              className={`like-btn ${userLikedComments.includes(comment.id) ? 'active' : ''}`}
              onClick={() => handleLikeComment(comment.id, isReply, parentComment?.id)}
            >
              <Heart 
                size={16} 
                fill={userLikedComments.includes(comment.id) ? "#e63636" : "none"}
                color={userLikedComments.includes(comment.id) ? "#e63636" : "currentColor"}
              />
              <span className="like-count-num">{comment.likes}</span>
            </button>
            <button className="report-btn" title="Report">
              <Flag size={14} />
            </button>
          </div>
        </div>
        
        <div className="review-text-wrapper">
          {editingId === comment.id ? (
            <div className="edit-mode">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <div className="edit-buttons">
                <button className="save-btn" onClick={() => handleEditComment(comment.id, editText)}>Save</button>
                <button className="cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            comment.text
          )}
        </div>
        
        <div className="review-footer">
          {!isReply && (
            <button className="reply-btn" onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
              <MessageSquare size={14} /> Reply
            </button>
          )}
          {comment.user === username && (
            <>
              <button className="edit-btn" onClick={() => { setEditingId(comment.id); setEditText(comment.text); }}>
                <Edit2 size={14} /> Edit
              </button>
              <button className="delete-btn" onClick={() => {
                if (parentComment) {
                  const updated = comments.map(c => c.id === parentComment.id ? { ...c, replies: c.replies.filter(r => r.id !== comment.id) } : c);
                  saveComments(updated);
                } else {
                  saveComments(comments.filter(c => c.id !== comment.id));
                }
              }}>
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {replyingTo === comment.id && !isReply && (
        <div className="reply-input-container">
          <input
            type="text"
            placeholder={`Reply to ${comment.user}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            autoFocus
          />
          <button onClick={() => handlePostReply(comment.id)}>Post</button>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && !isReply && (
        <>
          <button className="view-replies-btn" onClick={() => toggleReplies(comment.id)}>
            {visibleReplies.includes(comment.id) ? "▲ Hide Replies" : `▼ View ${comment.replies.length} Replies`}
          </button>
          
          {visibleReplies.includes(comment.id) && (
            <div className="replies-list">
              {comment.replies.map(reply => (
                <CommentCard key={reply.id} comment={reply} isReply={true} parentComment={comment} />
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );

  return (
    <div className="reviews-section">
      <div className="section-title">
        <h2>💬 Discussion</h2>
        <p>Share your thoughts about the show</p>
      </div>

      <div className="reviews-controls">
        <div className="reviews-filter-tabs">
          <button
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Comments
          </button>
          <button
            className={`filter-tab ${activeFilter === 'ep' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ep')}
          >
            Episode {selectedEp}
          </button>
        </div>

        <div className="sort-selector">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="mostLiked">Most Liked</option>
          </select>
        </div>
      </div>

      <div className="review-input-container">
        <div className="comment-composer-top">
          <div className="composer-avatar">{username.charAt(0).toUpperCase()}</div>
          <div className="composer-copy">
            <strong>{username}</strong>
            <span>Episode {selectedEp}</span>
          </div>
        </div>
        <textarea
          className="comment-composer"
          placeholder={`Write a comment about Episode ${selectedEp}...`}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <div className="composer-actions">
          <div className="rating-selector">
            <label>Score</label>
            <select value={rating} onChange={(e) => setRating(parseInt(e.target.value))}>
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
          <button className="post-review-btn" onClick={handlePostComment}>
            Post
          </button>
        </div>
      </div>

      <div className="reviews-list">
        <AnimatePresence mode="popLayout">
          {filteredComments.length > 0 ? (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredComments.map(comment => (
                <CommentCard key={comment.id} comment={comment} />
              ))}
            </motion.div>
          ) : (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: '#888', textAlign: 'center', padding: '40px 20px' }}
            >
              No comments yet. Be the first to share your thoughts!
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
