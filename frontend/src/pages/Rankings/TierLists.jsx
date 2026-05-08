import React from "react";
import { getAllAnime } from "../../data/animeData";
import GenericRoutePage from "../../components/GenericRoutePage";

export default function TierLists() {
	const sorted = [...getAllAnime()].sort((a, b) => b.rating - a.rating);
	const tiers = {
		S: sorted.slice(0, 3),
		A: sorted.slice(3, 7),
		B: sorted.slice(7, 11),
		C: sorted.slice(11, 15),
	};

	return (
		<GenericRoutePage
			eyebrow="Tier lists"
			title="Community tiers"
			description="A compact tier board for the current catalog, split into high, mid, and challenger lanes."
			stats={[
				{ value: Object.keys(tiers).length.toString(), label: "tier rows" },
				{ value: sorted.length.toString(), label: "anime covered" },
				{ value: "Updated", label: "continuously" },
			]}
			actions={[
				{ label: "Open battles", to: "/arena/character-battle" },
				{ label: "Browse anime", to: "/browse/anime", variant: "secondary" },
			]}
			sections={[
				...Object.entries(tiers).map(([tier, items]) => ({
					heading: `Tier ${tier}`,
					description: `${tier}-rank anime from the current dataset.`,
					items: items.map((anime) => ({
						title: anime.name,
						description: anime.synopsis,
						meta: `${anime.rating.toFixed(1)} / 10`,
						badge: anime.studio,
						to: `/anime/${anime.id}`,
					})),
				})),
			]}
		/>
	);
}
