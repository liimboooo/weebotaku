import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Comments from "../components/Comments";
import "./WatchPage.css";

function FallbackPlayer({ videoId }) {
  return (
    <div className="player-aspect">
      <iframe
        title="watch-player"
        src={`https://www.youtube.com/embed/${videoId}?rel=0`}
        frameBorder="0"
        allowFullScreen
      />
    </div>
  );
}

export default function WatchPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const apiBase = process.env.REACT_APP_API_URL || "";
    fetch(`${apiBase}/api/watch/${id}`)
      .then(r => r.json())
      .then((json) => {
        if (!mounted) return;
        if (json && json.media) setMedia(json.media);
        else setMedia(json || null);
      })
      .catch((err) => { if (mounted) setError(err.message || String(err)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  const sampleVideo = "dQw4w9WgXcQ";

  return (
    <div className="page-container watch-page">
      <div className="watch-grid">
        <main className="watch-main">
          <div className="card-base player-card">
            {loading && <div className="player-loading">Loading...</div>}
            {!loading && error && <div className="player-error">Failed to load media</div>}
            {!loading && !error && (
              <FallbackPlayer videoId={media?.trailer?.id || sampleVideo} />
            )}
          </div>

          <div className="card-base meta-card">
            <div className="meta-title">{media?.title?.romaji || media?.title || `Anime ${id}`}</div>
            <div className="meta-sub">{media?.format || ''} • {media?.seasonYear || ''} • {media?.episodes ? `${media.episodes} eps` : ''}</div>
            <p className="meta-synopsis">{media?.description?.replace(/<[^>]+>/g, '') || 'No synopsis available.'}</p>
          </div>

          <div className="card-base comments-card">
            <h3 className="comments-heading">Comments</h3>
            <Comments compact />
          </div>
        </main>

        <aside className="watch-side">
          <div className="card-base episodes-card">
            <div className="episodes-header">
              <h4>Episodes</h4>
              <div className="episodes-count">{media?.episodes || '—'}</div>
            </div>
            <div className="episode-list">
              {Array.from({ length: media?.episodes || 12 }).map((_, i) => (
                <button key={i} className="episode-row">Ep {i + 1}</button>
              ))}
            </div>
          </div>

          <div className="card-base recommend-card">
            <h4>More Like This</h4>
            <div className="recommend-list">
              {(media?.recommendations?.nodes || []).slice(0, 6).map((r, idx) => (
                <div className="recommend-item" key={idx}>
                  <img src={r.coverImage?.medium || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=120'} alt="rec" />
                  <div className="recommend-meta">
                    <div className="recommend-title">{r.title?.romaji || r.title || 'Untitled'}</div>
                    <div className="recommend-sub">{r.format || ''} • {r.seasonYear || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
