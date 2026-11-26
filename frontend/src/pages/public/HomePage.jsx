import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import AnnouncementBar from "../../components/layout/AnnouncementBar";
import Footer from "../../components/layout/Footer";
import HeroSection from "../../components/home/HeroSection";
import CategoriesSection from "../../components/home/CategoriesSection";
import NewArrivalsSection from "../../components/home/NewArrivalsSection";
import CuratedCollectionsSection from "../../components/home/CuratedCollectionsSection";
import RegionsSection from "../../components/home/RegionsSection";
import FeaturedProducts from "../../components/home/FeaturedProducts";
import ArtisansSection from "../../components/home/ArtisansSection";
import WhySection from "../../components/home/WhySection";
import SellerCTASection from "../../components/home/SellerCTASection";

/**
 * HomePage — BharatBazaar public homepage.
 *
 * Layout:
 *   Navbar (white, two-level, centered logo + icons)
 *   AnnouncementBar (dark brown, dismissible)
 *   Search panel (shown/hidden via state)
 *   HeroSection (full-viewport editorial)
 *   ... rest of sections ...
 *   Footer
 */
export default function HomePage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    setSearchOpen(false);
    navigate(`/shop?search=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div style={{ background: "var(--cream)" }}>
      {/* ── Sticky header block ── */}
      <div className="sticky top-0 z-50">
        <Navbar
          onSearchToggle={() => setSearchOpen(v => !v)}
          searchOpen={searchOpen}
        />
        <AnnouncementBar />

        {/* ── Search panel: slides in below nav ── */}
        {searchOpen && (
          <div
            style={{
              background: "#fff",
              borderBottom: "1px solid #e8ddd4",
              boxShadow: "0 4px 20px rgba(47,33,27,0.1)",
            }}
            className="px-6 py-4"
          >
            <div className="max-w-2xl mx-auto relative">
              <label
                htmlFor="site-search"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "10px",
                  fontWeight: "600",
                  letterSpacing: "0.18em",
                  color: "var(--brown-light)",
                  display: "block",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}
              >
                Search BharatBazaar
              </label>
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <input
                  id="site-search"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search crafts, artisans, regions…"
                  autoFocus
                  style={{
                    flex: 1,
                    border: "1px solid #d4c8b8",
                    borderRadius: "2px",
                    background: "var(--cream)",
                    color: "var(--brown-dark)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    padding: "10px 14px",
                    outline: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#9D294D")}
                  onBlur={e => (e.target.style.borderColor = "#d4c8b8")}
                />
                <button
                  type="submit"
                  disabled={!searchTerm.trim()}
                  aria-label="Search products"
                  style={{
                    background: "var(--burgundy)",
                    color: "#fff",
                    fontFamily: "var(--font-sans)",
                    fontSize: "11px",
                    fontWeight: "600",
                    letterSpacing: "0.12em",
                  }}
                  className="px-4 py-2.5 rounded-sm uppercase hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  style={{ color: "var(--brown-light)", fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: "600", letterSpacing: "0.1em" }}
                  className="hover:text-[var(--burgundy)] transition-colors px-2 py-2 cursor-pointer"
                >
                  CLOSE
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <main>
        <HeroSection />
        <CategoriesSection />
        <NewArrivalsSection />
        <CuratedCollectionsSection />
        <FeaturedProducts />
        <RegionsSection />
        <ArtisansSection />
        <WhySection />
        <SellerCTASection />
      </main>

      <Footer />
    </div>
  );
}
