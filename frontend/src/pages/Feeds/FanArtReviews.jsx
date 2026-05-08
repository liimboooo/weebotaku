import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brush,
  Eye,
  Heart,
  MessageSquare,
  Palette,
  Sparkles,
  Star,
} from "lucide-react";
import AnimatedPage from "../../components/AnimatedPage";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Background from "../../components/Background";
import "./FanArtReviews.css";

const featuredArt = [
  {
    title: "Crimson Bloom",
    artist: "@kuroline",
    anime: "Jujutsu Kaisen",
    image: "/beta-1.jpg",
    label: "Cover Study",
    likes: "14.2k",
    comments: "412",
    note: "Ink-heavy composition with a neon pulse and brutal contrast.",
  },
  {
    title: "Sea of Rebellion",
    artist: "@saltstrokes",
    anime: "One Piece",
    image: "/beta-2.jpg",
    label: "Motion Edit",
    likes: "22.8k",
    comments: "901",
    note: "A cinematic poster edit built around motion blur and flame text.",
  },
  {
    title: "After the Finale",
    artist: "@noircanvas",
    anime: "Attack on Titan",
    image: "/beta-3.jpg",
    label: "Editorial",
    likes: "10.7k",
    comments: "278",
    note: "A monochrome tribute with a single red fracture line through the frame.",
  },
];

const spotlightReviews = [
  {
    score: "9.8",
    title: "Why this arc feels hand-painted",
    author: "@paperwolf",
    body: "A review built like a zine: color theory, panel rhythm, and the emotional weight hiding in the margins.",
  },
  {
    score: "9.5",
    title: "The anatomy of a perfect fan poster",
    author: "@glowdraft",
    body: "From silhouette balance to typography choice, this breakdown turns every edit into a small masterclass.",
  },
  {
    score: "9.2",
    title: "How a single frame became a fandom icon",
    author: "@reelink",
    body: "A tight look at composition, reaction culture, and the way a great image outlives the episode it came from.",
  },
];

const submissionSteps = [
  {
    title: "Upload art",
    description: "Fan edits, sketches, posters, and redraws all live here.",
  },
  {
    title: "Credit properly",
    description: "Tag the original artist and mention the anime in the caption.",
  },
  {
    title: "Go live together",
    description: "Pair the piece with a watch room and turn it into a shared premiere.",
  },
];

export default function FanArtReviews() {
  return (
    <AnimatedPage>
      <div className="fan-art-page">
        <Background />
        <Header />

        <main className="fan-art-shell">
          <motion.section
            className="fan-art-hero"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="fan-art-hero-copy">
              <span className="fan-art-eyebrow">Live canvas</span>
              <h1>Fan Art & Reviews</h1>
              <p>
                A neon gallery for redraws, poster edits, long-form critiques, and the kind of work that makes the
                fandom stop scrolling.
              </p>

              <div className="fan-art-actions">
                <button type="button" className="fan-art-primary-btn">
                  Submit your art
                  <ArrowRight size={16} />
                </button>
                <button type="button" className="fan-art-secondary-btn">
                  Browse watch rooms
                </button>
              </div>

              <div className="fan-art-metrics">
                <article>
                  <strong>128</strong>
                  <span>new pieces today</span>
                </article>
                <article>
                  <strong>24k</strong>
                  <span>community votes</span>
                </article>
                <article>
                  <strong>9.6</strong>
                  <span>average review score</span>
                </article>
              </div>
            </div>

            <div className="fan-art-hero-panel">
              <motion.div className="fan-art-orb fan-art-orb--one" animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity }} />
              <motion.div className="fan-art-orb fan-art-orb--two" animate={{ y: [0, 12, 0] }} transition={{ duration: 7, repeat: Infinity }} />

              <div className="fan-art-hero-card">
                <div className="fan-art-hero-card-top">
                  <Palette size={18} />
                  <span>Featured drop</span>
                </div>
                <h2>Poster-grade edits. Critique-grade writing.</h2>
                <p>
                  The page is designed like a studio wall: every card feels pinned, annotated, and alive with motion.
                </p>
                <div className="fan-art-hero-tags">
                  <span><Sparkles size={14} /> Fresh uploads</span>
                  <span><Heart size={14} /> Community picks</span>
                  <span><Star size={14} /> Staff spotlight</span>
                </div>
              </div>
            </div>
          </motion.section>

          <section className="fan-art-section">
            <div className="fan-art-section-head">
              <div>
                <span className="fan-art-section-kicker">Gallery</span>
                <h2>Curated pieces worth a pause</h2>
              </div>
              <p>Hover for glow. Open a piece and feel the composition breathe.</p>
            </div>

            <div className="fan-art-grid">
              {featuredArt.map((piece, index) => (
                <motion.article
                  key={piece.title}
                  className="fan-art-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.35 }}
                  whileHover={{ y: -6, rotateX: -2, rotateY: 2, scale: 1.02 }}
                >
                  <div className="fan-art-card-image-wrap">
                    <img src={piece.image} alt={piece.title} className="fan-art-card-image" />
                    <div className="fan-art-card-badge">{piece.label}</div>
                    <div className="fan-art-card-overlay">
                      <div>
                        <strong>{piece.title}</strong>
                        <span>{piece.anime}</span>
                      </div>
                      <span className="fan-art-card-artist">{piece.artist}</span>
                    </div>
                  </div>

                  <div className="fan-art-card-body">
                    <p>{piece.note}</p>
                    <div className="fan-art-card-stats">
                      <span><Heart size={13} /> {piece.likes}</span>
                      <span><MessageSquare size={13} /> {piece.comments}</span>
                      <span><Eye size={13} /> Open</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>

          <section className="fan-art-reviews-layout">
            <article className="fan-art-reviews-panel">
              <div className="fan-art-section-head compact">
                <div>
                  <span className="fan-art-section-kicker">Review room</span>
                  <h2>Critics, but make it cinematic</h2>
                </div>
              </div>

              <div className="fan-art-review-list">
                {spotlightReviews.map((review) => (
                  <motion.div
                    key={review.title}
                    className="fan-art-review-card"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="fan-art-review-score">{review.score}</div>
                    <div>
                      <h3>{review.title}</h3>
                      <p>{review.body}</p>
                      <span>{review.author}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </article>

            <aside className="fan-art-submit-panel">
              <div className="fan-art-section-head compact">
                <div>
                  <span className="fan-art-section-kicker">Submission board</span>
                  <h2>How to land on the wall</h2>
                </div>
              </div>

              <div className="fan-art-steps">
                {submissionSteps.map((step, index) => (
                  <article key={step.title} className="fan-art-step">
                    <div className="fan-art-step-index">0{index + 1}</div>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="fan-art-callout">
                <Brush size={18} />
                <div>
                  <strong>Want it featured?</strong>
                  <p>Pair your art with a watch room and turn the post into an event.</p>
                </div>
              </div>
            </aside>
          </section>
        </main>

        <Footer />
      </div>
    </AnimatedPage>
  );
}
