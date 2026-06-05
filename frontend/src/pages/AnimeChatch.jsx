import React, { useEffect, useState, useRef } from "react";
import { ThumbsUp, MessageCircle, Share2, Bookmark } from "lucide-react";
import PosterCard from "../components/PosterCard";
import "./AnimeChatch.css";

export default function AnimeChatch() {
  const [data, setData] = useState(null);
  const [recs, setRecs] = useState([]);
  const [views, setViews] = useState(0);
  const [descOpen, setDescOpen] = useState(false);
  const playerRef = useRef();

  // Read ?id= from URL, default to 1
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || '1';

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/watch/${id}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        setData(json.data.info || null);
        setRecs(json.data.recommendations || []);
        setViews(json.data.info?.views || 0);
        // increment views
        fetch(`/api/watch/${id}/views`, { method: 'POST' }).then(r => r.json()).then(j => {
          if (j?.views) setViews(j.views);
        }).catch(err => console.error('[AnimeWch] Failed to increment views:', err));
      } catch (e) {
        console.error(e);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  const title = data?.title || 'Loading...';

  return (
    <div className="animechatch-page">
      <div className="ac-left">
        <div className="ac-player-wrap">
          {data?.trailerUrl ? (
            <iframe
              ref={playerRef}
              className="ac-player"
              src={data.trailerUrl.replace('watch?v=', 'embed/')}
              title={title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video className="ac-player" controls poster={data?.image || '/jpg/sample-1.jpg'}>
              <source src="/jpg/sample-1.jpg" type="video/mp4" />
            </video>
          )}
        </div>

        <div className="ac-meta">
          <h1 className="ac-title">{title}</h1>
          <div className="ac-subrow">
            <div className="ac-stats">{views.toLocaleString()} views · {data?.episodes ? `${data.episodes} eps` : ''}</div>
            <div className="ac-actions">
              <button className="ac-btn"><ThumbsUp size={16} /> Like</button>
              <button className="ac-btn"><MessageCircle size={16} /> Comment</button>
              <button className="ac-btn"><Share2 size={16} /> Share</button>
              <button className="ac-btn"><Bookmark size={16} /> Save</button>
            </div>
          </div>

          <div className="ac-channel">
            <div className="ac-avatar">{data?.studio?.charAt(0) || 'A'}</div>
            <div className="ac-channel-meta">
              <div className="ac-channel-name">{data?.studio || 'AnimeChatch'}</div>
              <div className="ac-subs">Official • {data?.rating ? `${(data.rating*10).toFixed(0)}%` : ''}</div>
            </div>
            <button className="ac-subscribe">Subscribe</button>
          </div>

          <div className={`ac-description ${descOpen ? 'open' : ''}`} onClick={() => setDescOpen(v => !v)}>
            <div className="ac-desc-text">{data?.synopsis || 'No description available.'}</div>
            <div className="ac-desc-toggle">{descOpen ? 'Show less' : 'Show more'}</div>
          </div>
        </div>

        <div className="ac-comments">
          <h3>Comments</h3>
          <div className="ac-comment-placeholder">Real-time chat and comments will appear here.</div>
        </div>
      </div>

      <aside className="ac-right">
        <div className="ac-suggestions">
          {recs.length ? recs.map((s) => (
            <div key={s.id} className="ac-sugg">
              <a href={`/anime/${s.id}`}> 
                <img src={s.image || '/jpg/sample-2.jpg'} alt={s.title} />
              </a>
              <div className="ac-sugg-meta">
                <a className="ac-sugg-title" href={`/anime/${s.id}`}>{s.name || s.title}</a>
                <div className="ac-sugg-info">{s.episodes || ''} eps · {s.genres?.[0] || ''}</div>
              </div>
            </div>
          )) : (
            // fallback suggestions
            new Array(6).fill(0).map((_, i) => (
              <PosterCard key={i} to={`/anime/${i+1}`} image={`/jpg/sample-${(i%3)+1}.jpg`} title={`Suggested Anime ${i+1}`} />
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
