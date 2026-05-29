import { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import './TopUpcoming.css';

const ITEMS = [
  {
    id: 'kimi-100',
    title: 'Kimi no Koto ga Dai Dai Dai Dai Daisuki na 100-nin no Kanojo',
    img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx162694-QFBei5pbjSh8.png',
    studio: 'BANDAI NAMCO FILMWORKS',
    studioColor: '#ff5bc8',
    label: 'EP 1 AIRING IN',
    date: 'Jul 5, 2026',
    source: 'MANGA',
    desc: 'The third season of Kimi no Koto ga Dai Dai Dai Dai Daisuki na 100-nin no Kanojo.',
    tags: ['Comedy', 'Ecchi', 'Romance'],
  },
  {
    id: 'wakagimi-2',
    title: 'Nige Jouzu no Wakagimi 2nd Season',
    img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx162896-hSMTVceb50GY.jpg',
    studio: 'ANIPLEX',
    studioColor: '#ff9800',
    label: 'EP 1 AIRING IN',
    date: 'Jul 2026',
    source: 'MANGA',
    desc: 'The second season of Nige Jouzu no Wakagimi.',
    tags: ['Action', 'Adventure'],
  },
  {
    id: 'black-torch',
    title: 'BLACK TORCH',
    img: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx187538-rPuvj09LMjdC.jpg',
    studio: '100STUDIO',
    studioColor: '#00e5ff',
    label: 'EP 1 AIRING IN',
    date: 'Jul 4, 2026',
    source: 'MANGA',
    desc: "Although he may appear rough-and-tumble, Azuma's compassionate side emerges when it comes to furry critters he can communicate with. But Jiro's soft spot for animals gets him into major trouble when a suspicious stray cat bonds with him, granting him exceptional power.",
    tags: ['Action', 'Adventure', 'Fantasy'],
  },
];

const tagClass = (t) => `tu-tag tu-tag--${t.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

export default function TopUpcoming() {
  const scrollRef = useRef(null);

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 500, behavior: 'smooth' });
    }
  };

  return (
    <section className="tu-section">
      <header className="tu-header">
        <h2 className="tu-title">Top Upcoming</h2>
        <button className="tu-arrow" onClick={scrollRight} aria-label="Scroll right">
          <ArrowRight size={18} strokeWidth={2.4} />
        </button>
      </header>

      <div className="tu-scroll" ref={scrollRef}>
        {ITEMS.map((item) => (
          <article key={item.id} className="tu-card">
            <div className="tu-card-cover">
              <img src={item.img} alt={item.title} loading="lazy" />
              <div className="tu-cover-overlay" />
              <div className="tu-cover-text">
                <h3 className="tu-cover-title">{item.title}</h3>
                <span className="tu-studio" style={{ color: item.studioColor }}>
                  {item.studio}
                </span>
              </div>
            </div>

            <div className="tu-card-body">
              <span className="tu-label">{item.label}</span>
              <span className="tu-date">{item.date}</span>
              <span className="tu-source">Source : {item.source}</span>
              <p className="tu-desc">{item.desc}</p>
              <div className="tu-tags">
                {item.tags.map((t) => (
                  <span key={t} className={tagClass(t)}>{t}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
