import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AuthImage from "../components/AuthImage";
import authService from "../services/authService";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import "../pages/AuthPage.css";

export default function SyncCallbackMAL() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [imported, setImported] = useState(0);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) { setStatus("error"); setMessage("No authorization code received"); return; }

    const codeVerifier = localStorage.getItem("mal_code_verifier");
    localStorage.removeItem("mal_code_verifier");

    (async () => {
      try {
        const res = await authService.syncMALCallback(code, codeVerifier);
        if (res?.success) {
          setStatus("success");
          setImported(res.imported || 0);
          setMessage(`Connected to MAL! Synced ${res.imported || 0} titles.`);
          setTimeout(() => navigate("/settings?page=integrations", { replace: true }), 2500);
        } else {
          setStatus("error");
          setMessage(res?.message || "Failed to connect MAL");
        }
      } catch (err) {
        setStatus("error");
        setMessage(err.message || "Connection failed");
      }
    })();
  }, [searchParams, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-form" style={{ textAlign: "center", padding: "3rem 0" }}>
        {status === "loading" && (
          <>
            <Loader size={40} className="auth-spinner" style={{ color: "#ffffff", marginBottom: "1rem" }} />
            <p style={{ color: "#ffffff" }}>Connecting to MyAnimeList...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle size={56} color="#4ade80" style={{ marginBottom: "1rem" }} />
            <h2 style={{ color: "#fff", fontSize: "22px", margin: "0 0 0.5rem" }}>MAL connected!</h2>
            <p style={{ color: "#ffffff", marginBottom: "0.5rem" }}>{message}</p>
            <p style={{ color: "#ffffff", fontSize: "13px" }}>Redirecting to settings...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={56} color="#ff6b6b" style={{ marginBottom: "1rem" }} />
            <h2 style={{ color: "#fff", fontSize: "22px", margin: "0 0 0.5rem" }}>Connection failed</h2>
            <p style={{ color: "#ffffff", marginBottom: "1.5rem" }}>{message}</p>
            <button className="auth-submit" onClick={() => navigate("/settings?page=integrations", { replace: true })}>
              Back to settings
            </button>
          </>
        )}
      </div>
      <AuthImage />
    </div>
  );
}
