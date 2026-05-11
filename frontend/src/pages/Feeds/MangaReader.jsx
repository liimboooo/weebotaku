import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Loader } from "lucide-react";
import { getChapterPages } from "../../services/mangaApi";
import "./MangaReader.css";

export default function MangaReader({ manga, chapters, initialChapter, onClose }) {
  const [chIndex, setChIndex] = useState(() => {
    const idx = chapters.findIndex(c => c.id === initialChapter?.id);
    return idx >= 0 ? idx : 0;
  });
  const [pages, setPages] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const chapter = chapters[chIndex];

  const loadPages = useCallback(async () => {
    if (!chapter) return;
    setLoading(true);
    setError("");
    setPageIndex(0);
    try {
      const urls = await getChapterPages(chapter.id);
      setPages(urls);
    } catch (e) {
      setError("Failed to load chapter pages.");
    } finally {
      setLoading(false);
    }
  }, [chapter]);

  useEffect(() => { loadPages(); }, [loadPages]);

  useEffect(() => {
    if (chapter && manga) {
      const key = "mangaProgress";
      const progress = JSON.parse(localStorage.getItem(key) || "{}");
      progress[manga.id] = parseInt(chapter.chapter) || chIndex + 1;
      localStorage.setItem(key, JSON.stringify(progress));
    }
  }, [chapter, manga, chIndex]);

  const goNextChapter = () => {
    if (chIndex < chapters.length - 1) setChIndex(i => i + 1);
  };
  const goPrevChapter = () => {
    if (chIndex > 0) setChIndex(i => i - 1);
  };
  const goPrevPage = () => setPageIndex(i => Math.max(0, i - 1));
  const goNextPage = () => {
    setPageIndex(i => {
      if (i >= pages.length - 1) {
        if (chIndex < chapters.length - 1) goNextChapter();
        return i;
      }
      return i + 1;
    });
  };

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

  const chNum = chapter?.chapter || "?";
  const chTitle = chapter?.title || `Chapter ${chNum}`;
  const hasPrevCh = chIndex > 0;
  const hasNextCh = chIndex < chapters.length - 1;

  return (
    <div className="reader-overlay" onClick={onClose}>
      <div className="reader-shell" onClick={e => e.stopPropagation()}>
        <header className="reader-header">
          <button className="reader-back-btn" onClick={onClose}>
            <ChevronLeft size={22} /> {manga?.title || "Back"}
          </button>
          <span className="reader-title">{chTitle}</span>
          <button className="reader-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
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
            {!loading && !error && pages.length > 0 && (
              <img
                key={chapter?.id + "_" + pageIndex}
                src={pages[pageIndex]}
                alt={`Page ${pageIndex + 1}`}
                className="reader-page-img"
                referrerPolicy="no-referrer"
                onClick={goNextPage}
              />
            )}
            {!loading && !error && pages.length === 0 && (
              <div className="reader-loading"><p>No pages available.</p></div>
            )}
          </div>

          <div className="reader-controls-bottom">
            <div className="reader-page-nav">
              <button disabled={pageIndex === 0} onClick={goPrevPage}>
                <ChevronLeft size={18} />
              </button>
              <span>{pageIndex + 1} / {pages.length}</span>
              <button disabled={pageIndex >= pages.length - 1 && !hasNextCh} onClick={goNextPage}>
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="reader-progress-bar">
              <div
                className="reader-progress-fill"
                style={{ width: `${pages.length > 0 ? ((pageIndex + 1) / pages.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
