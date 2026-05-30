import React from "react";
import { useNavigate } from "react-router-dom";
import { Film, Users, Settings, Github, Twitter, Instagram, Youtube, Heart, Send } from "lucide-react";
import "./Footer.css";

const SOCIALS = [
  { label: "GitHub", href: "https://github.com", Icon: Github },
  { label: "Twitter", href: "https://twitter.com", Icon: Twitter },
  { label: "Instagram", href: "https://instagram.com", Icon: Instagram },
  { label: "YouTube", href: "https://youtube.com", Icon: Youtube },
];

export default function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-glow" />
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand-row">
              <span className="footer-brand-icon">
                <img src="/logo.png" alt="AnimeWch" className="footer-logo" />
              </span>
              <strong>AnimeWch</strong>
            </div>
            <span>Stream, track, and discover your next favorite anime — all in one place.</span>
            <div className="footer-socials">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social"
                  aria-label={label}
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          <nav className="footer-links" aria-label="Footer navigation">
            <div className="footer-links-col">
              <span className="footer-links-title"><Film size={12} /> Browse</span>
              <button onClick={() => navigate("/browse/anime")}>Anime</button>
              <button onClick={() => navigate("/search")}>Search</button>
            </div>
            <div className="footer-links-col">
              <span className="footer-links-title"><Users size={12} /> Community</span>
              <button onClick={() => navigate("/profile")}>Profile</button>
              <button onClick={() => navigate("/watchlist")}>Watchlist</button>
              <button onClick={() => navigate("/history")}>History</button>
            </div>
            <div className="footer-links-col">
              <span className="footer-links-title"><Settings size={12} /> Support</span>
              <button onClick={() => navigate("/settings")}>Settings</button>
            </div>
          </nav>

          <div className="footer-newsletter">
            <span className="footer-links-title"><Send size={12} /> Stay in the loop</span>
            <p>New episodes, seasonal picks, and community highlights.</p>
            <form
              className="footer-newsletter-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="your@email.com"
                aria-label="Email address"
              />
              <button type="submit" aria-label="Subscribe">
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <p className="footer-copy">&copy; {new Date().getFullYear()} AnimeWch. Not affiliated with any studios.</p>
          <span className="footer-made">
            Made with <Heart size={12} fill="currentColor" /> for anime fans
          </span>
          <div className="footer-badges">
            <span className="footer-badge">React</span>
            <span className="footer-badge">AniList</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
