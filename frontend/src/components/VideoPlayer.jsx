import { useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, SkipForward, Settings } from "lucide-react";

export default function VideoPlayer({
  streamMode,
  playing,
  currentTime,
  duration,
  volume,
  muted,
  showControls,
  episode,
  anime,
  showSkipIntro,
  showSkipOutro,
  playbackSpeed,
  hoveringTimeline,
  timelineHoverTime,
  autoNextCountdown,
  showShortcutsHelp,
  togglePlay,
  skipBack,
  skipForward,
  handleTimelineClick,
  handleTimelineHover,
  setHoveringTimeline,
  toggleMute,
  handleVolumeSlider,
  toggleFullscreen,
  handleSpeedChange,
  setShowShortcutsHelp,
  handleSkipIntro,
  handleSkipOutro,
  cancelAutoNext,
  goToNextEpisode,
  formatTime,
  epIndex,
  episodesLength,
  language,
  onToggleLanguage,
  serverIndex,
  onSwitchServer,
  onSelectServer,
  autoNext,
  onToggleAutoNext,
  hlsLevels,
  currentQuality,
  onQualityChange,
  servers,
  children,
}) {
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const isHls = streamMode === "hls";
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState('main');
  const langs = servers ? [...new Set(servers.map(s => s.type))] : [];
  const langServers = servers ? servers.filter(s => s.type === language) : [];
  const hasMultipleServers = langServers.length > 1;
  const activeServer = servers?.find(s => s.type === language && servers.filter(x => x.type === language).indexOf(s) === serverIndex);

  return (
    <div className="absolute inset-0 group">
      {children}

      {(showSkipIntro || showSkipOutro) && (
        <div className="absolute top-20 right-4 z-20 flex flex-col items-end gap-2">
          {showSkipIntro && (
            <button
              onClick={handleSkipIntro}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black/80 backdrop-blur-xl border border-white/20 text-white text-sm font-semibold hover:bg-amber-500/30 hover:border-amber-400/40 active:scale-95 transition-all shadow-xl"
            >
              Skip Intro <SkipForward size={14} />
            </button>
          )}
          {showSkipOutro && (
            <button
              onClick={handleSkipOutro}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black/80 backdrop-blur-xl border border-white/20 text-white text-sm font-semibold hover:bg-amber-500/30 hover:border-amber-400/40 active:scale-95 transition-all shadow-xl"
            >
              {epIndex < episodesLength - 1 ? "Next Ep" : "Skip Outro"} <SkipForward size={14} />
            </button>
          )}
        </div>
      )}

      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls || autoNextCountdown !== null ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >


        <div className="absolute top-0 left-0 right-0 p-2 sm:p-4 flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] sm:text-xs font-semibold text-white bg-black/60 backdrop-blur-sm px-2.5 sm:px-3 py-1 rounded-full border border-white/10 shadow-lg">
            EP {episode?.episode || ""}
          </span>
          <span className="text-xs sm:text-sm font-medium text-white/90 truncate max-w-[60%] bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/5">
            {anime?.name || ""}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-2 sm:pb-3">
          <div className="px-2 sm:px-4">
          <div
            className="relative w-full h-1.5 sm:h-1 group/timeline cursor-pointer mb-2 sm:mb-3"
            onClick={isHls ? handleTimelineClick : undefined}
            onMouseMove={isHls ? handleTimelineHover : undefined}
            onMouseEnter={isHls ? () => setHoveringTimeline(true) : undefined}
            onMouseLeave={isHls ? () => setHoveringTimeline(false) : undefined}
          >
            <div className="absolute inset-0 rounded-full bg-white/10" />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/20"
              style={{ width: `${Math.min(100, progress + 15)}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-amber-400 group-hover/timeline:h-1.5 transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-400 opacity-0 group-hover/timeline:opacity-100 transition-all shadow-lg shadow-amber-400/30 scale-0 group-hover/timeline:scale-100"
              style={{ left: `${progress}%`, marginLeft: "-8px" }}
            />
            {hoveringTimeline && isHls && (
              <div
                className="absolute -top-8 -translate-x-1/2 bg-black/80 text-white text-[11px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap"
                style={{ left: `${duration ? (timelineHoverTime / duration) * 100 : 0}%` }}
              >
                {formatTime(timelineHoverTime)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-1 sm:gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={isHls ? togglePlay : undefined}
                disabled={!isHls}
                className="p-1.5 sm:p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:bg-black/80"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Play size={16} className="sm:w-[18px] sm:h-[18px]" />}
              </button>
              <button
                onClick={isHls ? skipBack : undefined}
                disabled={!isHls}
                className="p-1.5 sm:p-2 rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:bg-black/80"
                aria-label="Back 10s"
              >
                <ChevronsLeft size={14} className="sm:w-[16px] sm:h-[16px]" />
              </button>
              <button
                onClick={isHls ? skipForward : undefined}
                disabled={!isHls}
                className="p-1.5 sm:p-2 rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:bg-black/80"
                aria-label="Forward 10s"
              >
                <ChevronsRight size={14} className="sm:w-[16px] sm:h-[16px]" />
              </button>
              <span className="text-[10px] sm:text-[11px] text-white/80 font-medium ml-1 sm:ml-2 select-none min-w-[60px] sm:min-w-[70px] bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="flex items-center gap-1 group/vol bg-black/50 backdrop-blur-sm rounded-full px-1">
                <button
                  onClick={isHls ? toggleMute : undefined}
                  disabled={!isHls}
                  className="p-1.5 sm:p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
                >
                  {muted || volume === 0 ? <VolumeX size={14} className="sm:w-[16px] sm:h-[16px]" /> : <Volume2 size={14} className="sm:w-[16px] sm:h-[16px]" />}
                </button>
                <div className="hidden sm:block w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-200">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={isHls ? handleVolumeSlider : undefined}
                    disabled={!isHls}
                    className="w-16 h-1 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    aria-label="Volume"
                  />
                </div>
              </div>

              {goToNextEpisode && (
                <button
                  onClick={goToNextEpisode}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-colors text-[11px] font-medium"
                  aria-label="Next episode"
                >
                  Next <SkipForward size={12} />
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowSettings(p => !p)}
                  className="p-1.5 sm:p-2 rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-colors"
                  aria-label="Settings"
                >
                  <Settings size={14} className="sm:w-[16px] sm:h-[16px]" />
                </button>
                {showSettings && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setShowSettings(false); setSettingsView('main'); }} />
                    <div className="absolute bottom-full right-0 mb-2 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[220px]">
                      {settingsView === 'main' && (
                        <div>
                          <div className="px-3 py-2 border-b border-white/10">
                            <span className="text-[11px] font-semibold text-zinc-300">Settings</span>
                          </div>

                          {servers && servers.length > 0 && (
                            <button
                              onClick={() => setSettingsView('source')}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
                            >
                              <span className="text-[12px] text-white">Language</span>
                              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                {activeServer?.label || activeServer?.type || 'N/A'}
                                <ChevronRight size={12} />
                              </span>
                            </button>
                          )}

                          <button
                            onClick={() => setSettingsView('speed')}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
                          >
                            <span className="text-[12px] text-white">Speed</span>
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                              {playbackSpeed}x
                              <ChevronRight size={12} />
                            </span>
                          </button>

                          {hlsLevels.length > 0 && (
                            <button
                              onClick={() => setSettingsView('quality')}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
                            >
                              <span className="text-[12px] text-white">Quality</span>
                              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                {currentQuality === -1 ? 'Auto' : (hlsLevels.find(l => l.index === currentQuality)?.name || `${currentQuality}`)}
                                <ChevronRight size={12} />
                              </span>
                            </button>
                          )}

                          <div className="border-t border-white/5 my-1" />

                          <button
                            onClick={onToggleAutoNext}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
                          >
                            <span className="text-[12px] text-white">Auto next episode</span>
                            <span className={`text-[11px] font-medium ${autoNext ? 'text-amber-400' : 'text-zinc-500'}`}>
                              {autoNext ? 'On' : 'Off'}
                            </span>
                          </button>
                        </div>
                      )}

                      {settingsView === 'source' && (
                        <div>
                          <button
                            onClick={() => setSettingsView('main')}
                            className="w-full flex items-center gap-2 px-3 py-2 border-b border-white/10 hover:bg-white/5 transition-colors"
                          >
                            <ChevronLeft size={14} />
                            <span className="text-[11px] font-semibold text-zinc-300">Language</span>
                          </button>
                          <div className="max-h-[200px] overflow-y-auto">
                            {servers.map((srv, i) => {
                              const isActive = language === srv.type && servers.filter(s => s.type === srv.type).findIndex(s => s.url === srv.url) === serverIndex;
                              return (
                                <button
                                  key={`${srv.url}-${i}`}
                                  onClick={() => { onSelectServer(srv); setShowSettings(false); setSettingsView('main'); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors ${
                                    isActive ? 'bg-amber-500/10' : 'hover:bg-white/5'
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-amber-400' : 'bg-white/20'}`} />
                                  <span className="text-[12px] text-white truncate">{srv.label || 'Server'}</span>
                                  <span className="text-[10px] uppercase text-zinc-500 ml-auto flex-shrink-0">{srv.type}</span>
                                  {isActive && <span className="text-[10px] text-amber-400 font-medium">Active</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {settingsView === 'speed' && (
                        <div>
                          <button
                            onClick={() => setSettingsView('main')}
                            className="w-full flex items-center gap-2 px-3 py-2 border-b border-white/10 hover:bg-white/5 transition-colors"
                          >
                            <ChevronLeft size={14} />
                            <span className="text-[11px] font-semibold text-zinc-300">Speed</span>
                          </button>
                          <div className="grid grid-cols-4 gap-1 p-2">
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                              <button
                                key={s}
                                onClick={() => { handleSpeedChange(s); setSettingsView('main'); }}
                                className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                                  playbackSpeed === s
                                    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                {s}x
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {settingsView === 'quality' && hlsLevels.length > 0 && (
                        <div>
                          <button
                            onClick={() => setSettingsView('main')}
                            className="w-full flex items-center gap-2 px-3 py-2 border-b border-white/10 hover:bg-white/5 transition-colors"
                          >
                            <ChevronLeft size={14} />
                            <span className="text-[11px] font-semibold text-zinc-300">Quality</span>
                          </button>
                          <div>
                            <button
                              onClick={() => { onQualityChange(-1); setSettingsView('main'); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors ${
                                currentQuality === -1 ? 'bg-amber-500/10' : 'hover:bg-white/5'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${currentQuality === -1 ? 'bg-amber-400' : 'bg-white/20'}`} />
                              <span className="text-[12px] text-white">Auto</span>
                              {currentQuality === -1 && <span className="text-[10px] text-amber-400 ml-auto font-medium">Active</span>}
                            </button>
                            {hlsLevels.map(l => (
                              <button
                                key={l.index}
                                onClick={() => { onQualityChange(l.index); setSettingsView('main'); }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors ${
                                  currentQuality === l.index ? 'bg-amber-500/10' : 'hover:bg-white/5'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${currentQuality === l.index ? 'bg-amber-400' : 'bg-white/20'}`} />
                                <span className="text-[12px] text-white">{l.name}</span>
                                <span className="text-[10px] text-zinc-500 ml-auto">{l.bitrate ? `${(l.bitrate / 1000).toFixed(0)} kbps` : ''}</span>
                                {currentQuality === l.index && <span className="text-[10px] text-amber-400 font-medium">Active</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 sm:p-2 rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-colors"
                aria-label="Fullscreen"
              >
                <Maximize2 size={14} className="sm:w-[16px] sm:h-[16px]" />
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>

      {autoNextCountdown !== null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900/90 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center shadow-2xl mx-3 sm:mx-0">
            <p className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-widest mb-2">Next episode in</p>
            <div className="text-3xl sm:text-5xl font-bold text-white mb-3 sm:mb-4">{autoNextCountdown}</div>
            <div className="flex gap-2 sm:gap-3 justify-center">
              <button
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-amber-500 text-white text-[11px] sm:text-sm font-semibold hover:bg-amber-400 transition-colors"
                onClick={goToNextEpisode}
              >
                <Play size={12} /> Play Now
              </button>
              <button
                className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white/10 text-white text-[11px] sm:text-sm font-medium hover:bg-white/20 transition-colors"
                onClick={cancelAutoNext}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showShortcutsHelp && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6"
          onClick={() => setShowShortcutsHelp(false)}
        >
          <div
            className="bg-zinc-900/95 border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-2xl mx-2 sm:mx-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">Keyboard Shortcuts</h3>
              <button
                className="text-zinc-400 hover:text-white cursor-pointer bg-transparent border-none p-1"
                onClick={() => setShowShortcutsHelp(false)}
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-1.5 sm:gap-y-2 text-[11px] sm:text-xs">
              {[
                ["Space / K", "Play / Pause"],
                ["J / ←", "Back 10s"],
                ["L / →", "Forward 10s"],
                ["↑ / ↓", "Volume"],
                ["0-9", "Jump to %"],
                ["F", "Fullscreen"],
                ["M", "Mute"],
                ["N", "Next episode"],
                ["P", "Previous episode"],
                ["?", "Toggle this help"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-2 sm:gap-3 border-b border-white/5 pb-1 sm:pb-1.5"
                >
                  <kbd className="bg-white/10 border border-white/20 rounded px-1 sm:px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] text-white whitespace-nowrap">
                    {k}
                  </kbd>
                  <span className="text-zinc-400 text-[11px] sm:text-xs">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
