import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedPage from "../../components/AnimatedPage";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Background from "../../components/Background";
import "./ArenaShowcase.css";

const duelCards = [
	{
		title: "Luffy",
		description: "Momentum fighter, crowd magnet, and the current left-side favorite.",
		badge: "🏴‍☠️ Straw Hat",
		meta: "52.8% vote share",
	},
	{
		title: "Naruto",
		description: "Persistence build, comeback engine, and the right-side challenger.",
		badge: "🍃 Hokage path",
		meta: "47.2% vote share",
	},
	{
		title: "Pressure meter",
		description: "The crowd noise climbs every time a vote lands, keeping the matchup animated.",
		badge: "LIVE",
		meta: "Vote heat rising",
	},
];

const arenaRules = [
	{
		title: "Pick your side",
		description: "Lock in the character that deserves the next momentum swing.",
		badge: "Step 1",
		meta: "Commit fast",
	},
	{
		title: "Watch the meter",
		description: "The live bar shifts as the community leans into a winner.",
		badge: "Step 2",
		meta: "Track changes",
	},
	{
		title: "Jump to the next duel",
		description: "Swap immediately into rankings or tier lists when you want another angle.",
		badge: "Step 3",
		meta: "Keep moving",
	},
];

export default function CharacterArena() {
	const [selectedSide, setSelectedSide] = useState("left");
	const navigate = useNavigate();

	const duelState = useMemo(() => {
		const baseLeft = 5230;
		const baseRight = 4892;
		const bias = selectedSide === "left" ? 180 : selectedSide === "right" ? -180 : 0;
		const leftVotes = baseLeft + Math.max(bias, 0);
		const rightVotes = baseRight + Math.max(-bias, 0);
		const total = leftVotes + rightVotes;
		return {
			leftVotes,
			rightVotes,
			total,
			leftShare: Math.round((leftVotes / total) * 100),
			rightShare: Math.round((rightVotes / total) * 100),
			crowdText: selectedSide === "left" ? "Momentum tilts to Luffy." : selectedSide === "right" ? "Naruto pulls the crowd back." : "The crowd is split down the middle.",
		};
	}, [selectedSide]);

	return (
		<AnimatedPage>
			<div className="arena-page">
				<Background />
				<Header />
				<main className="arena-shell">
					<motion.section className="arena-hero" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
						<div className="arena-copy">
							<span className="arena-eyebrow">The Arena</span>
							<h1 className="arena-title">Character duel</h1>
							<p className="arena-lede">A cinematic face-off built to feel like a live event, with crowd pressure and momentum stacked into every card.</p>

							<div className="arena-actions">
								<button className="arena-action primary" type="button" onClick={() => setSelectedSide((current) => (current === "left" ? "right" : "left"))}>Cast your vote</button>
								<button className="arena-action secondary" type="button" onClick={() => navigate("/arena")}>Arena hub</button>
							</div>

							<div className="arena-stat-grid">
								{[
									{ value: "LIVE", label: "arena state" },
									{ value: `${duelState.total.toLocaleString()}+`, label: "fan votes" },
									{ value: `${duelState.leftShare}/${duelState.rightShare}`, label: "vote split" },
								].map((stat) => (
									<article className="arena-stat-card" key={stat.label}>
										<strong>{stat.value}</strong>
										<span>{stat.label}</span>
									</article>
								))}
							</div>
						</div>

						<div className="arena-panel arena-duel-panel">
							<div className="arena-live-head">
								<div>
									<span className="arena-live-kicker">Current duel</span>
									<div className="arena-live-title">Luffy vs Naruto</div>
									<p className="arena-live-subtitle">{duelState.crowdText}</p>
								</div>
								<span className="arena-live-badge"><span className="arena-pulse" /> live now</span>
							</div>

							<div className="arena-duel-stage">
								<div className="arena-duel-side">
									<div className="arena-card-topline"><span className="arena-card-badge">🏴‍☠️ Straw Hat</span><span className="arena-card-meta">{duelState.leftShare}%</span></div>
									<div className="arena-duel-name">Luffy</div>
									<p className="arena-duel-alias">Momentum fighter, crowd magnet, and the current left-side favorite.</p>
									<div className="arena-vote-row">
										<button type="button" className={`arena-vote-button ${selectedSide === "left" ? "active" : ""}`} onClick={() => setSelectedSide("left")}>Back Luffy</button>
									</div>
									<div className="arena-duel-meter">
										<div className="arena-duel-meter-head"><span>Vote pressure</span><strong>{duelState.leftVotes.toLocaleString()}</strong></div>
										<div className="arena-duel-meter-track"><div className="arena-duel-meter-fill" style={{ width: `${duelState.leftShare}%` }} /></div>
									</div>
								</div>

								<div className="arena-duel-vs"><span className="arena-vs-badge">VS</span></div>

								<div className="arena-duel-side right">
									<div className="arena-card-topline"><span className="arena-card-badge">🍃 Hokage path</span><span className="arena-card-meta">{duelState.rightShare}%</span></div>
									<div className="arena-duel-name">Naruto</div>
									<p className="arena-duel-alias">Persistence build, comeback engine, and the right-side challenger.</p>
									<div className="arena-vote-row">
										<button type="button" className={`arena-vote-button ${selectedSide === "right" ? "active" : ""}`} onClick={() => setSelectedSide("right")}>Back Naruto</button>
									</div>
									<div className="arena-duel-meter">
										<div className="arena-duel-meter-head"><span>Vote pressure</span><strong>{duelState.rightVotes.toLocaleString()}</strong></div>
										<div className="arena-duel-meter-track"><div className="arena-duel-meter-fill" style={{ width: `${duelState.rightShare}%` }} /></div>
									</div>
								</div>
							</div>

							<div className="arena-note">The selected side gets the crowd push, so the page feels reactive instead of static.</div>
						</div>
					</motion.section>

					<section className="arena-section">
						<div className="arena-section-head">
							<div>
								<span className="arena-section-kicker">How it works</span>
								<h2>Simple duel loop</h2>
								<p className="arena-section-subtitle">Short, readable steps keep the page feeling like a game layer, not a table.</p>
							</div>
						</div>

						<div className="arena-step-grid">
							{arenaRules.map((step) => (
								<div key={step.title} className="arena-step-card">
									<div className="arena-step-topline"><span className="arena-step-badge">{step.badge}</span><span className="arena-step-meta">{step.meta}</span></div>
									<h3>{step.title}</h3>
									<p>{step.description}</p>
								</div>
							))}
						</div>
					</section>

					<section className="arena-section">
						<div className="arena-section-head">
							<div>
								<span className="arena-section-kicker">Featured matchup</span>
								<h2>Pressure board</h2>
								<p className="arena-section-subtitle">A few more cards to keep the duel page feeling dense and alive.</p>
							</div>
						</div>

						<div className="arena-insight-grid">
							{duelCards.map((card) => (
								<div key={card.title} className="arena-insight-card">
									<div className="arena-card-topline"><span className="arena-card-badge">{card.badge}</span><span className="arena-card-meta">{card.meta}</span></div>
									<h3>{card.title}</h3>
									<p>{card.description}</p>
								</div>
							))}
						</div>
					</section>
				</main>
				<Footer />
			</div>
		</AnimatedPage>
	);
}
