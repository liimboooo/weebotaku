import React, { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, Zap } from "lucide-react";
import "./Toast.css";

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  xp: Zap,
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

    const xpHandler = (e) => {
      const { amount, label } = e.detail || {};
      if (!amount) return;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type: "xp", message: `+${amount} XP`, label }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };

    window.addEventListener("notification-added", handler);
    window.addEventListener("xp-gain", xpHandler);
    return () => {
      window.removeEventListener("notification-added", handler);
      window.removeEventListener("xp-gain", xpHandler);
    };
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={16} />
            <span>{t.message}</span>
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
