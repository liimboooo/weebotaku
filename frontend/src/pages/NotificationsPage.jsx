import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedPage from "../components/AnimatedPage";
import {
  Bell, BellOff, Check, CheckCheck, Trash2, Film,
  MessageSquare, Users, Megaphone, Filter, X,
} from "lucide-react";
import {
  fetchNotificationsFromServer,
  markReadOnServer,
  markAllReadOnServer,
  deleteNotificationOnServer,
  clearAllOnServer,
} from "../services/notificationService";
import {
  isPushSupported,
  isSubscribed as checkIsSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  getPermissionState,
} from "../services/pushManager";
import "./NotificationsPage.css";

const FILTERS = [
  { key: "all", label: "All", icon: Bell },
  { key: "unread", label: "Unread", icon: Bell },
  { key: "episode", label: "Episodes", icon: Film },
  { key: "reply", label: "Replies", icon: MessageSquare },
  { key: "friend_activity", label: "Friends", icon: Users },
  { key: "system", label: "System", icon: Megaphone },
];

const TYPE_ICONS = {
  episode: Film,
  reply: MessageSquare,
  friend_activity: Users,
  mention: MessageSquare,
  system: Megaphone,
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [pushSupported] = useState(isPushSupported());
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const fetchData = useCallback(async (resetPage = false) => {
    const p = resetPage ? 1 : page;
    setLoading(true);
    const res = await fetchNotificationsFromServer(filter, p);
    if (resetPage) {
      setNotifications(res.notifications || []);
      setPage(1);
    } else if (p === 1) {
      setNotifications(res.notifications || []);
    } else {
      setNotifications(prev => [...prev, ...(res.notifications || [])]);
    }
    setUnreadCount(res.unreadCount || 0);
    setHasMore(p < (res.pages || 1));
    setLoading(false);
  }, [filter, page]);

  useEffect(() => {
    fetchData(true);
  }, [filter]);

  useEffect(() => {
    if (page > 1) fetchData();
  }, [page]);

  useEffect(() => {
    if (pushSupported) {
      checkIsSubscribed().then(setPushEnabled);
    }
  }, [pushSupported]);

  const handleMarkRead = async (id) => {
    await markReadOnServer(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllReadOnServer();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (id) => {
    await deleteNotificationOnServer(id);
    const removed = notifications.find(n => n._id === id);
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (removed && !removed.read) setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleClearAll = async () => {
    await clearAllOnServer();
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const sub = await subscribeToPush();
        setPushEnabled(!!sub);
      }
    } catch (err) {
      console.error("Push toggle failed:", err);
    }
    setPushLoading(false);
  };

  const handleClick = (notif) => {
    if (!notif.read) handleMarkRead(notif._id);
    if (notif.link) navigate(notif.link);
  };

  const permState = getPermissionState();

  return (
    <AnimatedPage>
      <div className="notif-page">
        <div className="notif-container">
          <div className="notif-header">
            <div className="notif-header-left">
              <h1 className="notif-title">Notifications</h1>
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount}</span>
              )}
            </div>
            <div className="notif-header-actions">
              {unreadCount > 0 && (
                <button className="notif-action-btn" onClick={handleMarkAllRead}>
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button className="notif-action-btn notif-action-btn--danger" onClick={handleClearAll}>
                  <Trash2 size={14} /> Clear all
                </button>
              )}
            </div>
          </div>

          {pushSupported && (
            <div className="notif-push-banner">
              <div className="notif-push-info">
                <Bell size={18} />
                <div>
                  <strong>Push Notifications</strong>
                  <p>
                    {permState === "denied"
                      ? "Notifications are blocked in your browser settings."
                      : pushEnabled
                        ? "You'll receive push notifications on this device."
                        : "Enable push notifications to stay updated."}
                  </p>
                </div>
              </div>
              <button
                className={`notif-push-toggle ${pushEnabled ? "active" : ""}`}
                onClick={handleTogglePush}
                disabled={pushLoading || permState === "denied"}
              >
                {pushLoading ? "..." : pushEnabled ? <><BellOff size={14} /> Disable</> : <><Bell size={14} /> Enable</>}
              </button>
            </div>
          )}

          <div className="notif-filters">
            {FILTERS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`notif-filter ${filter === key ? "active" : ""}`}
                onClick={() => setFilter(key)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="notif-list">
            {loading && notifications.length === 0 ? (
              <div className="notif-skeleton">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div className="notif-skeleton-row" key={i}>
                    <div className="notif-skeleton-icon" />
                    <div className="notif-skeleton-lines">
                      <div className="notif-skeleton-line notif-skeleton-line--med" />
                      <div className="notif-skeleton-line notif-skeleton-line--short" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length > 0 ? (
              <>
                <AnimatePresence mode="popLayout">
                  {notifications.map((notif) => {
                    const TypeIcon = TYPE_ICONS[notif.type] || Bell;
                    return (
                      <motion.div
                        key={notif._id}
                        className={`notif-item ${notif.read ? "" : "notif-item--unread"}`}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => handleClick(notif)}
                      >
                        {!notif.read && <div className="notif-dot" />}
                        <div className={`notif-icon notif-icon--${notif.type}`}>
                          <TypeIcon size={18} />
                        </div>
                        <div className="notif-content">
                          <h4 className="notif-item-title">{notif.title}</h4>
                          <p className="notif-item-body">{notif.body}</p>
                          <span className="notif-item-time">{timeAgo(notif.createdAt)}</span>
                        </div>
                        <div className="notif-item-actions">
                          {!notif.read && (
                            <button
                              className="notif-item-action"
                              onClick={(e) => { e.stopPropagation(); handleMarkRead(notif._id); }}
                              aria-label="Mark read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            className="notif-item-action notif-item-action--delete"
                            onClick={(e) => { e.stopPropagation(); handleDelete(notif._id); }}
                            aria-label="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {hasMore && (
                  <button
                    className="notif-load-more"
                    onClick={() => setPage(prev => prev + 1)}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More"}
                  </button>
                )}
              </>
            ) : (
              <div className="notif-empty">
                <div className="notif-empty-icon"><Bell size={48} /></div>
                <h3 className="notif-empty-title">No notifications</h3>
                <p className="notif-empty-msg">
                  {filter === "all"
                    ? "You're all caught up!"
                    : `No ${filter} notifications yet.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
