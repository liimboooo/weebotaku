import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import friendService from "../../services/friendService";
import {
  Users, UserPlus, UserMinus, Check, X, Clock,
  Search, ChevronRight,
} from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import "./FriendsPage.css";

const TABS = [
  { key: "friends", label: "Friends", icon: Users },
  { key: "requests", label: "Requests", icon: Clock },
];

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function FriendCard({ user, onRemove, onNavigate }) {
  return (
    <div className="fr-card">
      <div className="fr-card-left" onClick={() => onNavigate(user.username)}>
        {user.avatar ? (
          <img src={user.avatar} alt="" className="fr-avatar" />
        ) : (
          <div className="fr-avatar fr-avatar--fallback">
            {(user.username || "?")[0].toUpperCase()}
          </div>
        )}
        <div>
          <span className="fr-username">{user.username}</span>
          <span className="fr-bio">{user.bio || ""}</span>
        </div>
      </div>
      <button className="fr-remove-btn" onClick={() => onRemove(user._id)} title="Remove friend">
        <UserMinus size={14} />
      </button>
    </div>
  );
}

function RequestCard({ friendship, type, onAccept, onReject, onNavigate }) {
  const user = type === "incoming" ? friendship.requester : friendship.recipient;
  return (
    <div className="fr-card">
      <div className="fr-card-left" onClick={() => onNavigate(user.username)}>
        {user.avatar ? (
          <img src={user.avatar} alt="" className="fr-avatar" />
        ) : (
          <div className="fr-avatar fr-avatar--fallback">
            {(user.username || "?")[0].toUpperCase()}
          </div>
        )}
        <div>
          <span className="fr-username">{user.username}</span>
          <span className="fr-bio">{type === "incoming" ? "Sent you a request" : "Pending"}</span>
        </div>
      </div>
      <div className="fr-req-actions">
        {type === "incoming" && (
          <button className="fr-accept-btn" onClick={() => onAccept(friendship._id)}>
            <Check size={14} />
          </button>
        )}
        <button className="fr-reject-btn" onClick={() => onReject(friendship._id)}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function FriendsPage() {
  useDocumentTitle("Friends");
  const navigate = useNavigate();
  const [tab, setTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadFriends = useCallback(async () => {
    try {
      const res = await friendService.getFriends();
      setFriends(res.data || []);
    } catch {}
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const res = await friendService.getPendingRequests();
      setIncoming(res.data?.incoming || []);
      setOutgoing(res.data?.outgoing || []);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([loadFriends(), loadRequests()]).then(() => setLoading(false));
  }, [loadFriends, loadRequests]);

  const handleRemove = async (userId) => {
    try {
      await friendService.removeFriend(userId);
      loadFriends();
    } catch {}
  };

  const handleAccept = async (id) => {
    try {
      await friendService.acceptRequest(id);
      loadFriends();
      loadRequests();
    } catch {}
  };

  const handleReject = async (id) => {
    try {
      await friendService.rejectRequest(id);
      loadRequests();
    } catch {}
  };

  const goToProfile = (username) => navigate(`/profile/${username}`);

  const filteredFriends = friends.filter(f =>
    !search || f.username.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = incoming.length;

  return (
    <div className="fr-page">
      <div className="fr-container">
        <div className="fr-header">
          <div>
            <h1 className="fr-title">Friends</h1>
            <p className="fr-subtitle">{friends.length} friends</p>
          </div>
        </div>

        <div className="fr-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`fr-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={15} />
              {t.label}
              {t.key === "requests" && pendingCount > 0 && (
                <span className="fr-tab-badge">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "friends" && (
          <>
            <div className="fr-search-wrap">
              <Search size={14} className="fr-search-icon" />
              <input
                className="fr-search"
                placeholder="Search friends..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="fr-loading">Loading...</div>
            ) : filteredFriends.length === 0 ? (
              <div className="fr-empty">
                <Users size={32} strokeWidth={1} />
                <h3>{search ? "No matches" : "No friends yet"}</h3>
                <p>{search ? "Try a different search" : "Visit profiles to send friend requests"}</p>
              </div>
            ) : (
              <div className="fr-list">
                {filteredFriends.map(f => (
                  <FriendCard key={f._id} user={f} onRemove={handleRemove} onNavigate={goToProfile} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "requests" && (
          <>
            {incoming.length > 0 && (
              <div className="fr-section">
                <h3 className="fr-section-title">Incoming ({incoming.length})</h3>
                <div className="fr-list">
                  {incoming.map(r => (
                    <RequestCard
                      key={r._id}
                      friendship={r}
                      type="incoming"
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onNavigate={goToProfile}
                    />
                  ))}
                </div>
              </div>
            )}

            {outgoing.length > 0 && (
              <div className="fr-section">
                <h3 className="fr-section-title">Sent ({outgoing.length})</h3>
                <div className="fr-list">
                  {outgoing.map(r => (
                    <RequestCard
                      key={r._id}
                      friendship={r}
                      type="outgoing"
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onNavigate={goToProfile}
                    />
                  ))}
                </div>
              </div>
            )}

            {incoming.length === 0 && outgoing.length === 0 && (
              <div className="fr-empty">
                <Clock size={32} strokeWidth={1} />
                <h3>No pending requests</h3>
                <p>Visit profiles to send friend requests</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
