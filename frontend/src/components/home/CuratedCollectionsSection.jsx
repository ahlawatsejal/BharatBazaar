import { Link } from 'react-router-dom';
import { handleImageError } from '../../utils/imageFallback';

const CURATED_COLLECTIONS = [
  {
    id: 'festive',
    eyebrow: 'Seasonal Edit',
    title: 'Festive Collection',
    description: 'Handwoven Banarasi zari textiles, celebratory attire, and heirloom craft for special occasions.',
    image: '/hero/hero-textiles.jpg',
    to: '/shop?category=handloom-textiles',
  },
  {
    id: 'gifts',
    eyebrow: 'Thoughtful Keepsakes',
    title: 'Artisan Gifts',
    description: 'Handcrafted Kundan jewellery, brass accents, and one-of-a-kind keepsakes made by master makers.',
    image: '/hero/hero-jewellery.jpg',
    to: '/shop?category=jewellery-accessories',
  },
  {
    id: 'traditional',
    eyebrow: 'Heritage Mastery',
    title: 'Traditional Indian Crafts',
    description: 'Jaipur blue pottery, terracotta vessels, and generational craft traditions from across India.',
    image: '/categories/pottery-ceramics.jpg',
    to: '/shop?category=pottery-ceramics',
  },
  {
    id: 'home-decor',
    eyebrow: 'Curated Living',
    title: 'Home Décor Collection',
    description: 'Carved sheesham wood lanterns, brass diyas, and timeless accents for warm living spaces.',
    image: '/categories/home-decor.jpg',
    to: '/shop?category=home-decor',
  },
];

export default function CuratedCollectionsSection() {
  return (
    <section id="collections" style={{ background: 'var(--cream)' }} className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
        <div className="mb-10 sm:mb-12">
          <p className="section-eyebrow">Curated Edits</p>
          <h2 className="section-title">Signature Collections</h2>
          <span className="divider-gold" />
          <p className="section-subtitle">
            Explore themed collections bringing together India&apos;s finest craft clusters for gifting, celebrations, and everyday living.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {CURATED_COLLECTIONS.map((col) => (
            <Link
              key={col.id}
              to={col.to}
              className="card-lift group relative block overflow-hidden border border-[#E8DED2]"
              style={{ aspectRatio: '4/5', background: 'var(--surface-elevated)' }}
            >
              <img
                src={col.image}
                alt={col.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={(e) => handleImageError(e)}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgba(20, 10, 8, 0.90) 35%, rgba(20, 10, 8, 0.35) 70%, transparent 100%)',
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <span
                  style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-sans)' }}
                  className="block text-[10px] font-bold uppercase tracking-[0.18em] mb-1"
                >
                  {col.eyebrow}
                </span>
                <h3
                  style={{ fontFamily: 'var(--font-serif)', color: '#F8F5F0' }}
                  className="text-xl font-bold mb-1.5"
                >
                  {col.title}
                </h3>
                <p
                  style={{ color: 'rgba(248, 245, 240, 0.78)', fontFamily: 'var(--font-sans)' }}
                  className="text-xs leading-relaxed mb-3 line-clamp-2"
                >
                  {col.description}
                </p>
                <span
                  style={{ color: '#F8F5F0', fontFamily: 'var(--font-sans)' }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest border-b border-white/40 pb-0.5 group-hover:border-white transition-colors"
                >
                  Discover More →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
