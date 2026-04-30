import React, { useState, useEffect } from "react";
import "./Reviews.css";

export default function Reviews({ animeId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [username, setUsername] = useState("Guest User");

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);

    const storedComments = localStorage.getItem(`comments_${animeId}`);
    if (storedComments) {
      setComments(JSON.parse(storedComments));
    } else {
      setComments([]);
    }
  }, [animeId]);

  const saveComments = (updatedComments) => {
    setComments(updatedComments);
    localStorage.setItem(`comments_${animeId}`, JSON.stringify(updatedComments));
  };

  const handlePostComment = () => {
    if (newComment.trim() === "") return;
    const comment = {
      id: Date.now(),
      user: username,
      avatar: "/beta-1.jpg",
      text: newComment,
      likes: 0,
      timestamp: Date.now(),
      replies: []
    };
    saveComments([comment, ...comments]);
    setNewComment("");
  };

  const handlePostReply = (commentId) => {
    if (replyText.trim() === "") return;
    const reply = {
      id: Date.now(),
      user: username,
      avatar: "/beta-1.jpg",
      text: replyText,
      likes: 0,
      timestamp: Date.now()
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
  };

  const handleLikeComment = (commentId, isReply = false, parentId = null) => {
    const updated = comments.map(c => {
      if (!isReply && c.id === commentId) {
        return { ...c, likes: c.likes + 1 };
      } else if (isReply && c.id === parentId) {
        const updatedReplies = c.replies.map(r => r.id === commentId ? { ...r, likes: r.likes + 1 } : r);
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
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="reviews-section">
      <div className="section-title">
        <h2>💬 Comments</h2>
        <p>Join the discussion with the community</p>
      </div>

      <div className="review-input-container">
        <textarea 
          placeholder={`Add a comment as ${username}...`}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        ></textarea>
        <button className="post-review-btn" onClick={handlePostComment}>
          Post Comment
        </button>
      </div>

      <div className="reviews-list">
        {comments.length > 0 ? comments.map(comment => (
          <div className="comment-thread" key={comment.id}>
            <div className="review-card">
              <div className="review-header">
                <div className="review-user">
                  <img src={comment.avatar} alt={comment.user} />
                  <div className="user-info">
                    <h4>{comment.user} <span className="timestamp">{timeAgo(comment.timestamp || Date.now())}</span></h4>
                  </div>
                </div>
                <button className="like-btn" onClick={() => handleLikeComment(comment.id)}>
                  <ion-icon name="heart-outline"></ion-icon> {comment.likes}
                </button>
              </div>
              <p className="review-text">{comment.text}</p>
              <div className="comment-actions">
                <button className="reply-btn" onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
                  Reply
                </button>
              </div>
            </div>

            {replyingTo === comment.id && (
              <div className="reply-input-container">
                <input 
                  type="text" 
                  placeholder="Write a reply..." 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  autoFocus
                />
                <button onClick={() => handlePostReply(comment.id)}>Post</button>
              </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <div className="replies-list">
                {comment.replies.map(reply => (
                  <div className="review-card reply-card" key={reply.id}>
                    <div className="review-header">
                      <div className="review-user">
                        <img src={reply.avatar} alt={reply.user} />
                        <div className="user-info">
                          <h4>{reply.user} <span className="timestamp">{timeAgo(reply.timestamp || Date.now())}</span></h4>
                        </div>
                      </div>
                      <button className="like-btn" onClick={() => handleLikeComment(reply.id, true, comment.id)}>
                        <ion-icon name="heart-outline"></ion-icon> {reply.likes}
                      </button>
                    </div>
                    <p className="review-text">{reply.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )) : (
          <p style={{ color: '#888', textAlign: 'center', padding: '20px 0' }}>No comments yet. Be the first to start the discussion!</p>
        )}
      </div>
    </div>
  );
}
