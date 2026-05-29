import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AuthImage from "../components/AuthImage";
import authService from "../services/authService";
import { CheckCircle, XCircle, Loader, Eye, EyeOff } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./AuthPage.css";

export default function ResetPasswordPage() {
  useDocumentTitle("Reset Password");
  const { token } = useParams();
  const navigate = useNavigate();
  const [valid, setValid] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authService.validateResetToken(token);
        if (cancelled) return;
        setValid(res?.success && res?.valid);
      } catch {
        if (cancelled) return;
        setValid(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const validatePassword = (pw) => {
    const errors = [];
    if (pw.length < 8) errors.push("Min 8 characters");
    if (!/[A-Z]/.test(pw)) errors.push("1 uppercase letter");
    if (!/[0-9]/.test(pw)) errors.push("1 number");
    return errors;
  };

  const strength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "#ff6b6b", "#fbbf24", "#667eea", "#4ade80"];
    return { label: labels[s], color: colors[s], width: `${s * 25}%` };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const pwErrors = validatePassword(password);
    if (pwErrors.length) { setError(pwErrors.join(" · ")); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      const res = await authService.resetPassword(token, password);
      if (res?.success) {
        setDone(true);
      } else {
        setError(res?.message || "Failed to reset password");
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  };

  if (valid === null) {
    return (
      <div className="auth-container">
        <div className="auth-form" style={{ textAlign: "center", padding: "3rem 0" }}>
          <Loader size={40} className="auth-spinner" style={{ color: "#667eea", marginBottom: "1rem" }} />
          <p style={{ color: "#888" }}>Validating your link...</p>
        </div>
        <AuthImage />
      </div>
    );
  }

  if (valid === false) {
    return (
      <div className="auth-container">
        <div className="auth-form" style={{ textAlign: "center", padding: "2rem 0" }}>
          <XCircle size={56} color="#ff6b6b" style={{ marginBottom: "1rem" }} />
          <h2 style={{ color: "#fff", fontSize: "22px", margin: "0 0 0.5rem" }}>Invalid or expired link</h2>
          <p style={{ color: "#888", marginBottom: "1.5rem" }}>This password reset link is no longer valid.</p>
          <Link to="/auth/forgot-password" style={{ display: "block", color: "#667eea", textDecoration: "none", fontWeight: 500 }}>
            Request a new reset link
          </Link>
        </div>
        <AuthImage />
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-container">
        <div className="auth-form" style={{ textAlign: "center", padding: "2rem 0" }}>
          <CheckCircle size={56} color="#4ade80" style={{ marginBottom: "1rem" }} />
          <h2 style={{ color: "#fff", fontSize: "22px", margin: "0 0 0.5rem" }}>Password updated!</h2>
          <p style={{ color: "#888", marginBottom: "1.5rem" }}>Your password has been reset successfully.</p>
          <button className="auth-submit" onClick={() => navigate("/")} style={{ width: "100%" }}>
            Login with new password
          </button>
        </div>
        <AuthImage />
      </div>
    );
  }

  const pw = strength(password);

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2 className="auth-title">Reset your password</h2>
        <p className="auth-subtitle">Choose a new password for your account.</p>
        <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
          <div className="auth-field">
            <label className="auth-label">New Password</label>
            <div style={{ position: "relative" }}>
              <input
                className="auth-input"
                type={showPw ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: "2.5rem", width: "100%" }}
                autoFocus
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#666", cursor: "pointer" }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <>
                <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.06)", marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: pw.color, width: pw.width, transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: 11, color: pw.color, marginTop: 2 }}>{pw.label}</span>
              </>
            )}
          </div>
          <div className="auth-field" style={{ marginTop: "1rem" }}>
            <label className="auth-label">Confirm New Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="Re-enter new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          {error && <p className="auth-error" style={{ marginTop: "0.75rem" }}>{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading || !password} style={{ marginTop: "1rem", width: "100%" }}>
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
        <Link to="/" style={{ display: "block", textAlign: "center", color: "#667eea", textDecoration: "none", fontWeight: 500, marginTop: "1.25rem", fontSize: "13px" }}>
          Back to login
        </Link>
      </div>
      <AuthImage />
    </div>
  );
}
