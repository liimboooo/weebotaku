function migrateOldWatchlist() {
  const old = localStorage.getItem("watchlist");
  if (old) {
    try {
      const parsed = JSON.parse(old);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasObjects = typeof parsed[0] === "object";
        const migrated = hasObjects ? parsed : [];
        if (migrated.length > 0) localStorage.setItem("animewatchlist", JSON.stringify(migrated));
      }
    } catch {}
    localStorage.removeItem("watchlist");
  }
}
migrateOldWatchlist();

export function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem("animewatchlist") || "[]");
  } catch { return []; }
}

export function saveWatchlist(list) {
  localStorage.setItem("animewatchlist", JSON.stringify(list));
}

export function addToWatchlist(item) {
  const current = loadWatchlist();
  if (current.some(i => i.id === item.id)) return current;
  const next = [...current, { ...item, type: "anime" }];
  saveWatchlist(next);
  return next;
}

export function removeFromWatchlist(id) {
  const current = loadWatchlist();
  const next = current.filter(i => i.id !== id);
  saveWatchlist(next);
  return next;
}

export function isInWatchlist(id) {
  return loadWatchlist().some(i => i.id === id);
}

export function loadReadlist() {
  try {
    return JSON.parse(localStorage.getItem("mangareadlist") || "[]");
  } catch { return []; }
}

export function saveReadlist(list) {
  localStorage.setItem("mangareadlist", JSON.stringify(list));
}

export function addToReadlist(item) {
  const current = loadReadlist();
  if (current.some(i => i.id === item.id)) return current;
  const next = [...current, { ...item, type: "manga" }];
  saveReadlist(next);
  return next;
}

export function removeFromReadlist(id) {
  const current = loadReadlist();
  const next = current.filter(i => i.id !== id);
  saveReadlist(next);
  return next;
}

export function isInReadlist(id) {
  return loadReadlist().some(i => i.id === id);
}
