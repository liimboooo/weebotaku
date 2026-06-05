import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

function isChunkLoadError(error) {
  if (!error) return false;
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk \d+ failed/i.test(error.message)
  );
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const isChunk = isChunkLoadError(this.state.error);
      const message = this.props.fallbackMessage || (isChunk ? "New version deployed" : "Something went wrong");

      return (
        <div className="error-boundary" style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: this.props.minHeight || "300px",
          gap: "16px",
          color: "#ffffff",
          textAlign: "center",
          background: "rgba(0,0,0,0.95)",
          borderRadius: "28px",
        }}>
          <AlertTriangle size={40} style={{ opacity: 0.4, color: "#000000" }} />
          <h2 style={{ color: "#fff", margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{message}</h2>
          <p className="error-boundary-message" style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5, color: "#ffffff" }}>
            {isChunk
              ? "The app was updated. Please reload to get the latest version."
              : (this.state.error?.message || "An unexpected error occurred")}
          </p>
          <button
            onClick={this.handleReset}
            className="error-boundary-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "10px",
              border: "1px solid #000000",
              background: "#000000",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.85rem",
              marginTop: "8px",
              transition: "all .2s",
            }}
            onMouseOver={e => { e.currentTarget.style.background = "#ffffff"; }}
            onMouseOut={e => { e.currentTarget.style.background = "#000000"; }}
          >
            <RefreshCw size={16} /> {isChunk ? "Reload Page" : "Try Again"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
