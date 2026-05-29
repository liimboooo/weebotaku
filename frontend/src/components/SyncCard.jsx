import { RefreshCw, ExternalLink, Plug, Unplug, Loader } from "lucide-react";
import { formatTimeAgo } from "../utils/helpers";

const LOGOS = {
  mal: { name: "MyAnimeList", bg: "#ffffff", initials: "MAL" },
  anilist: { name: "AniList", bg: "linear-gradient(135deg, #ffffff, #ffffff)", initials: "AL" },
};

export default function SyncCard({ service, status, username, lastSynced, loading, onConnect, onDisconnect, onSync }) {
  const info = LOGOS[service] || LOGOS.mal;
  const isConnected = status?.connected;
  const syncStatus = status?.status;

  const timeAgo = lastSynced ? formatTimeAgo(new Date(lastSynced)) : null;

  return (
    <div className="st-sync-card" style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? "none" : "auto" }}>
      <div className="st-sync-card-left">
        <div className="st-sync-logo" style={{ background: info.bg }}>
          {info.initials}
        </div>
        <div className="st-sync-info">
          <div className="st-sync-name">{info.name}</div>
          {isConnected ? (
            <>
              {username && <div style={{ fontSize: 13, color: "#4ade80" }}>@{username}</div>}
              {syncStatus === "synced" && timeAgo && (
                <div style={{ fontSize: 12, color: "#ffffff" }}>Synced {timeAgo}</div>
              )}
              {syncStatus === "syncing" && (
                <div style={{ fontSize: 12, color: "#fbbf24", display: "flex", alignItems: "center", gap: 4 }}>
                  <Loader size={12} className="st-spin" /> Syncing...
                </div>
              )}
              {syncStatus === "failed" && (
                <div style={{ fontSize: 12, color: "#ffffff" }}>Sync failed</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 13, color: "#ffffff" }}>Not connected</div>
          )}
        </div>
      </div>
      <div className="st-sync-card-right">
        <div className="st-sync-actions">
          {isConnected ? (
            <>
              <button className="st-btn st-btn--cyan st-btn--sm" onClick={onSync} disabled={syncStatus === "syncing"}>
                <RefreshCw size={14} className={syncStatus === "syncing" ? "st-spin" : ""} />
                Sync
              </button>
              <button className="st-btn st-btn--dark st-btn--sm" onClick={onDisconnect}>
                <Unplug size={14} />
                Disconnect
              </button>
            </>
          ) : (
            <button className="st-btn st-btn--green st-btn--sm" onClick={onConnect}>
              <Plug size={14} />
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

