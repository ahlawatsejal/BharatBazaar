import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import AnnouncementBar from '../../components/layout/AnnouncementBar';
import Footer from '../../components/layout/Footer';
import { CRAFT_STORIES } from '../../data/craftStories';
import { handleImageError } from '../../utils/imageFallback';

export default function CraftStoriesPage() {
  const { slug } = useParams();
  const activeStory = slug ? CRAFT_STORIES.find((s) => s.slug === slug) : null;
  const featuredStory = CRAFT_STORIES[0];

  useEffect(() => {
    document.title = activeStory
      ? `${activeStory.craft} — Craft Stories | BharatBazaar`
      : 'Craft Stories — BharatBazaar';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStory]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cream)' }}>
      <AnnouncementBar />
      <Navbar />

      {slug && !activeStory ? (
        <main className="flex-1 flex items-center justify-center px-5 py-20">
          <div className="max-w-md w-full bg-white border border-[#E8DED2] p-8 text-center space-y-3">
            <h1 className="text-2xl font-bold text-[#2C2C2C]" style={{ fontFamily: 'var(--font-serif)' }}>
              Story Not Found
            </h1>
            <p className="text-xs text-[#7A5C4A]">
              We could not find the requested craft tradition journal entry.
            </p>
            <Link
              to="/craft-stories"
              className="inline-block px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white"
              style={{ background: 'var(--burgundy)' }}
            >
              View All Craft Stories
            </Link>
          </div>
        </main>
      ) : activeStory ? (
        /* Individual Craft Story Detail View */
        <main className="flex-1 px-5 sm:px-8 lg:px-14 py-12">
          <article className="max-w-4xl mx-auto bg-white border border-[#E8DED2] overflow-hidden">
            <div className="h-72 sm:h-96 overflow-hidden bg-[#F5EFE6]">
              <img
                src={activeStory.image}
                alt={activeStory.title}
                className="w-full h-full object-cover"
                onError={(e) => handleImageError(e)}
              />
            </div>

            <div className="p-6 sm:p-10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <Link
                  to="/craft-stories"
                  className="font-semibold text-[#7A5C4A] hover:text-[#C0522B]"
                >
                  ← All Craft Stories
                </Link>
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#C0522B]">
                  {activeStory.region} · {activeStory.readTime}
                </span>
              </div>

              <h1
                className="text-2xl sm:text-4xl font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif)', lineHeight: 1.2 }}
              >
                {activeStory.title}
              </h1>

              <p className="text-sm sm:text-base text-[#4A3728] leading-relaxed border-l-2 border-[#C9962A] pl-4">
                {activeStory.excerpt}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-5 bg-[#FAF7F2] border border-[#E8DED2]">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] mb-2">
                    Materials &amp; Medium
                  </h2>
                  <p className="text-xs text-[#4A3728] leading-relaxed">{activeStory.materials}</p>
                </div>

                <div className="p-5 bg-[#FAF7F2] border border-[#E8DED2]">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] mb-2">
                    Regional Heritage
                  </h2>
                  <p className="text-xs text-[#4A3728] leading-relaxed">{activeStory.region}</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#4A3728] leading-relaxed">
                <div>
                  <h2
                    className="text-lg font-bold text-[#2C2C2C] mb-1.5"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    Craft Technique
                  </h2>
                  <p>{activeStory.technique}</p>
                </div>
                <div>
                  <h2
                    className="text-lg font-bold text-[#2C2C2C] mb-1.5"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    Cultural Context
                  </h2>
                  <p>{activeStory.culturalContext}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-[#E8DED2] flex flex-wrap items-center justify-between gap-4">
                <Link
                  to={`/shop?search=${encodeURIComponent(activeStory.craft.split(' ')[0])}`}
                  className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
                  style={{ background: 'var(--burgundy)' }}
                >
                  Explore {activeStory.craft} in Shop
                </Link>
                <Link
                  to="/artisans"
                  className="text-xs font-semibold text-[#2C2C2C] hover:text-[#C0522B]"
                >
                  Browse Verified Artisans →
                </Link>
              </div>
            </div>
          </article>
        </main>
      ) : (
        /* Craft Stories Index */
        <>
          <section
            className="border-b border-[#E8DED2] py-16 sm:py-20 px-5 sm:px-8 lg:px-14"
            style={{ background: 'var(--cream-warm)' }}
          >
            <div className="max-w-5xl mx-auto text-center">
              <p className="section-eyebrow" style={{ textAlign: 'center' }}>
                Heritage Journal
              </p>
              <h1
                className="text-3xl sm:text-5xl font-bold mt-2 mb-4"
                style={{ fontFamily: 'var(--font-serif)', color: 'var(--brown-dark)', lineHeight: 1.15 }}
              >
                Living Craft Traditions of India
              </h1>
              <span className="divider-gold mx-auto" style={{ margin: '12px auto 20px' }} />
              <p
                className="max-w-2xl mx-auto text-sm sm:text-base leading-relaxed"
                style={{ fontFamily: 'var(--font-sans)', color: 'var(--brown-mid)' }}
              >
                Explore the regional techniques, natural pigments, looms, and cultural lineages
                behind India’s timeless handmade traditions.
              </p>
            </div>
          </section>

          <main className="flex-1 px-5 sm:px-8 lg:px-14 py-12 space-y-12">
            {/* Featured Craft Story */}
            <section className="max-w-7xl mx-auto bg-white border border-[#E8DED2] grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              <div className="lg:col-span-6 h-72 lg:h-auto overflow-hidden bg-[#F5EFE6]">
                <img
                  src={featuredStory.image}
                  alt={featuredStory.title}
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageError(e)}
                />
              </div>
              <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-center space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#C0522B]">
                  Featured Tradition · {featuredStory.region}
                </span>
                <h2
                  className="text-2xl sm:text-3xl font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif)', lineHeight: 1.2 }}
                >
                  {featuredStory.title}
                </h2>
                <p className="text-sm text-[#4A3728] leading-relaxed">{featuredStory.excerpt}</p>
                <p className="text-xs text-[#7A5C4A] leading-relaxed">{featuredStory.technique}</p>
                <div className="pt-2">
                  <Link
                    to={`/craft-stories/${featuredStory.slug}`}
                    className="inline-block px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
                    style={{ background: 'var(--burgundy)' }}
                  >
                    Read Full Story →
                  </Link>
                </div>
              </div>
            </section>

            {/* Editorial Grid */}
            <section className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {CRAFT_STORIES.map((story) => (
                  <article
                    key={story.slug}
                    className="card-lift bg-white border border-[#E8DED2] flex flex-col overflow-hidden"
                  >
                    <div className="h-52 overflow-hidden bg-[#F5EFE6]">
                      <img
                        src={story.image}
                        alt={story.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        loading="lazy"
                        onError={(e) => handleImageError(e)}
                      />
                    </div>
                    <div className="p-6 flex flex-col flex-1 space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#C0522B]">
                        <span>{story.region}</span>
                        <span className="text-[#8B6F5E]">{story.readTime}</span>
                      </div>
                      <h3
                        className="text-lg font-bold text-[#2C2C2C]"
                        style={{ fontFamily: 'var(--font-serif)', lineHeight: 1.3 }}
                      >
                        {story.title}
                      </h3>
                      <p className="text-xs text-[#4A3728] leading-relaxed flex-1">
                        {story.excerpt}
                      </p>
                      <div className="pt-3 border-t border-[#F0EBE3] flex items-center justify-between text-xs">
                        <span className="text-[11px] text-[#7A5C4A]">{story.craft}</span>
                        <Link
                          to={`/craft-stories/${story.slug}`}
                          className="font-bold uppercase tracking-wider text-[11px] hover:opacity-75"
                          style={{ color: 'var(--burgundy)' }}
                        >
                          Read Story →
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>
        </>
      )}

      <Footer />
    </div>
  );
}
