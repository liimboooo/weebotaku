import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Share2, AlertTriangle, Bell, Search, X, AlignJustify, ListFilter, ArrowUpDown } from 'lucide-react';

export default function AnimeWatchTailwind() {
  const [isEpisodesExpanded, setEpisodesExpanded] = useState(true);
  const [alertBannerVisible, setAlertBannerVisible] = useState(true);
  const [epSearch, setEpSearch] = useState("");
  const [selectedEp, setSelectedEp] = useState(1);

  const mockEpisodes = Array.from({ length: 12 }).map((_, i) => ({
    id: i + 1,
    ep: i + 1,
    title: i === 0 ? "Asa and Yuru" : `Episode ${i + 1}`,
    views: "97K Views",
    duration: "24m",
    thumb: "", 
  }));

  const recommendations = Array.from({ length: 5 }).map((_, i) => ({
    id: i + 1,
    title: ["Jujutsu Kaisen", "Demon Slayer", "Chainsaw Man", "Bleach", "Naruto"][i],
    tag: 'TV',
    season: ['SPRING 2019', 'FALL 2020', 'FALL 2022', 'WINTER 2021', 'SPRING 2007'][i],
    cover: "",
  }));

  const comments = [
    {id:1, user:"chino", time:"1mo ago", text:"It's just so peak 🔥 The animation goes crazy.", likes:124, image:"https://picsum.photos/seed/anime1/400/300"},
    {id:2, user:"Lui", time:"1mo ago", text:"I can't believe that ending! Next episode is going to be insane.", likes:89},
  ];

  return (
    <div className="min-h-screen bg-[#070708] text-[#e3e3e3] font-sans">
      <div className="max-w-screen-2xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ─── LEFT COLUMN ─── */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-w-0">
          
          {/* VIDEO PLAYER */}
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl ring-1 ring-white/5">
            <div className="absolute inset-0 flex items-center justify-center text-white/20">
              [ Video Player ]
            </div>
          </div>

          {/* WARNING BANNER */}
          {alertBannerVisible && (
            <div className="w-full bg-[#3d1a04] text-orange-400 px-4 py-3 rounded-xl flex items-center justify-between shadow-lg ring-1 ring-orange-500/20">
              <p className="text-sm font-medium">If the current server doesn't work, feel free to try the other available servers.</p>
              <button onClick={() => setAlertBannerVisible(false)} className="text-orange-400 hover:text-orange-300 p-1 transition-colors">
                <X size={16} />
              </button>
            </div>
          )}

          {/* METADATA */}
          <div className="mt-2 flex flex-col gap-4">
            <h1 className="text-3xl font-bold text-white">Asa and Yuru</h1>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Anime Info Row */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-neutral-800 ring-2 ring-white/10 shrink-0"></div>
                <div className="flex flex-col">
                  <span className="font-bold text-white text-base leading-tight">Daemons of the Shadow Realm</span>
                  <span className="text-xs text-neutral-400 font-medium mt-0.5">6.4K users</span>
                </div>
              </div>
              
              {/* Actions Row */}
              <div className="flex flex-wrap items-center gap-2">
                <button className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-neutral-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg> Add to List
                </button>
                
                <div className="flex items-center bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <button className="px-4 py-2.5 hover:bg-white/10 text-white font-medium text-sm flex items-center gap-2 border-r border-white/10 transition-colors">
                    👍 12K
                  </button>
                  <button className="px-4 py-2.5 hover:bg-white/10 text-white font-medium text-sm flex items-center gap-2 transition-colors">
                    👎
                  </button>
                </div>

                <button className="bg-white/5 border border-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full font-medium text-sm text-white flex items-center gap-2 transition-colors">
                  Dub <ChevronDown size={14} className="text-neutral-400" />
                </button>
                <button className="bg-white/5 border border-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full font-medium text-sm text-white flex items-center gap-2 transition-colors">
                  Server <ChevronDown size={14} className="text-neutral-400" />
                </button>
                <button className="bg-white/5 border border-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full font-medium text-sm text-white flex items-center gap-2 transition-colors">
                  <Share2 size={14} /> Share
                </button>
                <button className="bg-white/5 border border-white/5 hover:bg-white/10 w-10 h-10 flex items-center justify-center rounded-full text-white transition-colors" title="Report/Flag">
                  <AlertTriangle size={16} />
                </button>
              </div>
            </div>

            {/* Stats & Synopsis */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 mt-2">
              <div className="text-sm font-semibold text-white mb-2">97K views • Apr 4, 2026 • #6 trending</div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                In a world where certain humans command mighty daemons, a young boy discovers his hidden power. The true battle begins now.
              </p>
            </div>
          </div>

          {/* COMMENTS SECTION */}
          <div className="mt-8 mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-white">38 Comments</h2>
              <span className="bg-white/10 text-neutral-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">EP 1</span>
              <button className="ml-auto flex items-center gap-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors">
                 <AlignJustify size={16} /> Sort by
              </button>
            </div>
            
            <div className="flex gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-neutral-800 shrink-0"></div>
              <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/10 flex flex-col focus-within:border-white/30 transition-colors">
                <input type="text" placeholder="What scene hit the hardest?" className="w-full bg-transparent outline-none text-white text-sm mb-3 placeholder-neutral-500" />
                <div className="flex items-center justify-between mt-auto">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="hidden" />
                    <div className="w-8 h-4 bg-neutral-800 rounded-full relative ring-1 ring-white/10 group-hover:ring-white/30 transition-all">
                      <div className="w-3 h-3 bg-neutral-400 rounded-full absolute top-[1px] left-[2px]"></div>
                    </div>
                    <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider group-hover:text-neutral-300">Spoiler</span>
                  </label>
                  <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {comments.map(c => (
                <div key={c.id} className="flex gap-4">
                   <div className="w-10 h-10 rounded-full bg-neutral-800 shrink-0"></div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1">
                       <span className="font-bold text-sm text-white">@{c.user}</span>
                       <span className="text-xs text-neutral-500 font-medium">{c.time}</span>
                     </div>
                      <p className="text-sm text-neutral-300 mb-2 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                      {c.image && (
                        <img src={c.image} alt="" className="rounded-xl mb-2 max-w-full h-auto max-h-48 object-cover ring-1 ring-white/5" />
                      )}
                     <div className="flex items-center gap-4 text-xs font-semibold text-neutral-400">
                       <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> 
                          {c.likes}
                       </button>
                       <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                       </button>
                       <button className="hover:text-white transition-colors">Reply</button>
                       <button className="hover:text-white transition-colors ml-auto">More</button>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN (SIDEBAR) ─── */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 flex flex-col gap-6">
            
            {/* UP NEXT ACCORDION */}
            <div className="bg-[#121318] rounded-xl overflow-hidden border border-white/5 shadow-2xl">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setEpisodesExpanded(p => !p)}>
                <div>
                  <div className="text-sm font-bold text-white">Up Next - Right and Left</div>
                  <div className="text-xs text-neutral-400 mt-1 font-medium">Playing - Episode {selectedEp}...</div>
                </div>
                {isEpisodesExpanded ? <ChevronUp size={18} className="text-neutral-400" /> : <ChevronDown size={18} className="text-neutral-400" />}
              </div>
              
              <div className={`transition-all duration-300 ease-in-out ${isEpisodesExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-3 pt-0 border-t border-white/5">
                  <div className="flex items-center gap-2 mt-3 mb-3">
                    <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2.5 flex-1 border border-white/5 focus-within:border-white/20 transition-colors">
                      <Search size={14} className="text-neutral-500 shrink-0" />
                      <input type="text" placeholder="Search Episode" className="bg-transparent border-none outline-none text-xs font-medium text-white w-full placeholder-neutral-600" value={epSearch} onChange={(e) => setEpSearch(e.target.value)} />
                    </div>
                    <button className="p-2.5 rounded-lg bg-black/40 border border-white/5 hover:bg-white/10 transition-colors text-neutral-400 hover:text-white shrink-0" title="Filter">
                      <ListFilter size={14} />
                    </button>
                    <button className="p-2.5 rounded-lg bg-black/40 border border-white/5 hover:bg-white/10 transition-colors text-neutral-400 hover:text-white shrink-0" title="Sort">
                      <ArrowUpDown size={14} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
                    {mockEpisodes.map((ep, i) => {
                      const isActive = ep.ep === selectedEp;
                      return (
                        <button key={i} onClick={() => setSelectedEp(ep.ep)} className={`flex items-center gap-3 p-1.5 rounded-xl text-left transition-colors w-full border border-transparent ${isActive ? 'bg-amber-900/20 ring-1 ring-orange-500/30' : 'hover:bg-white/5'}`}>
                          <div className="w-24 aspect-video bg-black rounded-lg overflow-hidden relative shrink-0">
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-600">{ep.ep}</div>
                            <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 text-[9px] font-bold text-white rounded shadow-sm">EP {ep.ep}</div>
                            {isActive && <div className="absolute top-0 bottom-0 left-0 w-1 bg-orange-500 rounded-l-lg"></div>}
                          </div>
                          <div className="flex-1 min-w-0 py-1">
                            <div className={`text-xs font-bold truncate ${isActive ? 'text-orange-400' : 'text-white'}`}>{ep.title}</div>
                            <div className="text-[10px] text-neutral-500 mt-1 font-medium">{ep.views} • {ep.duration}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            {/* AIRING PILL */}
            <div className="bg-[#0c2d1c] px-4 py-3.5 rounded-xl flex items-center gap-3 shadow-lg ring-1 ring-emerald-500/20">
              <Bell size={16} className="text-emerald-400 shrink-0" />
              <span className="text-sm font-bold text-emerald-400 truncate">Next ep airing in 4 days</span>
            </div>
            
            {/* MORE LIKE THIS */}
            <div className="bg-[#121318] rounded-xl p-4 border border-white/5 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-4 tracking-wide">More like this</h3>
              <div className="flex flex-col gap-3">
                {recommendations.map((rec, i) => (
                  <button key={i} className="flex items-start gap-3 hover:bg-white/5 p-1.5 rounded-xl transition-colors group text-left border-none bg-transparent">
                    <div className="w-16 aspect-[2/3] bg-neutral-800 rounded-lg overflow-hidden shrink-0 relative"></div>
                    <div className="flex flex-col pt-1 flex-1 min-w-0">
                      <span className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">{rec.title}</span>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-1.5 bg-black/40 self-start px-1.5 py-0.5 rounded border border-white/5">{rec.tag} {rec.season}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
