import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { handleImageError } from "../../utils/imageFallback";

const HERO_INTERVAL_MS = 3000;

const HERO_SLIDES = [
  {
    src: "/hero-clean.jpg",
    alt: "Handcrafted pottery, terracotta and ceramic vases on stone steps",
    label: "Terracotta & Pottery",
  },
  {
    src: "/hero/hero-blue-pottery.jpg",
    alt: "Hand-painted Jaipur blue pottery and glazed ceramic vessels on sandstone steps",
    label: "Jaipur Blue Pottery",
  },
  {
    src: "/hero/hero-jewellery.jpg",
    alt: "Traditional Indian handcrafted Kundan, meenakari, and antique brass jewellery on raw silk",
    label: "Traditional Jewellery",
  },
  {
    src: "/hero/hero-textiles.jpg",
    alt: "Handwoven Indian Banarasi and Chanderi silk textiles with gold zari borders",
    label: "Handloom & Textiles",
  },
  {
    src: "/hero/hero-handbags.jpg",
    alt: "Handcrafted Indian embroidered zari potli bags and artisan leather-and-ikat handbags",
    label: "Artisan Handbags",
  },
  {
    src: "/hero/hero-brass-wood.jpg",
    alt: "Traditional Indian carved sheesham wood handicrafts and hammered antique brass décor",
    label: "Brass & Woodcraft",
  },
];

/**
 * HeroSection — Lanes & Legacies Luxury Editorial Hero
 *
 * Built with razor-sharp vector typography and high-resolution curated craft
 * photography with a smooth 3-second cross-fade carousel.
 *
 * Typography:
 * - LANES & LEGACIES: Cormorant Garamond serif with tracked letterforms
 * - "Bringing the artistry of the बाज़ार home": Italic serif with authentic Devanagari calligraphy
 * - NEW COLLECTION: Italic tracked serif in muted plum
 * - SHOP NOW: Razor-sharp interactive button linking to /shop
 */
