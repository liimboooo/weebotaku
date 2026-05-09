import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedPage from "../../components/AnimatedPage";
import Header from "../../components/Header";
import Background from "../../components/Background";
import "./ArenaShowcase.css";

const pulseCards = [
	{
		title: "Current temperature",
		description: "Votes, tiers, and hall-of-fame boards are all linked through the same arena language.",
		badge: "Hot",
		meta: "Live now",
	},
	{
		title: "Fast entry",
		description: "One click from the hub gets you into battles, tier lists, or ranked boards immediately.",
		badge: "Quick jump",
		meta: "Zero friction",
	},
	{
		title: "Fan energy",
		description: "The section is built to feel like a packed arena instead of a plain content grid.",
		badge: "Crowd",
		meta: "All signal",
	},
];

export default function Overview() {
	const navigate = useNavigate();

	return (
		<AnimatedPage>
			<div className="arena-page">
				<Background />
				<Header />
				<main className="arena-shell">
					<motion.section className="arena-hero" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
						<div className="arena-copy">
							<span className="arena-eyebrow">Arena overview</span>
							<h1 className="arena-title">Momentum snapshot</h1>
							<p className="arena-lede">A condensed read on the arena so the section has a clear starting point before you dive into battles or tier boards.</p>
							<div className="arena-actions">
								<button className="arena-action primary" type="button" onClick={() => navigate("/arena/character-battle")}>Enter battles</button>
								<button className="arena-action secondary" type="button" onClick={() => navigate("/arena/tier-lists")}>Open tier lists</button>
							</div>
							<div className="arena-stat-grid">
								{[
									{ value: "3", label: "active channels" },
									{ value: "2", label: "live entry points" },
									{ value: "∞", label: "fan momentum" },
								].map((stat) => (
									<article className="arena-stat-card" key={stat.label}>
										<strong>{stat.value}</strong>
										<span>{stat.label}</span>
									</article>
								))}
							</div>
						</div>

						<div className="arena-panel arena-live-panel">
							<div className="arena-live-head">
								<div>
									<span className="arena-live-kicker">Current temperature</span>
									<div className="arena-live-title">What is live right now</div>
									<p className="arena-live-subtitle">Votes, tiers, and hall-of-fame boards are all linked through the same arena language.</p>
								</div>
								<span className="arena-live-badge"><span className="arena-pulse" /> live pulse</span>
							</div>

							<div className="arena-meter">
								<div className="arena-meter-row">
									<span><strong>Battle heat</strong><strong>92%</strong></span>
									<div className="arena-meter-track"><div className="arena-meter-fill" style={{ width: "92%" }} /></div>
								</div>
								<div className="arena-meter-row">
									<span><strong>Tier churn</strong><strong>68%</strong></span>
									<div className="arena-meter-track"><div className="arena-meter-fill" style={{ width: "68%" }} /></div>
								</div>
								<div className="arena-meter-row">
									<span><strong>Rank pressure</strong><strong>81%</strong></span>
									<div className="arena-meter-track"><div className="arena-meter-fill" style={{ width: "81%" }} /></div>
								</div>
							</div>

							<div className="arena-stack">
								{pulseCards.map((card) => (
									<div key={card.title} className="arena-stack-card">
										<div>
											<strong>{card.title}</strong>
											<span>{card.description}</span>
										</div>
										<span className="arena-live-badge" style={{ whiteSpace: "nowrap" }}>{card.badge || card.meta}</span>
									</div>
								))}
							</div>
						</div>
					</motion.section>

					<section className="arena-section">
						<div className="arena-section-head">
							<div>
								<span className="arena-section-kicker">Live signals</span>
								<h2>What is moving</h2>
								<p className="arena-section-subtitle">The three things the arena is prioritizing right now.</p>
							</div>
						</div>

						<div className="arena-insight-grid">
							{[
								{ title: "Fast entry", description: "One click from the hub gets you into battles, tier lists, or ranked boards immediately.", badge: "Quick jump", meta: "Zero friction" },
								{ title: "Fan energy", description: "The section is built to feel like a packed arena instead of a plain content grid.", badge: "Crowd", meta: "All signal" },
								{ title: "Victory lanes", description: "The top boards are grouped so the arena feels more like a destination.", badge: "Curated", meta: "Focused" },
							].map((card) => (
								<div className="arena-insight-card" key={card.title}>
									<div className="arena-card-topline"><span className="arena-card-badge">{card.badge}</span><span className="arena-card-meta">{card.meta}</span></div>
									<h3>{card.title}</h3>
									<p>{card.description}</p>
								</div>
							))}
						</div>
					</section>
				</main>
			</div>
		</AnimatedPage>
	);
}
