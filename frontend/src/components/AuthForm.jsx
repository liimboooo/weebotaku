import React, { useState } from "react";
import { Sparkles, Mail, User, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

export default function AuthForm({ type, username, email, password, setUsername, setEmail, setPassword, onSubmit, onModeChange, error, loading, onGoogleSuccess, onGoogleError }) {
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
        <GoogleLogin
          onSuccess={(res) => onGoogleSuccess?.(res.credential)}
          onError={() => onGoogleError?.("Google sign-in failed")}
          size="large"
          shape="rectangular"
          theme="outline"
          text="continue_with"
        />
      </div>

      <div className="auth-toggle">
        {type === "login" ? "Don't have an account? " : "Already have an account? "}
        <a onClick={onModeChange}>{type === "login" ? "Register" : "Login"}</a>
      </div>
    </div>
  );
}
