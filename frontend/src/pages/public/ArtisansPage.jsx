import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import AnnouncementBar from '../../components/layout/AnnouncementBar';
import Footer from '../../components/layout/Footer';
import { sellerService } from '../../services/sellerService';

const FALLBACK_STUDIO_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#F5EFE6"/>
      <rect x="24" y="24" width="552" height="352" fill="none" stroke="#DFD3C3" stroke-width="1.5"/>
      <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#8B6F5E" font-family="Georgia, serif" font-size="20">BharatBazaar Artisan Studio</text>
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#A68B79" font-family="sans-serif" font-size="12">Handcrafted Heritage</text>
    </svg>`
  );

export default function ArtisansPage() {
  const [artisans, setArtisans] = useState([]);
  const [craftOptions, setCraftOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCraft, setSelectedCraft] = useState('all');
  const [selectedState, setSelectedState] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Our Artisans — BharatBazaar';
  }, []);

  const fetchArtisans = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await sellerService.getPublicArtisans({
        search: searchQuery,
        craft: selectedCraft,
        state: selectedState,
      });
      setArtisans(res.artisans || []);
      if (res.filters) {
        setCraftOptions(res.filters.crafts || []);
        setStateOptions(res.filters.states || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load verified artisan studios right now.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCraft, selectedState]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchArtisans();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchArtisans]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleReset = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedCraft('all');
    setSelectedState('all');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cream)' }}>
      <AnnouncementBar />
      <Navbar />

      {/* Editorial Hero */}
      <section
        className="border-b border-[#E8DED2] py-16 sm:py-20 px-5 sm:px-8 lg:px-14"
        style={{ background: 'var(--cream-warm)' }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <p className="section-eyebrow" style={{ textAlign: 'center' }}>
            Verified Makers &amp; Studios
          </p>
          <h1
            className="text-3xl sm:text-5xl font-bold mt-2 mb-4"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--brown-dark)', lineHeight: 1.15 }}
          >
            The Hands Behind Every Heirloom
          </h1>
          <span className="divider-gold mx-auto" style={{ margin: '12px auto 20px' }} />
          <p
            className="max-w-2xl mx-auto text-sm sm:text-base leading-relaxed"
            style={{ fontFamily: 'var(--font-sans)', color: 'var(--brown-mid)' }}
          >
            Every approved storefront on BharatBazaar belongs to an independent Indian artisan,
            weaver collective, or regional MSME workshop reviewed for craft authenticity.
          </p>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="px-5 sm:px-8 lg:px-14 py-8 border-b border-[#E8DED2] bg-white">
        <div className="max-w-7xl mx-auto">
          <form
            onSubmit={handleSearchSubmit}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-5">
              <label
                htmlFor="artisan-search"
                className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1"
              >
                Search Artisan or Studio
              </label>
              <input
                id="artisan-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Store name, craft, or city..."
                className="w-full px-3.5 py-2.5 text-xs border border-[#D6CCC2] rounded-sm focus:outline-none focus:border-[#C0522B]"
              />
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="craft-filter"
                className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1"
              >
                Craft Specialization
              </label>
              <select
                id="craft-filter"
                value={selectedCraft}
                onChange={(e) => setSelectedCraft(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-[#D6CCC2] rounded-sm bg-white focus:outline-none focus:border-[#C0522B]"
              >
                <option value="all">All Craft Traditions</option>
                {craftOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="state-filter"
                className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1"
              >
                State / Region
              </label>
              <select
                id="state-filter"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-[#D6CCC2] rounded-sm bg-white focus:outline-none focus:border-[#C0522B]"
              >
                <option value="all">All States</option>
                {stateOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-white rounded-sm transition-opacity hover:opacity-90 cursor-pointer"
                style={{ background: 'var(--burgundy)' }}
              >
                Filter
              </button>
              {(searchQuery || selectedCraft !== 'all' || selectedState !== 'all') && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-2.5 px-3 text-xs font-semibold border border-[#D6CCC2] rounded-sm text-[#4A3728] hover:bg-[#FAF7F2] cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Directory Grid */}
      <main className="flex-1 px-5 sm:px-8 lg:px-14 py-12">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="p-5 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between mb-6">
              <span>{error}</span>
              <button type="button" onClick={fetchArtisans} className="underline font-semibold cursor-pointer">
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-96 bg-white border border-[#E8DED2] animate-pulse" />
              ))}
            </div>
          ) : artisans.length === 0 ? (
            <div className="p-12 bg-white border border-[#E8DED2] text-center max-w-xl mx-auto space-y-3">
              <h2
                className="text-xl font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                No Verified Artisan Studios Found
              </h2>
              <p className="text-xs text-[#7A5C4A] leading-relaxed">
                No approved artisan storefronts match your current search or filter selection.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                {(searchQuery || selectedCraft !== 'all' || selectedState !== 'all') && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 text-xs font-semibold border border-[#D6CCC2] text-[#2C2C2C] cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  to="/seller/register"
                  className="px-4 py-2 text-xs font-semibold text-white uppercase tracking-wider"
                  style={{ background: 'var(--burgundy)' }}
                >
                  Apply as an Artisan
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {artisans.map((artisan) => (
                <article
                  key={artisan.id}
                  className="card-lift bg-white border border-[#E8DED2] flex flex-col overflow-hidden"
                >
                  <div className="relative h-56 overflow-hidden bg-[#F5EFE6]">
                    <img
                      src={artisan.featured_image || FALLBACK_STUDIO_IMG}
                      alt={artisan.store_name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        if (e.currentTarget.src !== FALLBACK_STUDIO_IMG) {
                          e.currentTarget.src = FALLBACK_STUDIO_IMG;
                        }
                      }}
                    />
                    {artisan.craft_category && (
                      <span
                        className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
                        style={{ background: 'var(--burgundy)' }}
                      >
                        {artisan.craft_category}
                      </span>
                    )}
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <h2
                      className="text-xl font-bold text-[#2C2C2C]"
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      {artisan.store_name}
                    </h2>
                    {artisan.artisan_name && (
                      <p className="text-xs font-semibold text-[#7A5C4A] mt-0.5">
                        Led by {artisan.artisan_name}
                      </p>
                    )}
                    <p className="text-[11px] text-[#8B6F5E] mt-1">
                      {[artisan.city, artisan.state].filter(Boolean).join(', ')}
                    </p>

                    <p className="text-xs text-[#4A3728] leading-relaxed mt-3 flex-1">
                      {artisan.business_description ||
                        'Approved independent Indian craft studio on BharatBazaar.'}
                    </p>

                    <div className="pt-4 mt-4 border-t border-[#F0EBE3] flex items-center justify-between text-xs">
                      <span className="text-[#7A5C4A]">
                        {artisan.approved_products_count}{' '}
                        {artisan.approved_products_count === 1 ? 'approved item' : 'approved items'}
                      </span>
                      <Link
                        to={`/shop?seller=${artisan.id}`}
                        className="font-bold uppercase tracking-wider text-[11px] hover:opacity-75 transition-opacity"
                        style={{ color: 'var(--burgundy)' }}
                      >
                        Explore Crafts →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
