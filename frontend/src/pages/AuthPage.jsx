import { useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import AuthImage from "../components/AuthImage";
import authService from "../services/authService";
import { syncFromBackend } from "../services/storage";
import { Mail, CheckCircle } from "lucide-react";
import "./AuthPage.css";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/home";
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        ? await authService.register(u, e, p, p)
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
  }, [username, email, password, mode, onAuthSuccess]);

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
        <div className="auth-form">
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <CheckCircle size={48} color="#4ade80" style={{ marginBottom: "1rem" }} />
            <h2 className="auth-title" style={{ fontSize: "22px" }}>Check your email</h2>
            <p className="auth-subtitle" style={{ lineHeight: "1.5" }}>
              We sent a verification link to<br />
              <strong style={{ color: "#c4b5fd" }}>{registeredEmail}</strong>
            </p>
            <p className="auth-subtitle" style={{ fontSize: "13px", marginTop: "0.75rem" }}>
              Click the link to activate your account, then log in.
            </p>
          </div>
          <button className="auth-switch" onClick={() => { setRegisteredEmail(""); switchMode(); }} style={{ width: "100%", marginTop: "0.5rem" }}>
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
        <div className="auth-form">
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <Mail size={48} color="#fbbf24" style={{ marginBottom: "1rem" }} />
            <h2 className="auth-title" style={{ fontSize: "22px" }}>Email not verified</h2>
            <p className="auth-subtitle" style={{ lineHeight: "1.5" }}>
              Please verify your email before logging in.
            </p>
            {verifyEmail && (
              <p style={{ color: "#888", fontSize: "13px", marginTop: "0.5rem" }}>
                We sent a link to <strong style={{ color: "#c4b5fd" }}>{verifyEmail}</strong>
              </p>
            )}
          </div>
          {resentMsg && (
            <p style={{ color: resentMsg.includes("sent") ? "#4ade80" : "#ff6b6b", fontSize: "13px", textAlign: "center", marginBottom: "0.75rem" }}>
              {resentMsg}
            </p>
          )}
          <button className="auth-submit" onClick={handleResendVerify} disabled={resending}>
            {resending ? "Sending..." : "Resend verification email"}
          </button>
          <button className="auth-switch" onClick={() => { setNeedsVerify(false); setError(""); setResentMsg(""); }} style={{ width: "100%", marginTop: "0.5rem" }}>
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
        <div className="auth-form">
          <h2 className="auth-title">Two-Factor Authentication</h2>
          <p className="auth-subtitle">Enter the 6-digit code from your authenticator app</p>
          <div className="auth-field" style={{ marginTop: "1.5rem" }}>
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
          {error && <p className="auth-error" style={{ marginTop: "0.75rem" }}>{error}</p>}
          <button
            className="auth-submit"
            onClick={handle2FASubmit}
            disabled={loading || twoFACode.length < 6}
            style={{ marginTop: "1rem" }}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
          <button className="auth-switch" onClick={() => { setPending2FA(null); setTwoFACode(""); setError(""); }} style={{ marginTop: "0.75rem" }}>
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
        onSubmit={handleSubmit}
        onModeChange={switchMode}
        error={error}
        loading={loading}
        onGoogleSuccess={handleGoogleSuccess}
        onGoogleError={(msg) => setError(msg)}
      />
      <AuthImage />
    </div>
  );
}
