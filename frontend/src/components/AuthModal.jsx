import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import { syncFromBackend } from "../services/storage";
import { Mail, CheckCircle, AlertCircle, X, Eye, EyeOff } from "lucide-react";
import { useAuthModal } from "../contexts/AuthModalContext";
import "./AuthModal.css";

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function AuthModal() {
  const { isOpen, mode: initialMode, redirectTo, closeAuth } = useAuthModal();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending2FA, setPending2FA] = useState(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentMsg, setResentMsg] = useState("");
  const [showPw, setShowPw] = useState(false);
  const overlayRef = useRef(null);
  const handleCloseRef = useRef(null);
  const googleBtnRef = useRef(null);

  const handleClose = useCallback(() => {
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setPending2FA(null);
    setTwoFACode("");
    setRegisteredEmail("");
    setNeedsVerify(false);
    setVerifyEmail("");
    setResentMsg("");
    setShowPw(false);
    setLoading(false);
    closeAuth();
  }, [closeAuth]);

  useEffect(() => { handleCloseRef.current = handleClose; }, [handleClose]);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") handleCloseRef.current(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  const onAuthSuccess = useCallback(() => {
    syncFromBackend().catch(err => console.error('[AnimeWch] Backend sync after login failed:', err));
    window.dispatchEvent(new Event('auth-login'));
    handleClose();
    if (redirectTo) navigate(redirectTo, { replace: true });
  }, [handleClose, redirectTo, navigate]);

  const handleSubmit = useCallback(async () => {
    const u = username.trim();
    const p = password.trim();
    const e = email.trim();

    setError("");

    if (!u) { setError("Please enter a username"); return; }
    if (!p) { setError("Please enter a password"); return; }
    if (mode === "register") {
      if (!e) { setError("Please enter your email"); return; }
      if (p.length < 4) { setError("Password must be at least 4 characters"); return; }
      if (p !== confirmPassword) { setError("Passwords do not match"); return; }
    }

    setLoading(true);

    try {
      const response = mode === "register"
        ? await authService.register(u, e, p, confirmPassword)
        : await authService.login(u, p);

      if (response.success) {
        if (response.needsEmailVerification) {
          if (response.email) {
            setVerifyEmail(response.email);
            setEmail(response.email);
          }
          setNeedsVerify(true);
        } else if (response.requires2FA) {
          setPending2FA(response.userId);
        } else if (mode === "register") {
          setRegisteredEmail(e);
        } else {
          onAuthSuccess(response);
        }
      } else {
        setError(response.message || "Something went wrong");
      }
    } catch (err) {
      setError(err.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [username, email, password, confirmPassword, mode, onAuthSuccess]);

  const handleResendVerify = useCallback(async () => {
    setResending(true);
    setResentMsg("");
    try {
      const r = await authService.sendVerificationEmail(verifyEmail);
      if (r?.success) {
        setResentMsg("Verification email sent!");
      } else {
        setResentMsg(r?.message || "Failed to send");
      }
    } catch {
      setResentMsg("Connection error");
    }
    setResending(false);
  }, [verifyEmail]);

  const handle2FASubmit = useCallback(async () => {
    if (!twoFACode.trim()) { setError("Please enter your 2FA code"); return; }
    setError("");
    setLoading(true);
    try {
      const response = await authService.verify2FA(pending2FA, twoFACode.trim());
      if (response.success) {
        onAuthSuccess(response);
      } else {
        setError(response.message || "Invalid code");
      }
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }, [twoFACode, pending2FA, onAuthSuccess]);

  const handleGoogleSuccess = useCallback(async (credential) => {
    setError("");
    setLoading(true);
    try {
      const response = await authService.googleLogin(credential);
      if (response.success) {
        onAuthSuccess(response);
      } else {
        setError(response.message || "Google sign-in failed");
      }
    } catch (err) {
      setError(err.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onAuthSuccess]);

  const switchMode = useCallback(() => {
    setMode(m => m === "login" ? "register" : "login");
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setPending2FA(null);
    setTwoFACode("");
    setRegisteredEmail("");
    setNeedsVerify(false);
    setVerifyEmail("");
    setResentMsg("");
    setShowPw(false);
    setLoading(false);
  }, []);

  /* Google Sign-In script */
  useEffect(() => {
    if (!isOpen || !CLIENT_ID || CLIENT_ID === 'your_google_client_id_here') return;

    const script = document.createElement('script');
    script.src = process.env.REACT_APP_GOOGLE_API_URL || 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (res) => {
            if (res.credential) handleGoogleSuccess(res.credential);
            else setError("Google sign-in failed");
          },
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'rectangular',
            text: 'continue_with',
            width: googleBtnRef.current.offsetWidth || 320,
          });
        }
      }
    }, 200);
    return () => { clearInterval(interval); };
  }, [isOpen, CLIENT_ID, handleGoogleSuccess]);

  if (!isOpen) return null;

  const renderForm = () => {
    const isLogin = mode === "login";

    return (
      <div className="auth-split-card">
        <div className="auth-split-image">
          <button className="auth-modal-abs-close" onClick={handleClose}><X size={20} /></button>
          <img src="/anime-girl-auth.jpg" alt="" />
        </div>

        {isLogin ? (
          <div className="auth-split-form">
            <div className="auth-split-form-inner">
              <h1 className="auth-split-title">Welcome back</h1>
              <p className="auth-split-subtitle">Sign in to your animetsu account</p>

              {error && (
                <div className="auth-split-error">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <div className="auth-split-field">
                  <label className="auth-split-label">Username</label>
                  <div className="auth-split-input-wrap">
                    <input
                      className="auth-split-input"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="auth-split-field">
                  <label className="auth-split-label">Password</label>
                  <div className="auth-split-input-wrap">
                    <input
                      className="auth-split-input"
                      type={showPw ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button type="button" className="auth-split-pw-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="auth-split-btn" disabled={loading}>
                  {loading ? <span className="auth-split-spinner" /> : "Sign in"}
                </button>

                <div className="auth-split-forgot">
                  <button type="button" onClick={() => navigate('/auth/forgot-password')}>Forgot your password?</button>
                </div>
              </form>

              {CLIENT_ID && CLIENT_ID !== 'your_google_client_id_here' && (
                <>
                  <div className="auth-split-divider">
                    <span className="auth-split-divider-line" />
                    <span className="auth-split-divider-text">or</span>
                    <span className="auth-split-divider-line" />
                  </div>
                  <div className="auth-split-google" ref={googleBtnRef} />
                </>
              )}

              <div className="auth-split-toggle">
                Don't have an account? <button type="button" onClick={switchMode}>Sign up</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="auth-split-form">
            <div className="auth-split-form-inner">
              <h1 className="auth-split-title">Create your account</h1>
              <p className="auth-split-subtitle">Sign up to get started</p>

              {error && (
                <div className="auth-split-error">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <div className="auth-split-field">
                  <label className="auth-split-label">Username</label>
                  <div className="auth-split-input-wrap">
                    <input
                      className="auth-split-input"
                      type="text"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                      autoComplete="new-username"
                    />
                  </div>
                </div>

                <div className="auth-split-field">
                  <label className="auth-split-label">Email</label>
                  <div className="auth-split-input-wrap">
                    <input
                      className="auth-split-input"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="auth-split-field">
                  <label className="auth-split-label">Password</label>
                  <div className="auth-split-input-wrap">
                    <input
                      className="auth-split-input"
                      type={showPw ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button type="button" className="auth-split-pw-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-split-field">
                  <label className="auth-split-label">Confirm Password</label>
                  <div className="auth-split-input-wrap">
                    <input
                      className="auth-split-input"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button type="submit" className="auth-split-btn" disabled={loading}>
                  {loading ? <span className="auth-split-spinner" /> : "Sign up"}
                </button>
              </form>

              {CLIENT_ID && CLIENT_ID !== 'your_google_client_id_here' && (
                <>
                  <div className="auth-split-divider">
                    <span className="auth-split-divider-line" />
                    <span className="auth-split-divider-text">or</span>
                    <span className="auth-split-divider-line" />
                  </div>
                  <div className="auth-split-google" ref={googleBtnRef} />
                </>
              )}

              <div className="auth-split-toggle">
                Already have an account? <button type="button" onClick={switchMode}>Sign in</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStatus = (content) => (
    <div className="auth-split-card">
      <div className="auth-split-image">
        <button className="auth-modal-abs-close" onClick={handleClose}><X size={20} /></button>
        <img src="/anime-girl-auth.jpg" alt="" />
      </div>
      <div className="auth-split-status">
        {content}
      </div>
    </div>
  );

  const renderContent = () => {
    if (registeredEmail) {
      return renderStatus(
        <>
          <div className="auth-split-status-icon">
            <CheckCircle size={48} />
          </div>
          <h2 className="auth-split-title">Check your email</h2>
          <p className="auth-split-subtitle">
            We sent a verification link to<br />
            <strong className="auth-split-status-highlight">{registeredEmail}</strong>
          </p>
          <p className="auth-split-status-hint">
            Click the link to activate your account, then log in.
          </p>
          <button className="auth-split-btn" onClick={() => { setRegisteredEmail(""); switchMode(); }}>
            Back to login
          </button>
        </>
      );
    }

    if (needsVerify) {
      return renderStatus(
        <>
          <div className="auth-split-status-icon">
            <Mail size={48} />
          </div>
          <h2 className="auth-split-title">Email not verified</h2>
          <p className="auth-split-subtitle">
            Please verify your email before logging in.
          </p>
          {verifyEmail && (
            <p className="auth-split-status-hint">
              We sent a link to <strong className="auth-split-status-highlight">{verifyEmail}</strong>
            </p>
          )}
          {resentMsg && (
            <p className="auth-split-feedback">{resentMsg}</p>
          )}
          <button className="auth-split-btn" onClick={handleResendVerify} disabled={resending}>
            {resending ? "Sending..." : "Resend verification email"}
          </button>
          <button className="auth-split-btn auth-split-btn--back" onClick={() => { setNeedsVerify(false); setError(""); setResentMsg(""); }}>
            Back to login
          </button>
        </>
      );
    }

    if (pending2FA) {
      return renderStatus(
        <>
          <h2 className="auth-split-title">Two-Factor Authentication</h2>
          <p className="auth-split-subtitle">Enter the 6-digit code from your authenticator app</p>
          <div className="auth-split-input-wrap auth-split-2fa-wrap">
            <input
              className="auth-split-input auth-split-input--code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={twoFACode}
              onChange={e => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handle2FASubmit()}
              autoFocus
            />
          </div>
          {error && <div className="auth-split-error"><AlertCircle size={14} />{error}</div>}
          <button className="auth-split-btn" onClick={handle2FASubmit} disabled={loading || twoFACode.length < 6}>
            {loading ? <span className="auth-split-spinner" /> : "Verify"}
          </button>
          <button className="auth-split-btn auth-split-btn--back" onClick={() => { setPending2FA(null); setTwoFACode(""); setError(""); }}>
            Back to login
          </button>
        </>
      );
    }

    return renderForm();
  };

  return (
    <div className="auth-modal-overlay" ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}>
      <div className="auth-modal-container">
        {renderContent()}
      </div>
    </div>
  );
}
