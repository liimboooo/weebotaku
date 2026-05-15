export function formatCount(n) {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function timeAgo(ts) {
  if (!ts || typeof ts !== "number") return "Just now";
  const diff = Date.now() - ts;
  if (diff < 0) return "Just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function notify(message, type = "info") {
  window.dispatchEvent(new CustomEvent("notification-added", { detail: { message, type } }));
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
