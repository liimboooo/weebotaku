import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import AuthImage from "../components/AuthImage";

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
    await new Promise(r => setTimeout(r, 800));

    localStorage.setItem("username", u);
    localStorage.setItem("isLoggedIn", "true");
    if (!localStorage.getItem("memberSince")) {
      localStorage.setItem("memberSince", String(new Date().getFullYear()));
    }
    navigate("/home");
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
