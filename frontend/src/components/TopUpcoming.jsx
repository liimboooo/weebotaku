import { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import './TopUpcoming.css';

const ITEMS = [
  {
    id: 'kimi-100',
    title: 'Kimi no Koto ga Dai Dai Dai Dai Daisuki na 100-nin no Kanojo',
    img: 'https://placehold.co/200x280/2a0a18/ffffff?text=100+Girlfriends',
    studio: 'BANDAI NAMCO FILMWORKS',
    studioColor: '#e91e8c',
    label: 'Ep 1 airing in',
    date: 'Jul 5, 2026',
    source: 'MANGA',
    desc: 'The third season of Kimi no Koto ga Dai Dai Dai Dai Daisuki na 100-nin no Kanojo.',
    tags: ['Comedy', 'Ecchi', 'Romance'],
  },
  {
    id: 'wakagimi-2',
    title: 'Nige Jouzu no Wakagimi 2nd Season',
    img: 'https://placehold.co/200x280/2a1a08/ffffff?text=Wakagimi+S2',
    studio: 'ANIPLEX',
    studioColor: '#f97316',
    label: 'Ep 1 airing in',
    date: 'Jul 2026',
    source: 'MANGA',
    desc: 'The second season of Nige Jouzu no Wakagimi.',
    tags: ['Action', 'Adventure'],
  },
  {
    id: 'black-torch',
    title: 'BLACK TORCH',
    img: 'https://placehold.co/200x280/08222a/ffffff?text=BLACK+TORCH',
    studio: '100STUDIO',
    studioColor: '#06b6d4',
    label: 'Ep 1 airing in',
    date: 'Jul 4, 2026',
    source: 'MANGA',
    desc: "Although he may appear rough-and-tumble, Azuma's compassionate side emerges when it comes to the furry critters he can communicate with. But Jiro's soft spot for animals gets him into major trouble when a suspicious stray cat bonds with him, granting him exceptional power.",
    tags: ['Action', 'Adventure', 'Fantasy'],
  },
];

const tagClass = (t) => `tu-tag tu-tag--${t.toLowerCase()}`;

export default function TopUpcoming() {
  const scrollRef = useRef(null);

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 520, behavior: 'smooth' });
    }
  };

  return (
    <section className="tu-section">
      <header className="tu-header">
        <h2 className="tu-title">Top Upcoming</h2>
        <button className="tu-arrow" onClick={scrollRight} aria-label="Scroll right">
          <ArrowRight size={18} strokeWidth={2.2} />
        </button>
      </header>

      <div className="tu-scroll" ref={scrollRef}>
        {ITEMS.map((item) => (
          <article key={item.id} className="tu-card">
            <div className="tu-card-cover">
              <img src={item.img} alt={item.title} />
              <div className="tu-cover-overlay">
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
