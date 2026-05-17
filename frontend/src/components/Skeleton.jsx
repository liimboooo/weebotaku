import "./Skeleton.css";

const variants = {
  text: "sk-text",
  title: "sk-title",
  avatar: "sk-avatar",
  image: "sk-image",
  card: "sk-card",
  line: "sk-line",
};

export default function Skeleton({ variant = "text", width, height, count = 1, gap = 12, style = {}, className = "" }) {
  if (count > 1) {
    return (
      <div className={`sk-group ${className}`} style={{ display: "flex", flexDirection: "column", gap }}>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={`skeleton ${variants[variant] || variants.text}`}
            style={{ width, height, ...style }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`skeleton ${variants[variant] || variants.text} ${className}`}
      style={{ width, height, ...style }}
    />
  );
}
