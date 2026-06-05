import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { ThumbsUp } from "lucide-react";
import "./CompleteWatchPage.css";

const MOCK_EPISODES = [
  { id: 1, title: "1. The Magic That Started Everything", views: "185K", date: "2 months ago", videoId: "dQw4w9WgXcQ", thumb: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150" },
  { id: 2, title: "2. The School of the Grassland", views: "118K", date: "2 months ago", videoId: "9bZkp7q19f0", thumb: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150" },
  { id: 3, title: "3. The Dadah Range Test", views: "102K", date: "2 months ago", videoId: "kJQP7kiw5Fk", thumb: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150" },
  { id: 4, title: "4. Meetings in Kalhn", views: "113K", date: "1 month ago", videoId: "dQw4w9WgXcQ", thumb: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=150" },
  { id: 5, title: "5. The Dragon's Labyrinth", views: "125K", date: "1 month ago", videoId: "9bZkp7q19f0", thumb: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150" },
];

const MOCK_COMMENTS = [
  { id: 1, user: "OtakuGamer", avatar: "🔮", text: "The animation in this episode was insane! Witch Hat Atelier is easily AOTY.", time: "2 hours ago", likes: 42 },
  { id: 2, user: "MangaReader99", avatar: "🦊", text: "They adapted Chapter 4 perfectly. Qifrey's entrance gave me chills.", time: "5 hours ago", likes: 19 },
  { id: 3, user: "Satoru_GoJo", avatar: "🕶️", text: "Is it just me or is the pacing getting better and better?", time: "1 day ago", likes: 8 }
];

const RECOMMENDED_ANIME = [
  { id: 1, title: "Wind's Anthem", type: "MUSIC", year: "2026", season: "OTHER", cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100" },
  { id: 2, title: "Fullmetal Alchemist: B", type: "TV", year: "2009", season: "SPRING", cover: "https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?w=100" },
  { id: 3, title: "Frieren: Beyond Journey", type: "TV", year: "2023", season: "FALL", cover: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=100" }
];

export default function CompleteWatchPage() {
  const { id } = useParams();
  const [isEpisodesExpanded, setEpisodesExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEp, setSelectedEp] = useState(MOCK_EPISODES[0]);
  const [isSub, setIsSub] = useState(true);

  const filteredEpisodes = MOCK_EPISODES.filter(ep => ep.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="page-container complete-watch">
      <div className="watch-grid">

        <div className="watch-left">
          <div className="player-card card-base">
            <div className="player-aspect">
              <iframe
                title={`player-${selectedEp.id}`}
                src={`https://www.youtube.com/embed/${selectedEp.videoId}`}
                allowFullScreen
              />
            </div>

            <div className="controls-bar">
              <div className="controls-left">
                <button onClick={() => setIsSub(true)} className={`btn-pill ${isSub ? 'active' : ''}`}>SUB</button>
                <button onClick={() => setIsSub(false)} className={`btn-pill ${!isSub ? 'active' : ''}`}>DUB</button>
                <div style={{ marginLeft: 8, color: 'var(--text-tertiary)' }}>🌐 Server 1</div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn-pill">Add to List</button>
                <div style={{ color: 'var(--text-secondary)' }}><ThumbsUp size={13} /> 467</div>
              </div>
            </div>

            <div className="meta-title">
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>#1 Trending Anime</div>
              <h2 style={{ margin: '6px 0 0 0' }}>{selectedEp.title}</h2>
            </div>
          </div>

          <div className="comments-card card-base">
            <h3 style={{ margin: 0 }}>Comments ({MOCK_COMMENTS.length})</h3>

            <div className="comment-input">
              <div className="comment-avatar">👤</div>
              <input placeholder="Add a comment" />
              <button className="btn-pill">Send</button>
            </div>

            <div className="comments-list">
              {MOCK_COMMENTS.map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-avatar">{comment.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <strong>{comment.user}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{comment.time}</span>
                    </div>
                    <div className="comment-text">{comment.text}</div>
                    <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 13 }}><ThumbsUp size={13} /> {comment.likes} • Reply</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="watch-sidebar">
          <div className="sidebar-card card-base">
            <div className="sidebar-header">
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Currently Playing</div>
                <div style={{ fontWeight: 700 }}>{selectedEp.title}</div>
              </div>
              <button onClick={() => setEpisodesExpanded(!isEpisodesExpanded)} aria-label="Toggle episodes">{isEpisodesExpanded ? '▾' : '▸'}</button>
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="episode-search">
                <span style={{ position: 'absolute', left: 12, top: 10 }}>🔍</span>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search episodes" />
              </div>
            </div>

            {isEpisodesExpanded && (
              <div className="custom-scrollbar episode-list">
                {filteredEpisodes.map((ep) => {
                  const isActive = ep.id === selectedEp.id;
                  return (
                    <div key={ep.id} onClick={() => setSelectedEp(ep)} className={`episode-item ${isActive ? 'active' : ''}`}>
                      <img className="episode-thumb" src={ep.thumb} alt={ep.title} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="episode-title">{ep.title}</div>
                        <div className="episode-meta">{ep.views} • {ep.date}</div>
                      </div>
                      {isActive && <div style={{ color: 'var(--primary)' }}>▶️</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="recommend-card card-base">
            <h4 style={{ margin: 0 }}>More Like This</h4>
            <div className="recommend-list" style={{ marginTop: 10 }}>
              {RECOMMENDED_ANIME.map(a => (
                <div key={a.id} className="recommend-item">
                  <img src={a.cover} alt={a.title} />
                  <div style={{ minWidth: 0 }}>
                    <div className="recommend-title">{a.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.type} • {a.season} • {a.year}</div>
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
