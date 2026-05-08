import React from "react";
import { getAllAnime } from "../../data/animeData";
import GenericRoutePage from "../../components/GenericRoutePage";

export default function BestAnime() {
	const topAnime = [...getAllAnime()].sort((a, b) => b.rating - a.rating).slice(0, 10);

	return (
		<GenericRoutePage
			eyebrow="Rankings"
			title="Best anime"
			description="A simple ratings board built from the local dataset, with the highest-ranked titles at the top."
			stats={[
				{ value: topAnime.length.toString(), label: "ranked titles" },
				{ value: topAnime[0]?.rating.toFixed(1) || "-", label: "top rating" },
				{ value: topAnime[0]?.studio || "-", label: "top studio" },
			]}
			actions={[
				{ label: "Open browse", to: "/browse/anime" },
				{ label: "View battles", to: "/arena/character-battle", variant: "secondary" },
			]}
			sections={[
				{
					heading: "Top 10",
					description: "Sorted by rating from the app dataset.",
					layout: "list",
					items: topAnime.map((anime, index) => ({
						title: `${index + 1}. ${anime.name}`,
						description: anime.synopsis,
						meta: `${anime.rating.toFixed(1)} / 10`,
						badge: anime.status,
						to: `/anime/${anime.id}`,
					})),
				},
			]}
		/>
	);
}
