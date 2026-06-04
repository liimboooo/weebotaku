import { useState, useCallback } from "react";
import { Download, Upload, Heart, FileJson, AlertTriangle } from "lucide-react";
import authService from "../services/authService";
import { MAX_FAVORITES, TOAST_DURATION_MS } from "../utils/constants";

export default function FavoritesSyncCard({ favorites, onUpdateFavorites }) {
  const [importPreview, setImportPreview] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await authService.exportFavorites();
      if (res?.success && res?.data) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `animewch-favorites-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Favorites exported successfully!");
      } else {
        showToast(res?.message || "Export failed", "error");
      }
    } catch (err) {
      console.error("Export error:", err);
      showToast("Export failed. Try again.", "error");
    }
    setExportLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setImportPreview(data);
      } catch {
        setImportPreview(null);
        showToast("Invalid JSON file", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview) return;
    setImportLoading(true);
    try {
      const res = await authService.importFavorites(importPreview);
      if (res?.success) {
        onUpdateFavorites(res.favorites);
        showToast(`Imported ${res.imported} favorite${res.imported !== 1 ? "s" : ""}${res.skipped ? ` (${res.skipped} skipped)` : ""}!`);
        setImportPreview(null);
        document.getElementById("fav-import-input").value = "";
      } else {
        showToast(res?.message || "Import failed", "error");
      }
    } catch (err) {
      console.error("Import error:", err);
      showToast("Import failed. Try again.", "error");
    }
    setImportLoading(false);
  };

  const canImport = importPreview && importPreview.favorites && Array.isArray(importPreview.favorites) && importPreview.favorites.length > 0;

  return (
    <div className="st-sync-card">
      <div className="st-sync-card-left">
        <div className="st-sync-logo" style={{ background: "linear-gradient(135deg, #f472b6, #ffffff)" }}>
          <Heart size={20} />
        </div>
        <div className="st-sync-info">
          <div className="st-sync-name">Favorites</div>
          <div style={{ fontSize: 13, color: "#ffffff" }}>
            {favorites?.length || 0} / {MAX_FAVORITES} favorites saved
          </div>
          <div style={{ fontSize: 11, color: "#ffffff", marginTop: 4 }}>
            Export/import your favorites as JSON
          </div>
        </div>
      </div>
      <div className="st-sync-card-right">
        <div className="st-sync-actions" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            className="st-btn st-btn--cyan st-btn--sm"
            onClick={handleExport}
            disabled={exportLoading || !favorites?.length}
          >
            <Download size={14} className={exportLoading ? "st-spin" : ""} />
            {exportLoading ? "Exporting..." : "Export"}
          </button>
          <label className="st-btn st-btn--green st-btn--sm" style={{ cursor: "pointer" }}>
            <Upload size={14} />
            Import
            <input
              id="fav-import-input"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: "none" }}
              disabled={importLoading}
            />
          </label>
          {importPreview && (
            <button
              className="st-btn st-btn--dark st-btn--sm"
              onClick={handleImport}
              disabled={importLoading || !canImport}
            >
              <FileJson size={14} />
              Confirm ({importPreview.favorites?.length || 0})
            </button>
          )}
        </div>
      </div>

      {importPreview && (
        <div className="st-import-preview">
          <div className="st-import-preview-header">
            <AlertTriangle size={14} />
            <span>Preview: {importPreview.favorites?.length || 0} favorites from {importPreview.username || "unknown"}</span>
          </div>
          <div className="st-import-preview-list">
            {importPreview.favorites?.slice(0, MAX_FAVORITES).map((f, i) => (
              <div key={f.animeId || i} className="st-import-preview-item">
                <span>{f.name}</span>
                <span style={{ fontSize: 11, color: "#ffffff" }}>ID: {f.animeId}</span>
              </div>
            ))}
            {importPreview.favorites?.length > MAX_FAVORITES && (
              <div className="st-import-preview-item" style={{ color: "#ffffff" }}>
                +{importPreview.favorites.length - MAX_FAVORITES} more...
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`st-toast st-toast--${toast.type}`} style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}