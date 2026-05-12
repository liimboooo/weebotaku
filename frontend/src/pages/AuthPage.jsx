import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import AuthImage from "../components/AuthImage";
import authService from "../services/authService";
import { syncFromBackend } from "../services/storage";

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      let response;
      if (mode === "register") {
        response = await authService.register(u, e, p, p);
      } else {
        response = await authService.login(u, p);
      }

      if (response.success) {
        // Also set localStorage keys the frontend components still read
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
        // Sync user data from backend (fire and forget)
        syncFromBackend().catch(() => {});
        navigate("/home");
      } else {
        setError(response.message || "Something went wrong");
      }
    } catch (err) {
      setError(err.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [username, email, password, mode, navigate]);

  const switchMode = useCallback(() => {
    setMode(m => m === "login" ? "register" : "login");
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setLoading(false);
  }, []);

  return (
    <div className="container">
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
      />
      <AuthImage />
    </div>
  );
}
