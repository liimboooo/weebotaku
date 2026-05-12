import React, { useState } from "react";
import { Sparkles, Mail, User, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";

export default function AuthForm({ type, username, email, password, setUsername, setEmail, setPassword, onSubmit, onModeChange, error, loading }) {
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="auth-card" key={type}>
      <div className="auth-header">
        <h1 className="auth-title">
          <Sparkles size={20} />
          {type === "login" ? "Welcome back" : "Join AnimeWch"}
        </h1>
        <p className="auth-subtitle">
          {type === "login" ? "Sign in to continue your journey" : "Create your account and start exploring"}
        </p>
      </div>

      {error && (
        <div className="auth-error">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <form className="auth-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {type === "register" && (
          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />
            <input
              className="auth-input"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <span className="auth-input-bar" />
          </div>
        )}
        <div className="auth-input-wrap">
          <User size={16} className="auth-input-icon" />
          <input
            className="auth-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete={type === "login" ? "username" : "new-username"}
          />
          <span className="auth-input-bar" />
        </div>
        <div className="auth-input-wrap">
          <Lock size={16} className="auth-input-icon" />
          <input
            className="auth-input auth-input-pw"
            type={showPw ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={type === "login" ? "current-password" : "new-password"}
          />
          <span className="auth-input-bar" />
          <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="auth-actions">
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <span className="auth-button-spinner" />
            ) : (
              <>{type === "login" ? "Sign In" : "Sign Up"} <ArrowRight size={18} /></>
            )}
          </button>
          {type === "login" && <span className="auth-forgot">Forgot?</span>}
        </div>
      </form>

      <div className="auth-divider">
        <span className="auth-divider-line" />
        <span className="auth-divider-text">or</span>
        <span className="auth-divider-line" />
      </div>

      <div className="google-wrapper">
        <button type="button" className="google-button">
          <svg className="google-icon" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="auth-toggle">
        {type === "login" ? "Don't have an account? " : "Already have an account? "}
        <a onClick={onModeChange}>{type === "login" ? "Register" : "Login"}</a>
      </div>
    </div>
  );
}
