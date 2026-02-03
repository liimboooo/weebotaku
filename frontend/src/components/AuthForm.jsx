import React from "react";

export default function AuthForm({
  type,
  username,
  password,
  setUsername,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onSubmit,
  onModeChange,
  onGoogleLogin
}) {
  return (
    <div key={type} className={`auth-card ${type}`}>

      <h2 className="auth-title">
        {type === "login" ? "Login" : "Register"}
      </h2>

      {/* Username */}
      <input
        className="auth-input"
        placeholder="Username / Email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      {/* Password */}
      <input
        className="auth-input"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {/* ✅ REGISTER ONLY */}
      {type === "register" && (
        <input
          className="auth-input"
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      )}

      {/* Toggle */}
      <p
        style={{ color: "white", textAlign: "center", marginTop: "1px" }}
        className="auth-toggle"
      >
        {type === "login" ? "No account?" : "Already have an account?"}{" "}
        <span onClick={onModeChange}>
          {type === "login" ? "Register" : "Login"}
        </span>
      </p>

      {/* Google login (keep same style, optional logic later) */}
      <button className="google-button" onClick={onGoogleLogin}>
        {/* SVG stays unchanged */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" width="24" height="24">
          <path fill="#4285F4" d="M533.5 278.4c0-18.9-1.7-37-4.9-54.5H272v103h146.9c-6.3 33.7-25.3 62.3-54.3 81.4v67.3h87.6c51.3-47.3 80.3-116.7 80.3-197.2z"/>
          <path fill="#34A853" d="M272 544.3c73.6 0 135.3-24.3 180.4-66.3l-87.6-67.3c-24.3 16.3-55.4 25.7-92.8 25.7-71 0-131-47.9-152.4-112.3H31.7v70.5C76.4 482.7 168.6 544.3 272 544.3z"/>
          <path fill="#FBBC05" d="M119.6 324.9c-11.5-34.4-11.5-71.6 0-106l-87.9-70.5C7.2 198 0 236.5 0 272s7.2 74 31.7 123.6l87.9-70.5z"/>
          <path fill="#EA4335" d="M272 107.7c38 0 72.1 13.1 98.8 34.5l74-74C407.3 24.3 345.6 0 272 0 168.6 0 76.4 61.6 31.7 147.8l87.9 70.5C141 155.6 201 107.7 272 107.7z"/>
        </svg>
      </button>

      {/* Submit */}
      <button className="auth-button" aria-label="Submit" onClick={onSubmit}>
        <span className="arrow-wrap">
          <svg className="arrow" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12H19M19 12L13 6M19 12L13 18"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>
  );
}
