import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import AuthImage from "../components/AuthImage";
import authService from "../services/authService";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./AuthPage.css";

export default function ForgotPasswordPage() {
  useDocumentTitle("Forgot Password");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) { setError("Enter your email"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      if (res?.success) {
        setSent(true);
        let sec = 60;
        setCooldown(sec);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => { sec--; setCooldown(sec); if (sec <= 0) { clearInterval(cooldownRef.current); cooldownRef.current = null; } }, 1000);
      } else {
        setError(res?.message || "Something went wrong");
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        {!sent ? (
          <>
            <div style={{ marginBottom: "1.5rem" }}>
              <Mail size={40} color="#667eea" style={{ marginBottom: "0.75rem" }} />
              <h2 className="auth-title">Forgot password?</h2>
              <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <input
                  className="auth-input"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <p className="auth-error" style={{ marginTop: "0.5rem" }}>{error}</p>}
              <button className="auth-submit" type="submit" disabled={loading} style={{ marginTop: "1rem" }}>
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <Link to="/" style={{ display: "block", textAlign: "center", color: "#667eea", textDecoration: "none", fontWeight: 500, marginTop: "1.25rem", fontSize: "13px" }}>
              <ArrowLeft size={14} style={{ display: "inline", marginRight: 4 }} />
              Back to login
            </Link>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <CheckCircle size={48} color="#4ade80" style={{ marginBottom: "1rem" }} />
              <h2 className="auth-title" style={{ fontSize: "22px" }}>Check your email</h2>
              <p className="auth-subtitle">If an account with <strong style={{ color: "#c4b5fd" }}>{email}</strong> exists, you'll get a reset link shortly.</p>
            </div>
            {cooldown > 0 ? (
              <p style={{ color: "#666", fontSize: "13px", textAlign: "center" }}>Resend available in {cooldown}s</p>
            ) : (
              <button className="auth-submit" onClick={handleSubmit} disabled={loading} style={{ marginTop: "0.5rem" }}>
                Resend link
              </button>
            )}
            <Link to="/" style={{ display: "block", textAlign: "center", color: "#667eea", textDecoration: "none", fontWeight: 500, marginTop: "1.25rem", fontSize: "13px" }}>
              Back to login
            </Link>
          </>
        )}
      </div>
      <AuthImage />
    </div>
  );
}
