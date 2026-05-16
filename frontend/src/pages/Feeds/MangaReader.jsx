import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Loader, Image, ArrowLeftRight } from "lucide-react";
import { getChapterPages } from "../../services/mangaApi";
import "./MangaReader.css";

const QUALITY_ICON = { data: "HD", "data-saver": "SD" };

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
  const [direction, setDirection] = useState("ltr");
  const [preloaded, setPreloaded] = useState([]);
  const [imgError, setImgError] = useState(false);
  const [imgRetry, setImgRetry] = useState(0);
  const imgRef = useRef(null);

  const chapter = chapters?.[chIndex];

  const loadPages = useCallback(async () => {
    if (!chapter?.id) { setLoading(false); setError("Chapter not found."); return; }
    setLoading(true);
    setError("");
    setPageIndex(0);
    setImgError(false);
    setPreloaded([]);
    setImgRetry(0);
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
  }, [chapter?.id, quality]);

  useEffect(() => { loadPages(); }, [loadPages]);

  useEffect(() => {
    if (pages?.length > 0 && pageIndex < pages.length - 1) {
      const nextIdx = pageIndex + 1;
      if (!preloaded.includes(nextIdx)) {
        setPreloaded(p => [...p, nextIdx]);
        try {
          const img = new Image();
          img.src = pages[nextIdx];
        } catch {}
      }
    }
  }, [pageIndex, pages, preloaded]);

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
      setPageIndex(i => {
        if (i >= pagesLen - 1) return i;
        return i + 1;
      });
    } else {
      setPageIndex(i => Math.max(0, i - 1));
    }
  }, [direction, pagesLen]);

  const goNextPage = useCallback(() => {
    if (direction === "rtl") {
      setPageIndex(i => {
        if (i <= 0) return i;
        return i - 1;
      });
    } else {
      setPageIndex(i => {
        if (i >= pagesLen - 1) {
          if (chIndex < chaptersLen - 1) {
            setChIndex(ci => ci + 1);
          }
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
      if (e.key === "ArrowLeft") goPrevPageRef.current();
      if (e.key === "ArrowRight") goNextPageRef.current();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleImgClick = () => {
    if (direction === "rtl") {
      const half = imgRef.current?.offsetWidth / 2 || 0;
      const x = window.lastClickX || 0;
      if (x > half) goPrevPage();
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

  const toggleQuality = () => {
    setQuality(q => q === "data" ? "data-saver" : "data");
  };

  const toggleDirection = () => {
    setDirection(d => d === "ltr" ? "rtl" : "ltr");
  };

  return (
    <div className="reader-overlay" onClick={onClose}>
      <div className="reader-shell" onClick={e => e.stopPropagation()}>
        <header className="reader-header">
          <button className="reader-back-btn" onClick={onClose}>
            <ChevronLeft size={22} /> {manga?.title || "Back"}
          </button>
          <span className="reader-title">{chTitle}</span>
          <div className="reader-header-actions">
            <button className="reader-action-btn" onClick={toggleDirection} title={`Direction: ${direction.toUpperCase()}`}>
              <ArrowLeftRight size={16} />
              <span>{direction.toUpperCase()}</span>
            </button>
            <button className="reader-action-btn" onClick={toggleQuality} title={`Quality: ${quality}`}>
              <Image size={16} />
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
              <span>Ch. {chNum}</span>
              <button disabled={!hasNextCh} onClick={goNextChapter}>
                Next <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="reader-pages">
            {loading && (
              <div className="reader-loading">
                <Loader size={32} className="reader-spinner" />
                <p>Loading chapter...</p>
              </div>
            )}
            {error && <div className="reader-error">{error}</div>}
            {!loading && !error && pagesLen > 0 && !imgError && (
              <img
                key={`${chapter?.id}_${pageIndex}_${imgRetry}`}
                ref={imgRef}
                src={imgRetry > 0 ? `${pages[pageIndex]}?retry=${imgRetry}` : pages[pageIndex]}
                onError={() => {
                  if (imgRetry < 2) {
                    setImgRetry(r => r + 1);
                  } else {
                    setImgError(true);
                  }
                }}
                alt={`Page ${currentPage}`}
                className="reader-page-img"
                onClick={handleImgClick}
                onMouseDown={handleImgMouseDown}
              />
            )}
            {imgError && !loading && !error && (
              <div className="reader-error">
                <p>Failed to load this page.</p>
                <button className="reader-retry-btn" onClick={() => {
                  setImgRetry(0);
                  setImgError(false);
                }}>
                  Try Again
                </button>
              </div>
            )}
            {!loading && !error && pagesLen === 0 && (
              <div className="reader-loading"><p>No pages available.</p></div>
            )}
          </div>

          <div className="reader-controls-bottom">
            <div className="reader-page-nav">
              <button disabled={direction === "ltr" ? pageIndex === 0 : pageIndex >= pagesLen - 1} onClick={goPrevPage}>
                <ChevronLeft size={18} />
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button disabled={direction === "ltr" ? pageIndex >= pagesLen - 1 && !hasNextCh : pageIndex <= 0 && !hasPrevCh} onClick={goNextPage}>
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
