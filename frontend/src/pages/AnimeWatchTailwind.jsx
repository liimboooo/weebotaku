import React, { useState } from 'react';

// Single-file, Tailwind-based Watch Page
export default function AnimeWatchTailwind() {
  const [isEpisodesExpanded, setEpisodesExpanded] = useState(true);

  const mockEpisodes = Array.from({ length: 6 }).map((_, i) => ({
    id: i + 1,
    ep: `EP ${i + 1}`,
    title: `Episode ${i + 1} — The Adventure Continues`,
    date: `2024-0${(i % 9) + 1}-0${(i % 28) + 1}`,
    thumb: `/jpg/sample-${(i % 3) + 1}.jpg`,
  }));

  const recommendations = Array.from({ length: 6 }).map((_, i) => ({
    id: i + 1,
    title: `Recommended Anime ${i + 1}`,
    tag: 'TV',
    season: 'FALL',
    year: '2024',
    cover: `/jpg/sample-${(i % 3) + 1}.jpg`,
  }));

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-[1800px] mx-auto">

        {/* Left Column (70%) */}
        <main className="w-full lg:w-[70%] flex flex-col gap-4">
          <div className="aspect-video bg-black rounded-xl overflow-hidden">
            {/* placeholder player - swap with iframe/video source as needed */}
            <iframe
              title="anime-player"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold leading-tight">EP 1 — Pilot Episode: New Beginnings</h1>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-yellow-300 flex items-center justify-center font-bold text-black">A</div>
                <div className="flex flex-col">
                  <span className="font-semibold">AnimeChatch Studio</span>
                  <span className="text-sm text-[#9aa0a6]">Official • 1.2M viewers</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="px-3 py-2 bg-[#ff4d4f] text-black rounded-md font-semibold">Subscribe</button>
                <button className="px-3 py-2 border border-white/10 rounded-md">Share</button>
              </div>
            </div>

            <div className="bg-[#0b0c0d] p-4 rounded-lg">
              <p className="text-sm text-[#bfc7c9]">This pilot episode introduces our hero and sets the stage for a journey across a world of wonder. Rich animation and tight pacing make this a great start for the season.</p>
            </div>
          </div>
        </main>

        {/* Right Column / Sidebar (30%) */}
        <aside className="w-full lg:w-[30%] flex flex-col h-full gap-4">
          <div className="flex flex-col w-full">
            {/* Header: Up Next */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#9aa0a6]">Up Next</div>
                <div className="font-semibold">EP 2 — The Journey Continues</div>
              </div>

              <button
                aria-expanded={isEpisodesExpanded}
                onClick={() => setEpisodesExpanded(v => !v)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/7"
              >
                {/* Chevron SVG */}
                <svg className={`w-5 h-5 transform transition-transform duration-200 ${isEpisodesExpanded ? 'rotate-180' : 'rotate-0'}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l6 6a1 1 0 11-1.414 1.414L10 5.414 4.707 10.707A1 1 0 113.293 9.293l6-6A1 1 0 0110 3z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Collapsible Episodes List Box (mounted always, toggled via max-height + opacity) */}
            <div className={`mt-3 bg-[#0b0c0d] rounded-lg p-2 transition-all duration-300 ease-in-out overflow-hidden ${isEpisodesExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <ul className="flex flex-col gap-2">
                {mockEpisodes.map(ep => (
                  <li key={ep.id} className="flex gap-3 items-center p-2 rounded-md hover:bg-white/2">
                    <img src={ep.thumb} alt={ep.title} className="w-32 h-18 object-cover rounded-md" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{ep.ep} — {ep.title}</div>
                      <div className="text-xs text-[#9aa0a6]">{ep.date}</div>
                    </div>
                    <div className="text-sm text-[#9aa0a6]">▶︎ 12:34</div>
                  </li>
                ))}
              </ul>
            </div>

            {/* More Like This (Recommendations) - sibling to collapsible container */}
            <div className="mt-4">
              <div className="text-sm text-[#9aa0a6] mb-2">More Like This</div>
              <div className="flex flex-col gap-3">
                {recommendations.map(rec => (
                  <a key={rec.id} href={`#/anime/${rec.id}`} className="flex gap-3 items-center bg-[#0b0c0d] p-2 rounded-md hover:bg-white/3">
                    <img src={rec.cover} alt={rec.title} className="w-20 h-12 object-cover rounded-md" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm leading-tight">{rec.title}</div>
                      <div className="text-xs text-[#9aa0a6]">{rec.tag} • {rec.season} • {rec.year}</div>
                    </div>
                    <div className="text-sm text-[#9aa0a6]">⭐</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
