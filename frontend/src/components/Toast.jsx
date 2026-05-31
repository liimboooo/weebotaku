import React, { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, Bookmark, Play } from "lucide-react";
import "./Toast.css";

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  save: Bookmark,
  watch: Play,
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const toast = e.detail || { message: e.detail?.message || "Notification", type: "info" };
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };

    window.addEventListener("notification-added", handler);
    return () => {
      window.removeEventListener("notification-added", handler);
    };
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        // addNotification dispatches {title, body}; older callers use {message}
        const title = t.title || t.message || "Notification";
        const body = t.body && t.body !== title ? t.body : null;
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon"><Icon size={16} /></span>
            <div className="toast-body">
              <span className="toast-title">{title}</span>
              {body && <span className="toast-text">{body}</span>}
            </div>
            {t.label && <span className="toast-xp-label">{t.label}</span>}
            <button className="toast-close" onClick={() => remove(t.id)}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