export default function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  // Preload all curated hero images once on mount for flicker-free cross-fades
  useEffect(() => {
    HERO_SLIDES.forEach((slide) => {
      const img = new Image();
      img.src = slide.src;
    });
  }, []);

  // Track user's reduced-motion preference
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Advance hero slide automatically every 3 seconds unless reduced motion is enabled
  useEffect(() => {
    if (prefersReducedMotion) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, HERO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion]);

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ background: "#DED3C4" }}
      aria-label="Lanes & Legacies — Bringing the artistry of the बाज़ार home"
    >
      <div className="relative w-full max-w-[1600px] mx-auto">
        {/* ── Background: Curated Craft Photography Carousel (Cross-fade every 3s) ── */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: "1966 / 914",
            minHeight: "340px",
          }}
        >
          {HERO_SLIDES.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                onError={handleImageError}
                className={`absolute inset-0 w-full h-full object-cover object-center block select-none ${
                  prefersReducedMotion ? "" : "transition-opacity duration-700 ease-in-out"
                } ${isActive ? "opacity-100 z-0" : "opacity-0 z-0 pointer-events-none"}`}
                loading="eager"
                fetchPriority={index === 0 ? "high" : "auto"}
                aria-hidden={!isActive}
              />
            );
          })}

          {/* ── Mobile readability scrim so dark plum typography stays crisp on small viewports ── */}
          <div
            className="absolute inset-0 pointer-events-none sm:hidden z-10"
            style={{
              background:
                "linear-gradient(to bottom, rgba(244, 236, 225, 0.78) 0%, rgba(235, 224, 210, 0.88) 55%, rgba(222, 211, 196, 0.92) 100%)",
            }}
            aria-hidden="true"
          />

          {/* ── Subtle ambient warmth gradient on right for maximum text crispness ── */}
          <div
            className="absolute inset-0 pointer-events-none hidden sm:block z-10"
            style={{
              background:
                "radial-gradient(ellipse at 78% 50%, rgba(222, 211, 196, 0.45) 0%, rgba(222, 211, 196, 0.15) 50%, transparent 80%)",
            }}
            aria-hidden="true"
          />

          {/* ── Razor-Sharp HTML/CSS Vector Typography Overlay ── */}
          <div
            className="absolute top-0 right-0 z-20 h-full w-full sm:w-[48%] px-6 sm:pl-[3%] sm:pr-[5%] flex flex-col justify-center items-center text-center select-none"
          >
            {/* Top Text Group */}
            <div className="flex flex-col items-center mb-4 sm:mb-6 lg:mb-10">
              {/* Title: LANES & LEGACIES */}
              <h1
                style={{
                  fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                  color: "#381A20",
                  fontSize: "clamp(1.4rem, 3.4vw, 3rem)",
                  fontWeight: "700",
                  letterSpacing: "0.18em",
                  lineHeight: 1.1,
                  textTransform: "uppercase",
                  marginBottom: "8px",
                  textShadow: "0 1px 2px rgba(255, 255, 255, 0.4)",
                }}
              >
                Lanes &amp; Legacies
              </h1>

              {/* Subtitle: Bringing the artistry of the बाज़ार home */}
              <div
                className="flex items-center justify-center flex-wrap"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  color: "#46242B",
                  fontSize: "clamp(0.92rem, 1.7vw, 1.45rem)",
                  fontStyle: "italic",
                  lineHeight: 1.25,
                }}
              >
                <span>Bringing the artistry of the</span>

                {/* Styled Devanagari "बाज़ार" with calligraphic underline */}
                <span className="relative inline-flex flex-col items-center mx-1.5 not-italic">
                  <span
                    style={{
                      fontFamily: "'Rozha One', 'Cormorant Garamond', serif",
                      color: "#381A20",
                      fontSize: "1.15em",
                      fontWeight: "700",
                      lineHeight: 1,
                    }}
                  >
                    बाज़ार
                  </span>
                  {/* Graceful Calligraphic Flourish Underline */}
                  <svg
                    width="46"
                    height="8"
                    viewBox="0 0 54 10"
                    fill="none"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 overflow-visible"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 3C14 8 38 9 52 2C42 4 28 5 16 3"
                      stroke="#46242B"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>

                <span>home</span>
              </div>
            </div>

            {/* Bottom Group: NEW COLLECTION + SHOP NOW Button */}
            <div className="flex flex-col items-center mt-2 sm:mt-4 lg:mt-6">
              {/* Category Tag: NEW COLLECTION */}
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  color: "#623F46",
                  fontSize: "clamp(0.85rem, 1.4vw, 1.25rem)",
                  fontStyle: "italic",
                  fontWeight: "600",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                New Collection
              </p>

              {/* Crisp, Interactive SHOP NOW Button */}
              <Link
                to="/shop"
                style={{
                  background: "#381A20",
                  color: "#FFFFFF",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "clamp(10px, 1vw, 12px)",
                  fontWeight: "700",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "10px 28px",
                  borderRadius: "1px",
                  boxShadow: "0 4px 14px rgba(56, 26, 32, 0.25)",
                }}
                className="transition-all duration-200 hover:-translate-y-[2px] hover:bg-[#4E2730] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#381A20]"
                aria-label="Shop Lanes & Legacies New Collection"
              >
                SHOP NOW
              </Link>
            </div>
          </div>

          {/* ── Subtle Slide Indicators (Accessible, unobtrusive) ── */}
          <div
            className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 sm:left-8 sm:translate-x-0 z-20 flex items-center gap-2"
            role="group"
            aria-label="Hero showcase slides"
          >
            {HERO_SLIDES.map((slide, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={slide.src}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show slide ${index + 1} of ${HERO_SLIDES.length}: ${slide.label}`}
                  aria-pressed={isActive}
                  className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#381A20] ${
                    isActive
                      ? "w-6 bg-[#381A20]"
                      : "w-1.5 bg-[#381A20]/35 hover:bg-[#381A20]/65"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
