import React, { useState, useEffect } from "react";
import { getAllAnime } from "../../data/animeData";
import GenericRoutePage from "../../components/GenericRoutePage";

export default function BestAnime() {
  const [topAnime, setTopAnime] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllAnime().then((all) => {
      setTopAnime([...all].sort((a, b) => b.rating - a.rating).slice(0, 10));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "#888", textAlign: "center", padding: 40 }}>Loading rankings...</div>;
  if (topAnime.length === 0) return <div style={{ color: "#888", textAlign: "center", padding: 40 }}>No data available.</div>;

  return (
    <GenericRoutePage
      eyebrow="Rankings"
      title="Best anime"
      description="Top-rated anime from across all sources."
      stats={[
        { value: topAnime.length.toString(), label: "ranked titles" },
        { value: topAnime[0]?.rating.toFixed(1) || "-", label: "top rating" },
        { value: topAnime[0]?.studio || "-", label: "top studio" },
      ]}
      actions={[
        { label: "Open browse", to: "/browse/anime" },
      ]}
      sections={[
        {
          heading: "Top 10",
          description: "Sorted by rating.",
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
