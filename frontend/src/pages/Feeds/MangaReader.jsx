import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Loader, Image as ImageIcon, ArrowLeftRight, Maximize2, BookOpen, ArrowDown } from "lucide-react";
import { getChapterPages } from "../../services/mangaApi";
import "./MangaReader.css";

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const QUALITY_ICON = { data: "HD", "data-saver": "SD" };
const PRELOAD_COUNT = 5;

function PageImage({ src, alt, onLoad, onClick, fitMode, onMouseDown, style }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`reader-page-wrap ${loaded ? "loaded" : ""}`} style={style}>
      {!loaded && !error && (
        <div className="reader-page-skeleton">
          <Loader size={20} className="reader-spinner" />
        </div>
      )}
      {error ? (
        <div className="reader-page-error">
          <p>Failed to load</p>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`reader-page-img ${fitMode}`}
          onLoad={() => { setLoaded(true); onLoad?.(); }}
          onError={() => setError(true)}
          onClick={onClick}
          onMouseDown={onMouseDown}
          style={{ display: loaded ? "block" : "none" }}
          loading="lazy"
        />
      )}
    </div>
  );
}

function ChapterSelector({ chapters, chIndex, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="reader-ch-selector" ref={ref}>
      <button className="reader-ch-selector-btn" onClick={() => setOpen(!open)}>
        Ch. {chapters[chIndex]?.chapter || "?"} <ChevronRight size={12} className={`reader-chevron ${open ? "open" : ""}`} />
      </button>
      {open && (
        <div className="reader-ch-dropdown">
          {chapters.map((ch, i) => (
            <button key={ch.id} className={`reader-ch-option ${i === chIndex ? "active" : ""}`} onClick={() => { onSelect(i); setOpen(false); }}>
              <span>Ch. {ch.chapter}</span>
              {ch.title && <span className="reader-ch-option-title">{ch.title}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MangaReader({ manga, chapters, initialChapter, onClose }) {
  const [chIndex, setChIndex] = useState(() => {
    const idx = chapters.findIndex(c => c.id === initialChapter?.id);
    return idx >= 0 ? idx : 0;
  });
  const [pages, setPages] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quality, setQuality] = useState("data-saver");
  const [scrollMode, setScrollMode] = useState(false);
  const [fitMode, setFitMode] = useState("width");
  const [direction, setDirection] = useState("ltr");
  const [loadedPages, setLoadedPages] = useState(new Set());
  const scrollRef = useRef(null);
  const pageRefs = useRef({});
  const observerRef = useRef(null);

  const chapter = chapters?.[chIndex];

  const loadPages = useCallback(async (preservePage) => {
    if (!chapter?.id) { setLoading(false); setError("Chapter not found."); return; }
    setLoading(true);
    setError("");
    if (!preservePage) { setPageIndex(0); }
    setLoadedPages(new Set());

    if (chapter.provider !== "mangadex" && chapter.pagesList?.length) {
      setPages(chapter.pagesList);
      setLoading(false);
      return;
    }

    let actualQuality = quality;
    let urls;
    try {
      urls = await getChapterPages(chapter.id, quality);
    } catch {
      const other = quality === "data" ? "data-saver" : "data";
      try {
        urls = await getChapterPages(chapter.id, other);
        actualQuality = other;
      } catch {
        setError("Failed to load chapter pages.");
        setLoading(false);
        return;
      }
    }
    setPages(urls || []);
    if (actualQuality !== quality) setQuality(actualQuality);
    setLoading(false);
  }, [chapter?.id, quality, chapter?.provider, chapter?.pagesList]);

  useEffect(() => { loadPages(); }, [loadPages]);

  // Preload images
  useEffect(() => {
    if (pages.length === 0) return;
    const indices = scrollMode
      ? Array.from({ length: pages.length }, (_, i) => i)
      : Array.from({ length: Math.min(PRELOAD_COUNT, pages.length - pageIndex - 1) }, (_, i) => pageIndex + 1 + i);

    indices.forEach(idx => {
      if (idx >= 0 && idx < pages.length && !loadedPages.has(idx)) {
        setLoadedPages(prev => new Set(prev).add(idx));
        const img = new Image();
        img.src = pages[idx];
      }
    });
  }, [pages, pageIndex, scrollMode, loadedPages]);

  // IntersectionObserver for scroll mode
  useEffect(() => {
    if (!scrollMode || !scrollRef.current) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.page);
            if (!isNaN(idx)) setPageIndex(idx);
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );
    Object.entries(pageRefs.current).forEach(([idx, el]) => {
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, [scrollMode, pages]);

  // Save progress
  useEffect(() => {
    if (chapter && manga?.id) {
      try {
        const key = "mangaProgress";
        const progress = JSON.parse(localStorage.getItem(key) || "{}");
        progress[manga.id] = { ch: parseFloat(chapter.chapter) || chIndex + 1, page: pageIndex, chId: chapter.id };
        localStorage.setItem(key, JSON.stringify(progress));
      } catch {}
    }
  }, [chapter, manga, chIndex, pageIndex]);

  const chaptersLen = chapters?.length || 0;
  const pagesLen = pages?.length || 0;

  const goNextChapter = useCallback(() => {
    if (chIndex < chaptersLen - 1) { setChIndex(i => i + 1); return true; }
    return false;
  }, [chIndex, chaptersLen]);

  const goPrevChapter = useCallback(() => {
    if (chIndex > 0) { setChIndex(i => i - 1); return true; }
    return false;
  }, [chIndex]);

  const goPrevPage = useCallback(() => {
    if (direction === "rtl") {
      setPageIndex(i => { if (i >= pagesLen - 1) return i; return i + 1; });
    } else {
      setPageIndex(i => Math.max(0, i - 1));
    }
  }, [direction, pagesLen]);

  const goNextPage = useCallback(() => {
    if (direction === "rtl") {
      setPageIndex(i => { if (i <= 0) return i; return i - 1; });
    } else {
      setPageIndex(i => {
        if (i >= pagesLen - 1) {
          if (chIndex < chaptersLen - 1) setChIndex(ci => ci + 1);
          return i;
        }
        return i + 1;
      });
    }
  }, [direction, pagesLen, chIndex, chaptersLen]);

  const goNextPageRef = useRef(goNextPage);
  const goPrevPageRef = useRef(goPrevPage);
  useEffect(() => { goNextPageRef.current = goNextPage; });
  useEffect(() => { goPrevPageRef.current = goPrevPage; });

  useEffect(() => {
    const handler = (e) => {
      if (scrollMode) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrevPageRef.current(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goNextPageRef.current(); }
      if (e.key === "f") setFitMode(m => m === "width" ? "height" : m === "height" ? "original" : "width");
      if (e.key === "c") setScrollMode(m => !m);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scrollMode]);

  const handleImgClick = (e) => {
    if (scrollMode) return;
    if (direction === "rtl") {
      const half = e.target.offsetWidth / 2 || 0;
      if (e.nativeEvent.offsetX > half) goPrevPage();
      else goNextPage();
    } else {
      goNextPage();
    }
  };

  const handleImgMouseDown = (e) => {
    window.lastClickX = e.nativeEvent.offsetX;
  };

  const chNum = chapter?.chapter || "?";
  const chTitle = chapter?.title || `Ch. ${chNum}`;
  const hasPrevCh = chIndex > 0;
  const hasNextCh = chIndex < chaptersLen - 1;
  const currentPage = direction === "rtl" ? pagesLen - pageIndex : pageIndex + 1;
  const totalPages = pagesLen;

  const toggleQuality = () => setQuality(q => q === "data" ? "data-saver" : "data");
  const toggleDirection = () => setDirection(d => d === "ltr" ? "rtl" : "ltr");

  const cycleFitMode = () => setFitMode(m => m === "width" ? "height" : m === "height" ? "original" : "width");

  const onImageLoad = (idx) => {
    setLoadedPages(prev => new Set(prev).add(idx));
  };

  const fitModeLabel = { width: "Fit W", height: "Fit H", original: "100%" };

  return (
    <div className={`reader-overlay ${scrollMode ? "scroll-mode" : ""}`} onClick={onClose}>
      <div className="reader-shell" onClick={e => e.stopPropagation()}>
        <header className="reader-header">
          <button className="reader-back-btn" onClick={onClose}>
            <ChevronLeft size={22} /> {manga?.title || "Back"}
          </button>
          <span className="reader-title">{chTitle}</span>
          <div className="reader-header-actions">
            <button className="reader-action-btn" onClick={() => setScrollMode(m => !m)} title={`Scroll: ${scrollMode ? "ON" : "OFF"}`}>
              <BookOpen size={16} />
              <span>{scrollMode ? "Scroll" : "Page"}</span>
            </button>
            <button className="reader-action-btn" onClick={cycleFitMode} title={`Fit: ${fitMode}`}>
              <Maximize2 size={16} />
              <span>{fitModeLabel[fitMode]}</span>
            </button>
            <button className="reader-action-btn" onClick={toggleDirection} title={`Direction: ${direction.toUpperCase()}`}>
              <ArrowLeftRight size={16} />
              <span>{direction.toUpperCase()}</span>
            </button>
            <button className="reader-action-btn" onClick={toggleQuality} title={`Quality: ${quality}`}>
              <ImageIcon size={16} />
              <span>{QUALITY_ICON[quality]}</span>
            </button>
            <button className="reader-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="reader-body">
          <div className="reader-controls-top">
            <div className="reader-ch-nav">
              <button disabled={!hasPrevCh} onClick={goPrevChapter}>
                <ChevronLeft size={18} /> Prev
              </button>
              <ChapterSelector chapters={chapters} chIndex={chIndex} onSelect={setChIndex} />
              <button disabled={!hasNextCh} onClick={goNextChapter}>
                Next <ChevronRight size={18} />
              </button>
            </div>
            {!scrollMode && (
              <div className="reader-page-jump">
                <span className="reader-page-indicator">{currentPage} / {totalPages}</span>
              </div>
            )}
          </div>

          <div className={`reader-pages ${scrollMode ? "reader-pages-scroll" : ""}`} ref={scrollRef}>
            {loading && (
              <div className="reader-loading">
                <Loader size={32} className="reader-spinner" />
                <p>Loading chapter...</p>
              </div>
            )}
            {error && <div className="reader-error">{error}</div>}

            {!loading && !error && pagesLen > 0 && !scrollMode && (
              <PageImage
                key={`${chapter?.id}_${pageIndex}`}
                src={chapter?.provider !== "mangadex" ? pages[pageIndex] : `${API_BASE}/scrape/manga-image?url=${encodeURIComponent(pages[pageIndex])}&chapterId=${chapter?.id || ''}`}
                alt={`Page ${currentPage}`}
                onLoad={() => onImageLoad(pageIndex)}
                onClick={handleImgClick}
                onMouseDown={handleImgMouseDown}
                fitMode={fitMode}
              />
            )}

            {!loading && !error && pagesLen > 0 && scrollMode && (
              <div className="reader-scroll-container">
                {pages.map((url, i) => (
                  <div key={`${chapter?.id}_${i}`} ref={el => { if (el) pageRefs.current[i] = el; }} data-page={i} className="reader-scroll-page">
                    <PageImage
                      src={chapter?.provider !== "mangadex" ? url : `${API_BASE}/scrape/manga-image?url=${encodeURIComponent(url)}&chapterId=${chapter?.id || ''}`}
                      alt={`Page ${i + 1}`}
                      onLoad={() => onImageLoad(i)}
                      fitMode={scrollMode ? "width" : fitMode}
                      style={{ minHeight: scrollMode ? "200px" : undefined }}
                    />
                  </div>
                ))}
                {hasNextCh && (
                  <div className="reader-scroll-next-ch">
                    <p>End of Chapter {chNum}</p>
                    <button className="reader-next-ch-btn" onClick={goNextChapter}>
                      Next Chapter <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {!loading && !error && pagesLen === 0 && (
              <div className="reader-loading"><p>No pages available.</p></div>
            )}
          </div>

          <div className="reader-controls-bottom">
            <div className="reader-page-nav">
              <button
                disabled={scrollMode || (direction === "ltr" ? pageIndex === 0 : pageIndex >= pagesLen - 1)}
                onClick={goPrevPage}
              >
                <ChevronLeft size={18} />
              </button>
              {!scrollMode ? (
                <span>{currentPage} / {totalPages}</span>
              ) : (
                <span className="reader-scroll-hint">Scroll <ArrowDown size={12} /></span>
              )}
              <button
                disabled={scrollMode || (direction === "ltr" ? pageIndex >= pagesLen - 1 && !hasNextCh : pageIndex <= 0 && !hasPrevCh)}
                onClick={goNextPage}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="reader-progress-bar">
              <div
                className="reader-progress-fill"
                style={{ width: `${pagesLen > 0 ? ((pageIndex + 1) / pagesLen) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
