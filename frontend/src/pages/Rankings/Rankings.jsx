import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedPage from "../../components/AnimatedPage";
import Header from "../../components/Header";
import Background from "../../components/Background";
import "./ArenaShowcase.css";

const arenaModes = [
	{
		title: "Live battles",
		description: "Jump into the current head-to-heads and watch votes shift in real time.",
		badge: "VS",
		meta: "Most active",
		to: "/arena/character-battle",
	},
	{
		title: "Tier lists",
		description: "See the catalog split into S, A, B, and C lanes with a cleaner hierarchy.",
		badge: "Tier",
		meta: "Community board",
		to: "/arena/tier-lists",
	},
	{
		title: "Anime rankings",
		description: "The strongest titles from the dataset, ranked for quick scanning.",
		badge: "Top 100",
		meta: "Hall of fame",
		to: "/rankings/anime",
	},
	{
		title: "Arena overview",
		description: "A concise pulse check for what is moving right now in the section.",
		badge: "Live",
		meta: "Command view",
		to: "/arena/overview",
	},
];

const arenaSignals = [
	{ title: "Hype stream", description: "Signal boosts from the community, battle menu, and ranking pages." , meta: "24/7" },
	{ title: "Match pressure", description: "Vote swings, fan momentum, and rivalry sparks all live here.", meta: "Immediate" },
	{ title: "Victory lanes", description: "The top boards are grouped so the arena feels more like a destination.", meta: "Curated" },
];

export default function Rankings() {
	const navigate = useNavigate();
	const goTo = (target) => navigate(target);

	return (
		<AnimatedPage>
			<div className="arena-page">
				<Background />
				<Header />

				<main className="arena-shell">
					<motion.section
						className="arena-hero"
						initial={{ opacity: 0, y: 18 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.45, ease: "easeOut" }}
					>
						<div className="arena-copy">
							<span className="arena-eyebrow">The Arena</span>
							<h1 className="arena-title">Arena command center</h1>
							<p className="arena-lede">
								A high-energy home base for rankings, battles, and tier lists, tuned like a live broadcast instead of a static menu.
							</p>

							<div className="arena-actions">
								<button className="arena-action primary" type="button" onClick={() => goTo("/arena/character-battle")}>
									Open live battle
								</button>
								<button className="arena-action secondary" type="button" onClick={() => goTo("/arena/overview")}>
									View overview
								</button>
							</div>

							<div className="arena-stat-grid">
								{[
									{ value: "4", label: "arena modes" },
									{ value: "LIVE", label: "battle pulse" },
									{ value: "100%", label: "fan focus" },
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
									<span className="arena-live-kicker">Live broadcast</span>
									<div className="arena-live-title">What is moving right now</div>
									<p className="arena-live-subtitle">The arena is strongest when it feels like a feed of active momentum, not a dead-end menu.</p>
								</div>
								<span className="arena-live-badge"><span className="arena-pulse" /> now streaming</span>
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
								{arenaSignals.map((signal) => (
									<div key={signal.title} className="arena-stack-card">
										<div>
											<strong>{signal.title}</strong>
											<span>{signal.description}</span>
										</div>
										<span className="arena-live-badge" style={{ whiteSpace: "nowrap" }}>{signal.meta}</span>
									</div>
								))}
							</div>
						</div>
					</motion.section>

					<section className="arena-section">
						<div className="arena-section-head">
							<div>
								<span className="arena-section-kicker">Choose your lane</span>
								<h2>Arena modes</h2>
								<p className="arena-section-subtitle">Every lane is tuned to feel quick, obvious, and worth clicking.</p>
							</div>
						</div>

						<div className="arena-link-grid">
							{arenaModes.map((mode, index) => (
								<motion.button
									key={mode.title}
									className="arena-link-card"
									type="button"
									onClick={() => goTo(mode.to)}
									initial={{ opacity: 0, y: 12 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.07 }}
								>
									<div className="arena-link-topline">
										<span className="arena-link-badge">{mode.badge}</span>
										<span className="arena-link-meta">{mode.meta}</span>
									</div>
									<h3>{mode.title}</h3>
									<p>{mode.description}</p>
								</motion.button>
							))}
						</div>
					</section>
				</main>

			</div>
		</AnimatedPage>
	);
}
