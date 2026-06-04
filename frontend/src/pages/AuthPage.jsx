import { useCallback, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import AuthImage from "../components/AuthImage";
import authService from "../services/authService";
import { syncFromBackend } from "../services/storage";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./AuthPage.css";

export default function AuthPage() {
  useDocumentTitle("AnimeWch");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("next") || location.state?.from || "/home";
  const [mode, setMode] = useState("login");
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

  const onAuthSuccess = useCallback(() => {
    syncFromBackend().catch(() => {});
    navigate(from, { replace: true });
  }, [navigate, from]);

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
    setPending2FA(null);
    setTwoFACode("");
    setRegisteredEmail("");
    setNeedsVerify(false);
    setVerifyEmail("");
    setResentMsg("");
    setLoading(false);
  }, []);

  if (registeredEmail) {
    return (
      <div className="auth-container">
        <div className="auth-card auth-status-card">
          <div className="auth-status-icon auth-status-icon--success">
            <CheckCircle size={48} />
          </div>
          <h2 className="auth-title">Check your email</h2>
          <p className="auth-subtitle">
            We sent a verification link to<br />
            <strong className="auth-highlight">{registeredEmail}</strong>
          </p>
          <p className="auth-subtitle auth-hint">
            Click the link to activate your account, then log in.
          </p>
          <button className="auth-button" onClick={() => { setRegisteredEmail(""); switchMode(); }}>
            Back to login
          </button>
        </div>
        <AuthImage />
      </div>
    );
  }

  if (needsVerify) {
    return (
      <div className="auth-container">
        <div className="auth-card auth-status-card">
          <div className="auth-status-icon auth-status-icon--warning">
            <Mail size={48} />
          </div>
          <h2 className="auth-title">Email not verified</h2>
          <p className="auth-subtitle">
            Please verify your email before logging in.
          </p>
          {verifyEmail && (
            <p className="auth-hint">
              We sent a link to <strong className="auth-highlight">{verifyEmail}</strong>
            </p>
          )}
          {resentMsg && (
            <p className={`auth-feedback ${resentMsg.includes("sent") ? "auth-feedback--ok" : "auth-feedback--err"}`}>
              {resentMsg}
            </p>
          )}
          <button className="auth-button" onClick={handleResendVerify} disabled={resending}>
            {resending ? "Sending..." : "Resend verification email"}
          </button>
          <button className="auth-back-btn" onClick={() => { setNeedsVerify(false); setError(""); setResentMsg(""); }}>
            Back to login
          </button>
        </div>
        <AuthImage />
      </div>
    );
  }

  if (pending2FA) {
    return (
      <div className="auth-container">
        <div className="auth-card auth-status-card">
          <h2 className="auth-title">Two-Factor Authentication</h2>
          <p className="auth-subtitle">Enter the 6-digit code from your authenticator app</p>
          <div className="auth-input-wrap auth-2fa-wrap">
            <input
              className="auth-input auth-input--code"
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
          {error && <div className="auth-error"><AlertCircle size={14} />{error}</div>}
          <button
            className="auth-button"
            onClick={handle2FASubmit}
            disabled={loading || twoFACode.length < 6}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
          <button className="auth-back-btn" onClick={() => { setPending2FA(null); setTwoFACode(""); setError(""); }}>
            Back to login
          </button>
        </div>
        <AuthImage />
      </div>
    );
  }

  return (
    <div className="auth-container">
      <AuthForm
        key={mode}
        type={mode}
        username={username}
        email={email}
        password={password}
        setUsername={setUsername}
        setEmail={setEmail}
        setPassword={setPassword}
        setConfirmPassword={setConfirmPassword}
        onSubmit={handleSubmit}
        onModeChange={switchMode}
        error={error}
        setError={setError}
        loading={loading}
        onGoogleSuccess={handleGoogleSuccess}
        onGoogleError={(msg) => setError(msg)}
      />
      <AuthImage />
    </div>
  );
}
