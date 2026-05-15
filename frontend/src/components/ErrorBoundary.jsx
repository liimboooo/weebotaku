import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "300px",
          gap: "16px",
          padding: "40px",
          color: "#888",
          textAlign: "center",
        }}>
          <AlertTriangle size={40} style={{ opacity: 0.3 }} />
          <h2 style={{ color: "#fff", margin: 0, fontSize: "1.1rem" }}>Something went wrong</h2>
          <p style={{ margin: 0, fontSize: "0.85rem", maxWidth: "400px", lineHeight: 1.5 }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "10px",
              border: "none",
              background: "#e50914",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.85rem",
              marginTop: "8px",
            }}
          >
            <RefreshCw size={16} /> Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
