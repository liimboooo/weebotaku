import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Bell, Search, X, AlignJustify, ListFilter, ArrowUpDown, ThumbsUp, ThumbsDown, Loader, Share2 } from 'lucide-react';
import { getAnimeById } from '../data/animeData';
import { getEpisodePage } from '../services/animeApi';
import { loadWatchHistory } from '../services/storage';
import { fetchAnimeRecommendations } from '../services/anilistApi';

export default function AnimeWatchTailwind() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [isEpisodesExpanded, setEpisodesExpanded] = useState(true);
  const [alertBannerVisible, setAlertBannerVisible] = useState(true);
  const [epSearch, setEpSearch] = useState("");

  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedEp, setSelectedEp] = useState(() => parseInt(searchParams.get('ep')) || 1);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const a = await getAnimeById(id);
        if (cancelled) return;
        if (!a) { setError('Anime not found'); setLoading(false); return; }

        const epFromUrl = parseInt(searchParams.get('ep'));
        const ep = epFromUrl || (loadWatchHistory().find(h => h.animeId === parseInt(id))?.episode) || 1;
        setAnime(a);
        setSelectedEp(ep);

        try {
          const result = await getEpisodePage(a.title || a.name, '', '', '', id, 0);
          if (!cancelled && result?.episodes?.length > 0) {
            setEpisodes(result.episodes);
          } else if (a.episodes) {
            setEpisodes(Array.from({ length: a.episodes }, (_, i) => ({ episode: i + 1, title: `Episode ${i + 1}`, url: String(i + 1) })));
          }
        } catch (e) {
          console.error('[AnimeWch] Failed to fetch episodes:', e);
          if (a.episodes) {
            setEpisodes(Array.from({ length: a.episodes }, (_, i) => ({ episode: i + 1, title: `Episode ${i + 1}`, url: String(i + 1) })));
          }
        }
        if (!cancelled) setLoading(false);
      } catch (e) {
        console.error('[AnimeWch] Failed to load anime:', e);
        if (!cancelled) { setError('Failed to load anime'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetchAnimeRecommendations(id).then(recs => { if (!cancelled && recs) setRecommendations(recs.slice(0, 5)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const filteredEps = episodes.filter(ep =>
    !epSearch || ep.title?.toLowerCase().includes(epSearch.toLowerCase()) || String(ep.episode).includes(epSearch)
  );

  const nextEp = episodes.find(ep => ep.episode === selectedEp + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070708] text-[#e3e3e3] font-sans overflow-x-hidden flex items-center justify-center">
        <Loader size={24} className="text-neutral-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#070708] text-[#e3e3e3] font-sans overflow-x-hidden flex items-center justify-center">
        <p className="text-neutral-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-[#e3e3e3] font-sans overflow-x-hidden">
      <div className="max-w-screen-2xl mx-auto p-2 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="lg:col-span-3 flex flex-col gap-3 sm:gap-4 min-w-0">
          <div className="w-full aspect-video bg-black rounded-lg sm:rounded-xl overflow-hidden relative shadow-2xl ring-1 ring-white/5">
            <div className="absolute inset-0 flex items-center justify-center text-white/20">
              [ Video Player ]
            </div>
          </div>

          {alertBannerVisible && (
            <div className="w-full bg-[#3d1a04] text-orange-400 px-4 py-3 rounded-xl flex items-center justify-between shadow-lg ring-1 ring-orange-500/20">
              <p className="text-sm font-medium">If the current server doesn't work, feel free to try the other available servers.</p>
              <button onClick={() => setAlertBannerVisible(false)} className="text-orange-400 hover:text-orange-300 p-1 transition-colors">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="mt-1 sm:mt-2 flex flex-col gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{anime?.name || 'Untitled'}</h1>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-neutral-800 ring-2 ring-white/10 shrink-0 overflow-hidden">
                  {anime?.img && <img src={anime.img} alt={anime.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-white text-sm sm:text-base leading-tight truncate">{anime?.name || 'Untitled'}</span>
                  {anime?.rating > 0 && <span className="text-[10px] sm:text-xs text-neutral-400 font-medium mt-0.5">{anime.rating.toFixed(1)} rating</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <div className="flex items-center bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <button className="px-2 sm:px-4 py-1.5 sm:py-2.5 hover:bg-white/10 text-white font-medium text-[11px] sm:text-sm flex items-center gap-1 sm:gap-2 border-r border-white/10 transition-colors">
                    <ThumbsUp size={14} /> <span>{anime?.popularity ? `${(anime.popularity / 1000).toFixed(1)}K` : '—'}</span>
                  </button>
                  <button className="px-2 sm:px-4 py-1.5 sm:py-2.5 hover:bg-white/10 text-white font-medium text-[11px] sm:text-sm flex items-center gap-1 sm:gap-2 transition-colors">
                    <ThumbsDown size={14} />
                  </button>
                </div>
                <button className="bg-white/5 border border-white/5 hover:bg-white/10 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-full font-medium text-[11px] sm:text-sm text-white flex items-center gap-1 sm:gap-2 transition-colors">
                  Server <ChevronDown size={12} className="sm:hidden text-neutral-400" /><ChevronDown size={14} className="hidden sm:block text-neutral-400" />
                </button>
                <button className="bg-white/5 border border-white/5 hover:bg-white/10 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-full font-medium text-[11px] sm:text-sm text-white flex items-center gap-1 sm:gap-2 transition-colors">
                  <Share2 size={12} className="sm:hidden" /><Share2 size={14} className="hidden sm:block" /> Share
                </button>
              </div>
            </div>
            {anime?.synopsis && (
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 mt-2">
                <p className="text-sm text-neutral-300 leading-relaxed">{anime.synopsis.replace(/<[^>]*>/g, "")}</p>
              </div>
            )}
          </div>

          <div className="mt-6 sm:mt-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-white">Comments</h2>
              <span className="bg-white/10 text-neutral-300 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded uppercase">EP {selectedEp}</span>
              <button className="ml-auto flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-neutral-400 hover:text-white transition-colors">
                 <AlignJustify size={14} className="sm:hidden" /><AlignJustify size={16} className="hidden sm:block" /> Sort by
              </button>
            </div>
            <div className="flex gap-2 sm:gap-4 mb-6 sm:mb-8">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-neutral-800 shrink-0"></div>
              <div className="flex-1 bg-black/40 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-white/10 flex flex-col focus-within:border-white/30 transition-colors">
                <input type="text" placeholder={anime ? `What did you think of ${anime.name}?` : "Leave a comment..."} className="w-full bg-transparent outline-none text-white text-xs sm:text-sm mb-2 sm:mb-3 placeholder-neutral-500" />
                <div className="flex items-center justify-between mt-auto">
                  <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group">
                    <input type="checkbox" className="hidden" />
                    <div className="w-7 sm:w-8 h-3.5 sm:h-4 bg-neutral-800 rounded-full relative ring-1 ring-white/10 group-hover:ring-white/30 transition-all">
                      <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-neutral-400 rounded-full absolute top-[1px] left-[1px] sm:left-[2px]"></div>
                    </div>
                    <span className="text-[10px] sm:text-xs text-neutral-400 font-semibold uppercase tracking-wider group-hover:text-neutral-300">Spoiler</span>
                  </label>
                  <button className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[14px] sm:h-[14px]"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-4 flex flex-col gap-3 sm:gap-6">
            <div className="bg-[#121318] rounded-lg sm:rounded-xl overflow-hidden border border-white/5 shadow-2xl">
              <div className="p-3 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setEpisodesExpanded(p => !p)}>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white truncate">{nextEp ? `Up Next - ${nextEp.title || `Episode ${nextEp.episode}`}` : 'No more episodes'}</div>
                  <div className="text-[10px] sm:text-xs text-neutral-400 mt-0.5 sm:mt-1 font-medium truncate">Playing - Episode {selectedEp}</div>
                </div>
                {isEpisodesExpanded ? <ChevronUp size={16} className="sm:hidden text-neutral-400 shrink-0" /> : <ChevronDown size={16} className="sm:hidden text-neutral-400 shrink-0" />}
                {isEpisodesExpanded ? <ChevronUp size={18} className="hidden sm:block text-neutral-400 shrink-0" /> : <ChevronDown size={18} className="hidden sm:block text-neutral-400 shrink-0" />}
              </div>
              <div className={`transition-all duration-300 ease-in-out ${isEpisodesExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-2 sm:p-3 pt-0 border-t border-white/5">
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-black/40 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 flex-1 border border-white/5 focus-within:border-white/20 transition-colors">
                      <Search size={12} className="sm:hidden text-neutral-500 shrink-0" /><Search size={14} className="hidden sm:block text-neutral-500 shrink-0" />
                      <input type="text" placeholder="Search" className="bg-transparent border-none outline-none text-[10px] sm:text-xs font-medium text-white w-full placeholder-neutral-600" value={epSearch} onChange={(e) => setEpSearch(e.target.value)} />
                    </div>
                    <button className="p-1.5 sm:p-2.5 rounded-lg bg-black/40 border border-white/5 hover:bg-white/10 transition-colors text-neutral-400 hover:text-white shrink-0" title="Filter">
                      <ListFilter size={12} className="sm:hidden" /><ListFilter size={14} className="hidden sm:block" />
                    </button>
                    <button className="p-1.5 sm:p-2.5 rounded-lg bg-black/40 border border-white/5 hover:bg-white/10 transition-colors text-neutral-400 hover:text-white shrink-0" title="Sort">
                      <ArrowUpDown size={12} className="sm:hidden" /><ArrowUpDown size={14} className="hidden sm:block" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 sm:gap-1.5 max-h-[300px] sm:max-h-[350px] overflow-y-auto pr-1">
                    {filteredEps.length === 0 ? (
                      <p className="text-xs text-neutral-500 text-center py-4">{epSearch ? 'No matching episodes' : 'No episodes available'}</p>
                    ) : (
                      filteredEps.map((ep) => {
                        const epNum = ep.episode;
                        return (
                          <button key={ep.id || epNum} onClick={() => setSelectedEp(epNum)} className={`flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 rounded-lg sm:rounded-xl text-left transition-colors w-full border border-transparent ${epNum === selectedEp ? 'bg-amber-900/20 ring-1 ring-orange-500/30' : 'hover:bg-white/5'}`}>
                            <div className="w-16 sm:w-24 aspect-video bg-black rounded-md sm:rounded-lg overflow-hidden relative shrink-0">
                              {ep.thumbnail ? (
                                <img src={ep.thumbnail} alt={`Episode ${epNum}`} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-neutral-600">{epNum}</div>
                              )}
                              <div className="absolute bottom-0.5 sm:bottom-1 right-0.5 sm:right-1 bg-black/80 px-0.5 sm:px-1 py-[1px] sm:py-0.5 text-[7px] sm:text-[9px] font-bold text-white rounded shadow-sm">EP {epNum}</div>
                              {epNum === selectedEp && <div className="absolute top-0 bottom-0 left-0 w-0.5 sm:w-1 bg-orange-500 rounded-l-lg"></div>}
                            </div>
                            <div className="flex-1 min-w-0 py-0 sm:py-1">
                              <div className={`text-[10px] sm:text-xs font-bold truncate ${epNum === selectedEp ? 'text-orange-400' : 'text-white'}`}>{ep.title || `Episode ${epNum}`}</div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {anime?.status?.toLowerCase().includes('air') || anime?.status === 'Ongoing' ? (
              <div className="bg-[#0c2d1c] px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3 shadow-lg ring-1 ring-emerald-500/20">
                <Bell size={14} className="sm:hidden text-emerald-400 shrink-0" /><Bell size={16} className="hidden sm:block text-emerald-400 shrink-0" />
                <span className="text-[11px] sm:text-sm font-bold text-emerald-400 truncate">
                  {anime?.nextAiringEpisode?.airingAt
                    ? `Next ep ${new Date(anime.nextAiringEpisode.airingAt * 1000).toLocaleDateString()}`
                    : 'Currently airing'}
                </span>
              </div>
            ) : null}

            {recommendations.length > 0 && (
              <div className="bg-[#121318] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/5 shadow-2xl">
                <h3 className="text-xs sm:text-sm font-bold text-white mb-3 sm:mb-4 tracking-wide">More like this</h3>
                <div className="flex flex-col gap-2 sm:gap-3">
                  {recommendations.map((rec) => (
                    <button key={rec.id} className="flex items-start gap-2 sm:gap-3 hover:bg-white/5 p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-colors group text-left border-none bg-transparent">
                      <div className="w-10 sm:w-16 aspect-[2/3] bg-neutral-800 rounded-md sm:rounded-lg overflow-hidden shrink-0 relative">
                        {rec.image ? (
                          <img src={rec.image} alt={rec.title || ''} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : null}
                      </div>
                      <div className="flex flex-col pt-0 sm:pt-1 flex-1 min-w-0">
                        <span className="text-[11px] sm:text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">{rec.title || rec.name}</span>
                        {rec.type && <span className="text-[8px] sm:text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-1 sm:mt-1.5 bg-black/40 self-start px-1 sm:px-1.5 py-0.5 rounded border border-white/5">{rec.type}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
