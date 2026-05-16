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

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const message = this.props.fallbackMessage || "Something went wrong";

      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: this.props.minHeight || "300px",
          gap: "16px",
          padding: "40px",
          color: "#888",
          textAlign: "center",
          background: "rgba(5,5,5,0.95)",
          borderRadius: "28px",
        }}>
          <AlertTriangle size={40} style={{ opacity: 0.4, color: "#dc2626" }} />
          <h2 style={{ color: "#fff", margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{message}</h2>
          <p style={{ margin: 0, fontSize: "0.85rem", maxWidth: "400px", lineHeight: 1.5, color: "#666" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "10px",
              border: "1px solid #dc2626",
              background: "#dc2626",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.85rem",
              marginTop: "8px",
              transition: "all .2s",
            }}
            onMouseOver={e => { e.currentTarget.style.background = "#e63636"; }}
            onMouseOut={e => { e.currentTarget.style.background = "#dc2626"; }}
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
