import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AuthImage from "../components/AuthImage";
import authService from "../services/authService";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import "./AuthPage.css";

export default function VerifyEmailPage() {
  useDocumentTitle("Verify Email");
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authService.verifyEmailToken(token);
        if (cancelled) return;
        if (res?.success) {
          setStatus("success");
          setMessage(res.message || "Email verified!");
        } else {
          setStatus("error");
          setMessage(res?.message || "Invalid or expired link");
        }
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Verification failed. The link may be invalid or expired.");
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="auth-container">
      <div className="auth-form">
        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <Loader size={40} className="auth-spinner" style={{ color: "#ffffff", marginBottom: "1rem" }} />
            <p style={{ color: "#ffffff" }}>Verifying your email...</p>
          </div>
        )}
        {status === "success" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <CheckCircle size={56} color="#4ade80" style={{ marginBottom: "1rem" }} />
            <h2 style={{ color: "#fff", fontSize: "22px", margin: "0 0 0.5rem" }}>Email verified!</h2>
            <p style={{ color: "#ffffff", marginBottom: "1.5rem" }}>{message}</p>
            <button className="auth-submit" onClick={() => navigate("/auth")} style={{ width: "100%" }}>
              Login now
            </button>
          </div>
        )}
        {status === "error" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <XCircle size={56} color="#ffffff" style={{ marginBottom: "1rem" }} />
            <h2 style={{ color: "#fff", fontSize: "22px", margin: "0 0 0.5rem" }}>Verification failed</h2>
            <p style={{ color: "#ffffff", marginBottom: "1.5rem" }}>{message}</p>
            <Link to="/" style={{ display: "block", color: "#ffffff", textDecoration: "none", fontWeight: 500, marginTop: "0.75rem" }}>
              Back to login
            </Link>
          </div>
        )}
      </div>
      <AuthImage />
    </div>
  );
}
