import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, BookOpen, Heart, ChevronDown, Loader } from "lucide-react";
import { getMangaById, getMangaChapters, searchAndGetManga, searchMangaNato, getMangaNatoChapters, getMangaNatoPages, searchToonily, getToonilyChapters, getToonilyPages, searchBato, getBatoChapters, getBatoPages } from "../services/mangaApi";
import { loadReadlist, addToReadlist, removeFromReadlist, getMangaProgress } from "../services/storage";
import { addNotification } from "../services/notificationService";
import MangaReader from "./Feeds/MangaReader";
import ErrorBoundary from "../components/ErrorBoundary";
import Background from "../components/Background";
import AnimatedPage from "../components/AnimatedPage";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./MangaDetail.css";

export default function MangaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chLoading, setChLoading] = useState(true);
  const [error, setError] = useState("");
  const [isInList, setIsInList] = useState(false);
  const [chapterLimit, setChapterLimit] = useState(50);

  const [readerManga, setReaderManga] = useState(null);
  const [readerChapters, setReaderChapters] = useState([]);
  const [readerChapter, setReaderChapter] = useState(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  useDocumentTitle(manga?.title || "Manga");

  useEffect(() => {
    setIsInList(loadReadlist().some(i => i.id === id));
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const m = await getMangaById(id);
        setManga(m);
      } catch {
        try {
          const titleFromStorage = localStorage.getItem(`manga_title_${id}`);
          if (titleFromStorage) {
            const m = await searchAndGetManga(titleFromStorage);
            if (m) { setManga(m); return; }
          }
          setError("Failed to load manga details. The ID may not be a MangaDex UUID.");
        } catch {
          setError("Failed to load manga details.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!manga) return;
    (async () => {
      setChLoading(true);
      try {
        const mangaDexId = manga.id || id;
        let ch = await getMangaChapters(mangaDexId);
        if (ch.length === 0) {
          const natoResults = await searchMangaNato(manga?.title || "");
          if (natoResults.length > 0) {
            ch = await getMangaNatoChapters(natoResults[0].id);
            for (const c of ch) {
              try {
                c.pagesList = await getMangaNatoPages(c.id);
                c.pages = c.pagesList.length;
                c.provider = 'manganato';
              } catch { continue; }
            }
            ch = ch.filter(c => c.pages > 0);
          }
        }
        if (ch.length === 0) {
          const toonilyResults = await searchToonily(manga?.title || "");
          if (toonilyResults.length > 0) {
            ch = await getToonilyChapters(toonilyResults[0].id);
            for (const c of ch) {
              try {
                c.pagesList = await getToonilyPages(c.id);
                c.pages = c.pagesList.length;
                c.provider = 'toonily';
              } catch { continue; }
            }
            ch = ch.filter(c => c.pages > 0);
          }
        }
        if (ch.length === 0) {
          const batoResults = await searchBato(manga?.title || "");
          if (batoResults.length > 0) {
            ch = await getBatoChapters(batoResults[0].id);
            for (const c of ch) {
              try {
                c.pagesList = await getBatoPages(c.id);
                c.pages = c.pagesList.length;
                c.provider = 'bato';
              } catch { continue; }
            }
            ch = ch.filter(c => c.pages > 0);
          }
        }
        setChapters(ch);
      } catch {
      } finally {
        setChLoading(false);
      }
    })();
  }, [manga, id]);

  const openReader = async (ch) => {
    if (!ch) {
      addNotification({ title: "No Chapters", body: "No readable chapters found for this manga.", type: "error" });
      return;
    }
    setReaderManga(manga);
    setReaderChapters(chapters);
    setReaderChapter(ch);
    setReaderOpen(true);
  };

  const toggleReadlist = () => {
    if (isInList) {
      removeFromReadlist(id);
      setIsInList(false);
    } else if (manga) {
      addToReadlist({
        id,
        title: manga.title,
        cover: manga.coverUrl,
        rating: 0,
        ch: chapters.length,
        status: manga.status,
        author: manga.author,
      });
      setIsInList(true);
    }
  };

  const showAll = () => setChapterLimit(chapters.length);
  const displayedCh = chapterLimit >= chapters.length ? chapters : chapters.slice(0, chapterLimit);
  const hasMoreCh = chapterLimit < chapters.length;

  useGSAP(() => {
    const hero = document.querySelector(".md-hero-content");
    const cover = document.querySelector(".md-cover-wrap");
    if (hero) {
      gsap.from(hero, { opacity: 0, y: 40, duration: 0.6, ease: "power3.out" });
    }
    if (cover) {
      gsap.from(cover, { opacity: 0, scale: 0.9, duration: 0.5, delay: 0.2, ease: "back.out(1.5)" });
    }
  }, [manga]);

  if (loading) {
    return (
      <AnimatedPage>
        <div className="md"><Background />
          <div className="md-loading"><Loader size={36} className="md-spinner" /><p>Loading manga...</p></div>
        </div>
      </AnimatedPage>
    );
  }

  if (error) {
    return (
      <AnimatedPage>
        <div className="md"><Background />
          <div className="md-loading"><p>{error}</p>
            <button className="md-back-btn" onClick={() => navigate("/browse/manga")}>Back to Browse</button>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="md">
        <Background />
        <div className="md-bg-ornament" />

        <div className="md-shell">
          <button className="md-nav-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back
          </button>

          <div className="md-hero">
            <div className="md-cover-wrap">
              {manga.coverUrl && <img src={manga.coverUrl} alt={manga.title} className="md-cover" />}
            </div>
            <div className="md-hero-content">
              <h1 className="md-title">{manga.title}</h1>
              <div className="md-meta">
                {manga.author && <span className="md-meta-item">{manga.author}</span>}
                {manga.year && <span className="md-meta-item">{manga.year}</span>}
                <span className={`md-meta-item md-status ${manga.status}`}>{manga.status}</span>
              </div>
              {manga.tags?.length > 0 && (
                <div className="md-tags">
                  {manga.tags.map(t => <span key={t} className="md-tag">{t}</span>)}
                </div>
              )}
              {manga.description && (() => {
                const clean = manga.description.replace(/<[^>]*>/g, "");
                const truncated = clean.length > 300 && !descExpanded;
                return (
                  <p className="md-desc">
                    {truncated ? clean.slice(0, 300) + "..." : clean}
                    {clean.length > 300 && (
                      <button className="md-desc-toggle" onClick={() => setDescExpanded(e => !e)}>
                        {descExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </p>
                );
              })()}
              <div className="md-actions">
                {(() => {
                  const progress = getMangaProgress(manga.id || id);
                  const progressCh = typeof progress === "object" ? progress.ch : progress;
                  const resumeCh = progressCh
                    ? chapters.find(c => parseFloat(c.chapter) === parseFloat(progressCh)) || chapters.find(c => parseFloat(c.chapter) >= parseFloat(progressCh))
                    : null;
                  const startCh = resumeCh || chapters[0];
                  const isResume = resumeCh && progressCh && parseFloat(progressCh) > 1;
                  return (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="md-btn md-btn-primary"
                      disabled={chLoading}
                      onClick={() => {
                        if (chLoading) return;
                        if (chapters.length === 0) {
                          addNotification({ title: "No Chapters", body: "No readable chapters found for this manga.", type: "error" });
                          return;
                        }
                        openReader(startCh);
                      }}>
                      <BookOpen size={16} /> {chLoading ? "Loading..." : chapters.length === 0 ? "No Chapters" : isResume ? `Continue Ch. ${startCh?.chapter || progressCh}` : `Start Reading Ch. ${chapters[0]?.chapter || 1}`}
                    </motion.button>
                  );
                })()}
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className={`md-btn md-btn-secondary ${isInList ? "active" : ""}`} onClick={toggleReadlist}>
                  <Heart size={16} fill={isInList ? "currentColor" : "none"} />
                  {isInList ? "In Your List" : "Add to List"}
                </motion.button>
              </div>
            </div>
          </div>

          <section className="md-chapters">
            <h2 className="md-section-title">Chapters ({chapters.length})</h2>
            {chLoading ? (
              <div className="md-ch-loading"><Loader size={24} className="md-spinner" /><p>Loading chapters...</p></div>
            ) : chapters.length === 0 ? (
              <div className="md-ch-empty"><p>No chapters available.</p></div>
            ) : (
              <div className="md-ch-list">
                {(() => {
                  const progress = getMangaProgress(manga.id || id);
                  const progressCh = typeof progress === "object" ? progress.ch : progress;
                  const progressNum = parseFloat(progressCh) || 0;
                  return displayedCh.map((ch, i) => {
                    const chNum = parseFloat(ch.chapter) || 0;
                    const isRead = progressNum > 0 && chNum < progressNum;
                    const isCurrent = progressNum > 0 && chNum === progressNum;
                    return (
                      <motion.button key={ch.id} className="md-ch-item"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => openReader(ch)}
                        style={isCurrent ? { borderLeftColor: '#8b5cf6', background: 'rgba(139,92,246,0.08)' } : isRead ? { opacity: 0.55 } : undefined}
                      >
                        <div className="md-ch-left">
                          <span className="md-ch-num">Ch. {ch.chapter}</span>
                          {ch.title && <span className="md-ch-title">{ch.title}</span>}
                          {isCurrent && <span style={{ fontSize: '0.62rem', color: '#a78bfa', fontWeight: 700, marginLeft: 8, padding: '2px 8px', background: 'rgba(139,92,246,0.15)', borderRadius: 99, letterSpacing: '0.05em' }}>READING</span>}
                          {isRead && <span style={{ fontSize: '0.62rem', color: '#666', marginLeft: 8 }}>✓ Read</span>}
                        </div>
                        <div className="md-ch-right">
                          {ch.group && <span className="md-ch-group">{ch.group}</span>}
                          <span className="md-ch-pages">{ch.pages}p</span>
                        </div>
                      </motion.button>
                    );
                  });
                })()}
              </div>
            )}
            {hasMoreCh && (
              <button className="md-ch-more" onClick={showAll}>
                Show All ({chapters.length} chapters) <ChevronDown size={16} />
              </button>
            )}
          </section>
        </div>

        {readerOpen && (
          <ErrorBoundary
            fallbackMessage="Failed to load chapter reader"
            onReset={() => setReaderOpen(false)}
            minHeight="400px"
          >
            <MangaReader
              manga={readerManga}
              chapters={readerChapters || []}
              initialChapter={readerChapter}
              onClose={() => setReaderOpen(false)}
            />
          </ErrorBoundary>
        )}
      </div>
    </AnimatedPage>
  );
}
