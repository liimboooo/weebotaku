import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Film, Users, Settings, Heart, Send, Check } from "lucide-react";
import "./Footer.css";

/* Brand logos as inline SVG (lucide-react v1 dropped brand icons) */
const GithubIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.6 8.21 11.16.6.11.82-.25.82-.56v-2.01c-3.34.7-4.04-1.4-4.04-1.4-.55-1.36-1.34-1.72-1.34-1.72-1.09-.72.08-.71.08-.71 1.2.08 1.83 1.2 1.83 1.2 1.07 1.78 2.81 1.27 3.5.97.11-.76.42-1.27.76-1.56-2.67-.29-5.47-1.29-5.47-5.74 0-1.27.46-2.31 1.2-3.12-.12-.29-.52-1.46.11-3.05 0 0 .98-.3 3.2 1.19a11.3 11.3 0 0 1 5.83 0c2.22-1.49 3.2-1.19 3.2-1.19.63 1.59.23 2.76.11 3.05.75.81 1.2 1.85 1.2 3.12 0 4.46-2.81 5.44-5.49 5.73.43.36.81 1.08.81 2.18v3.23c0 .31.22.68.83.56C20.57 21.88 24 17.49 24 12.29 24 5.78 18.63.5 12 .5z" />
  </svg>
);
const TwitterIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
  </svg>
);
const InstagramIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.62c-3.15 0-3.52.01-4.76.07-.92.04-1.42.2-1.75.33-.44.17-.75.37-1.08.7-.33.33-.53.64-.7 1.08-.13.33-.29.83-.33 1.75-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.04.92.2 1.42.33 1.75.17.44.37.75.7 1.08.33.33.64.53 1.08.7.33.13.83.29 1.75.33 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c.92-.04 1.42-.2 1.75-.33.44-.17.75-.37 1.08-.7.33-.33.53-.64.7-1.08.13-.33.29-.83.33-1.75.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.04-.92-.2-1.42-.33-1.75a2.9 2.9 0 0 0-.7-1.08 2.9 2.9 0 0 0-1.08-.7c-.33-.13-.83-.29-1.75-.33-1.24-.06-1.61-.07-4.76-.07zm0 2.76a5.46 5.46 0 1 1 0 10.92 5.46 5.46 0 0 1 0-10.92zm0 9a3.54 3.54 0 1 0 0-7.08 3.54 3.54 0 0 0 0 7.08zm6.95-9.2a1.27 1.27 0 1 1-2.55 0 1.27 1.27 0 0 1 2.55 0z" />
  </svg>
);
const YoutubeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
  </svg>
);

const SOCIALS = [
  { label: "GitHub", href: "https://github.com", Icon: GithubIcon },
  { label: "Twitter", href: "https://twitter.com", Icon: TwitterIcon },
  { label: "Instagram", href: "https://instagram.com", Icon: InstagramIcon },
  { label: "YouTube", href: "https://youtube.com", Icon: YoutubeIcon },
];

function loadSubscribedEmails() {
  try { return JSON.parse(localStorage.getItem('newsletter_emails') || '[]'); } catch { return []; }
}
function saveSubscribedEmail(email) {
  const list = loadSubscribedEmails();
  if (!list.includes(email)) { list.push(email); localStorage.setItem('newsletter_emails', JSON.stringify(list)); }
}

export default function Footer() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-glow" />
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand-row">
              <span className="footer-brand-icon">
                <img src="/logo.svg" alt="Otaku" className="footer-logo" />
              </span>
              <strong>Otaku</strong>
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
              <button onClick={() => navigate("/browse/anime")}>Search</button>
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
              onSubmit={(e) => {
                e.preventDefault();
                if (email) { saveSubscribedEmail(email); setSubscribed(true); setEmail(""); setTimeout(() => setSubscribed(false), 5000); }
              }}
            >
              <input
                type="email"
                placeholder="your@email.com"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" aria-label="Subscribe">
                {subscribed ? <Check size={15} /> : <Send size={15} />}
              </button>
            </form>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <p className="footer-copy">&copy; {new Date().getFullYear()} Otaku. Not affiliated with any studios.</p>
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
