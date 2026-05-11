import React from "react";
import { Sparkles } from "lucide-react";

export default function AuthForm({ type, username, password, setUsername, setPassword, onSubmit, onModeChange }) {
  return (
    <div className="auth-card">
      <h1 className="auth-title">
        <Sparkles size={24} style={{ display: "inline", marginRight: 8 }} />
        {type === "login" ? "Welcome back" : "Join AnimeWch"}
      </h1>
      <p style={{ color: "#888", fontSize: 14, textAlign: "center", maxWidth: 300 }}>
        {type === "login" ? "Sign in to continue your journey" : "Create your account and start exploring"}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 350 }}
      >
        <input
          className="auth-input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="google-wrapper">
          <button type="button" className="google-button">
            <svg className="google-icon" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            Google
          </button>
        </div>
        <button type="submit" className="auth-button" aria-label={type === "login" ? "Sign in" : "Sign up"}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </form>
      <div className="auth-toggle">
        <span style={{ color: "#888" }}>
          {type === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <span onClick={onModeChange} style={{ color: "#e63636", cursor: "pointer", fontWeight: 600 }}>
            {type === "login" ? "Register" : "Login"}
          </span>
        </span>
      </div>
    </div>
  );
}
