import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import AuthImage from "../components/AuthImage";

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit() {
    if (username.trim() === "") {
      alert("Please enter a username");
      return;
    }
    localStorage.setItem("username", username);
    localStorage.setItem("isLoggedIn", "true");
    navigate("/home");
  }

  return (
    <div className="container">
      <AuthForm
        key={mode}
        type={mode}
        username={username}
        password={password}
        setUsername={setUsername}
        setPassword={setPassword}
        onSubmit={handleSubmit}
        onModeChange={() =>
          setMode(mode === "login" ? "register" : "login")
        }
      />
      <AuthImage />
    </div>
  );
}
