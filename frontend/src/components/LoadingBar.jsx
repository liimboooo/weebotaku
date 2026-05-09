import "./LoadingBar.css";

export default function LoadingBar({ show }) {
  if (!show) return null;
  return (
    <div id="loading-bar-spinner" className="spinner">
      <div className="spinner-icon" />
    </div>
  );
}
