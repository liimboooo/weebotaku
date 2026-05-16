import { useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import AuthImage from "../components/AuthImage";
import authService from "../services/authService";
import { syncFromBackend } from "../services/storage";
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

  const onAuthSuccess = useCallback((response) => {
    localStorage.setItem("username", response.user.username);
    localStorage.setItem("isLoggedIn", "true");
    if (!localStorage.getItem("memberSince")) {
      localStorage.setItem("memberSince", String(response.user.memberSince || new Date().getFullYear()));
    }
    if (response.user.avatar) {
      localStorage.setItem("userAvatar", response.user.avatar);
    }
    if (response.user.statusMessage) {
      localStorage.setItem("userStatusMessage", response.user.statusMessage);
    }
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
        onAuthSuccess(response);
      } else {
        setError(response.message || "Something went wrong");
      }
    } catch (err) {
      setError(err.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [username, email, password, mode, navigate, onAuthSuccess]);

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
    setLoading(false);
  }, []);

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
