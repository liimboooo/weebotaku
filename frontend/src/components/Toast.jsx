import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, Bookmark, Play } from "lucide-react";
import "./Toast.css";

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  save: Bookmark,
  watch: Play,
};

const toastVariants = {
  initial: { opacity: 0, x: 50, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } },
  exit: { opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } },
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
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          const title = t.title || t.message || "Notification";
          const body = t.body && t.body !== title ? t.body : null;
          return (
            <motion.div
              key={t.id}
              className={`toast toast-${t.type}`}
              variants={toastVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
            >
              <span className="toast-icon"><Icon size={16} /></span>
              <div className="toast-body">
                <span className="toast-title">{title}</span>
                {body && <span className="toast-text">{body}</span>}
              </div>
              {t.label && <span className="toast-xp-label">{t.label}</span>}
              <motion.button className="toast-close" whileTap={{ scale: 0.8 }} onClick={() => remove(t.id)} aria-label="Dismiss notification">
                <X size={14} />
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
