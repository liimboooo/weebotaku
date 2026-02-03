import { useState } from "react";
import AuthForm from "../components/AuthForm";
import AuthImage from "../components/AuthImage";


export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit() {
    if (mode === "login") {
      console.log("LOGIN", { username, password });
    } else {
      console.log("REGISTER", { username, password });
    }
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
