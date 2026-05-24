import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import discoverService from "../../services/discoverService";
import {
  TrendingUp, Calendar, Clock, Star, ChevronLeft, ChevronRight,
} from "lucide-react";
import "./DiscoverPage.css";

const TABS = [
  { key: "trending", label: "Trending", icon: TrendingUp },
  { key: "seasonal", label: "This Season", icon: Calendar },
  { key: "upcoming", label: "Upcoming", icon: Clock },
];

const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];

function AnimeCard({ anime, onClick }) {
  const title = anime.title?.english || anime.title?.romaji || "Unknown";
  return (
    <div className="dc-card" onClick={() => onClick(anime.id)}>
      <div className="dc-card-img-wrap">
        <img
          src={anime.coverImage?.large}
          alt={title}
          className="dc-card-img"
          loading="lazy"
        />
        {anime.averageScore && (
          <span className="dc-card-score">
            <Star size={10} /> {anime.averageScore}%
          </span>
        )}
      </div>
      <div className="dc-card-info">
        <h4 className="dc-card-title">{title}</h4>
        <div className="dc-card-meta">
          {anime.format && <span>{anime.format.replace(/_/g, " ")}</span>}
          {anime.episodes && <span>{anime.episodes} eps</span>}
          {anime.season && anime.seasonYear && (
            <span>{anime.season} {anime.seasonYear}</span>
          )}
        </div>
        {anime.genres?.length > 0 && (
          <div className="dc-card-genres">
            {anime.genres.slice(0, 3).map(g => (
              <span key={g} className="dc-genre">{g}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("trending");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({});
  const [season, setSeason] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    setPage(1);
    load(1);
  }, [tab, season, year]);

  const load = async (p) => {
    setLoading(true);
    try {
      let res;
      if (tab === "trending") {
        res = await discoverService.getTrending(p);
      } else if (tab === "seasonal") {
        const params = { page: p };
        if (season) params.season = season;
        if (year) params.year = year;
        res = await discoverService.getSeasonal(params);
      } else {
        res = await discoverService.getUpcoming(p);
      }
      setData(res.data || []);
      setPageInfo(res.pageInfo || {});
    } catch {}
    setLoading(false);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    load(newPage);
    window.scrollTo(0, 0);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="dc-page">
      <div className="dc-container">
        <div className="dc-header">
          <h1 className="dc-title"><TrendingUp size={22} /> Discover</h1>
          <p className="dc-subtitle">Find your next favorite anime</p>
        </div>

        <div className="dc-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`dc-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "seasonal" && (
          <div className="dc-season-filters">
            <select
              className="dc-select"
              value={season}
              onChange={e => setSeason(e.target.value)}
            >
              <option value="">Auto</option>
              {SEASONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              className="dc-select"
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="dc-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="dc-skeleton">
                <div className="dc-skeleton-img" />
                <div className="dc-skeleton-info">
                  <div className="dc-skeleton-line dc-skeleton-line--long" />
                  <div className="dc-skeleton-line dc-skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="dc-empty">
            <Calendar size={32} strokeWidth={1} />
            <h3>No results</h3>
            <p>Try a different season or year</p>
          </div>
        ) : (
          <>
            <div className="dc-grid">
              {data.map(anime => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  onClick={id => navigate(`/anime/${id}`)}
                />
              ))}
            </div>

            {pageInfo.lastPage > 1 && (
              <div className="dc-pagination">
                <button disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                  <ChevronLeft size={16} />
                </button>
                <span>{page} / {pageInfo.lastPage}</span>
                <button disabled={!pageInfo.hasNextPage} onClick={() => handlePageChange(page + 1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
