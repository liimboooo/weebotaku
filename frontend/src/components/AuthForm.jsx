import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Mail, User, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '952361732795-in2ha0ljhjadc2q9g4ib2hpd41jrbjn4.apps.googleusercontent.com';

export default function AuthForm({ type, username, email, password, setUsername, setEmail, setPassword, onSubmit, onModeChange, error, loading, onGoogleSuccess, onGoogleError }) {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [confirmPw, setConfirmPw] = useState("");
  const btnRef = useRef(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || CLIENT_ID === 'your_google_client_id_here') return;
    if (rendered.current) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        rendered.current = true;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (res) => {
            if (res.credential) onGoogleSuccess?.(res.credential);
            else onGoogleError?.("Google sign-in failed");
          },
        });
        if (btnRef.current) {
          window.google.accounts.id.renderButton(btnRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'rectangular',
            text: 'continue_with',
            width: btnRef.current.offsetWidth || 320,
          });
        }
      }
    }, 200);
    return () => { clearInterval(interval); }
  }, [onGoogleSuccess, onGoogleError]);

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

      <form className="auth-form" onSubmit={(e) => {
        e.preventDefault();
        if (type === "register" && password !== confirmPw) return;
        onSubmit();
      }}>
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
        {type === "register" && (
          <div className="auth-input-wrap">
            <Lock size={16} className="auth-input-icon" />
            <input
              className="auth-input"
              type={showPw ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
            />
            <span className="auth-input-bar" />
          </div>
        )}
        <div className="auth-actions">
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <span className="auth-button-spinner" />
            ) : (
              <>{type === "login" ? "Sign In" : "Sign Up"} <ArrowRight size={18} /></>
            )}
          </button>
          {type === "login" && <span className="auth-forgot" onClick={() => navigate('/help')}>Forgot?</span>}
        </div>
      </form>

      {CLIENT_ID && CLIENT_ID !== 'your_google_client_id_here' && (
        <>
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <span className="auth-divider-line" />
          </div>
          <div className="google-wrapper" ref={btnRef} />
        </>
      )}

      <div className="auth-toggle">
        {type === "login" ? "Don't have an account? " : "Already have an account? "}
        <a onClick={onModeChange}>{type === "login" ? "Register" : "Login"}</a>
      </div>
    </div>
  );
}
