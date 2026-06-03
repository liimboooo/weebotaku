import { Link } from "react-router-dom";
import "./PosterCard.css";

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' fill='%2318181b'/%3E";

export default function PosterCard({ to, image, title, format, year, onMouseEnter, onMouseLeave }) {
  return (
    <Link to={to} className="pc-card"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="pc-img-wrap">
        <img src={image || FALLBACK_IMG} alt={title} loading="lazy" />
        <div className="pc-img-hover">
          <div className="pc-img-hover-play">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"/></svg>
          </div>
        </div>
        {(format || year) && (
          <div className="pc-badges">
            {format && <span className="pc-badge">{format}</span>}
            {year && <span className="pc-badge">{year}</span>}
          </div>
        )}
      </div>
      <p className="pc-title">{title || "Untitled"}</p>
    </Link>
  );
}
