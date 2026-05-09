import "./Loader.css";

export default function Loader({ text = "Loading...", fullScreen = false }) {
  return (
    <div className={`loader ${fullScreen ? "loader-fullscreen" : ""}`}>
      <div className="loader-circle" />
      {text && <span className="loader-text">{text}</span>}
    </div>
  );
}
