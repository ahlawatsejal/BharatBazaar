import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useCart } from "../../context/useCart";
import { productService } from "../../services/productService";
import ThemeToggleButton from "../common/ThemeToggleButton";

const navLinks = [
  { label: "HOME", to: "/", end: true },
  { label: "SHOP", to: "/shop", hasDropdown: true },
  { label: "OUR ARTISANS", to: "/artisans" },
  { label: "CRAFT STORIES", to: "/craft-stories" },
  { label: "IMPACT", to: "/impact" },
];

export default function Navbar({ onSearchToggle, searchOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();

  useEffect(() => {
    let active = true;
    productService
      .getCategories()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        setCategories(list.filter((c) => c.is_active !== false));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Helper to determine account destination
  const getAccountLink = () => {
    if (!isAuthenticated || !user) return '/login';
    if (user.role === 'CUSTOMER') return '/customer/dashboard';
    if (user.role === 'SELLER') return user.is_approved_seller ? '/seller/dashboard' : '/seller/pending';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    return '/';
  };

  return (
    <header
      style={{ background: "var(--surface-card)", borderBottom: "1px solid var(--border-subtle)" }}
      className="sticky top-0 z-50 select-none"
    >
      {/* ─── Top Level Header ────────────────────────────────────── */}
      <div className="relative flex items-center justify-between px-5 sm:px-8 lg:px-14 py-2.5 sm:py-3">

        {/* Mobile: Hamburger menu on the left */}
        <div className="flex items-center sm:hidden">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            className="p-1.5 text-[#2F211B] hover:opacity-70 transition-opacity"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* ── Centered BharatBazaar Logo ── */}
        <div className="flex-1 flex justify-center sm:justify-center">
          <Link
            to="/"
            className="flex flex-col items-center group py-0.5"
            aria-label="BharatBazaar Home"
          >
            {/* Geometric Indian craft symbol (4 asterisk motifs with central dot) */}
            <svg
              width="38"
              height="28"
              viewBox="0 0 48 36"
              fill="none"
              aria-hidden="true"
              className="mb-1"
            >
              {/* Central Ruby Dot */}
              <circle cx="24" cy="18" r="3.2" fill="#9D294D" />

              {/* Top Asterisk Motif */}
              <g stroke="#9D294D" strokeWidth="1.6" strokeLinecap="round">
                <line x1="24" y1="3" x2="24" y2="13" />
                <line x1="19" y1="8" x2="29" y2="8" />
                <line x1="20.5" y1="4.5" x2="27.5" y2="11.5" />
                <line x1="27.5" y1="4.5" x2="20.5" y2="11.5" />
              </g>

              {/* Bottom Asterisk Motif */}
              <g stroke="#9D294D" strokeWidth="1.6" strokeLinecap="round">
                <line x1="24" y1="23" x2="24" y2="33" />
                <line x1="19" y1="28" x2="29" y2="28" />
                <line x1="20.5" y1="24.5" x2="27.5" y2="31.5" />
                <line x1="27.5" y1="24.5" x2="20.5" y2="31.5" />
              </g>

              {/* Left Asterisk Motif */}
              <g stroke="#9D294D" strokeWidth="1.6" strokeLinecap="round">
                <line x1="9" y1="18" x2="19" y2="18" />
                <line x1="14" y1="13" x2="14" y2="23" />
                <line x1="10.5" y1="14.5" x2="17.5" y2="21.5" />
                <line x1="17.5" y1="14.5" x2="10.5" y2="21.5" />
              </g>

              {/* Right Asterisk Motif */}
              <g stroke="#9D294D" strokeWidth="1.6" strokeLinecap="round">
                <line x1="29" y1="18" x2="39" y2="18" />
                <line x1="34" y1="13" x2="34" y2="23" />
                <line x1="30.5" y1="14.5" x2="37.5" y2="21.5" />
                <line x1="37.5" y1="14.5" x2="30.5" y2="21.5" />
              </g>
            </svg>

            {/* BharatBazaar Wordmark */}
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: "#9D294D",
                fontSize: "17px",
                fontWeight: "700",
                letterSpacing: "0.24em",
                lineHeight: 1,
              }}
            >
              BHARATBAZAAR
            </span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: "#8B6F5E",
                fontSize: "8px",
                fontWeight: "500",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                marginTop: "3px",
              }}
            >
              BHARATBAZAAR ARTISANS
            </span>
          </Link>
        </div>

        {/* ── Right-Side Outline Icons ── */}
        <div className="flex items-center gap-3 sm:gap-5 text-[#2F211B]">
          {/* Theme Toggle (Desktop & Mobile) */}
          <ThemeToggleButton />

          {/* Search */}
          <button
            onClick={onSearchToggle}
            aria-label="Open search"
            aria-expanded={searchOpen}
            className="p-1 hover:text-[#9D294D] transition-colors"
          >
            <SearchIcon />
          </button>

          {/* Account — hidden on mobile */}
          <Link
            to={getAccountLink()}
            aria-label={isAuthenticated ? `My Account (${user?.first_name || user?.email})` : "Sign In to Account"}
            className="p-1 hover:text-[#9D294D] transition-colors hidden sm:flex items-center gap-1.5"
            title={isAuthenticated ? `Signed in as ${user?.first_name || user?.email} [${user?.role}]` : "Sign In"}
          >
            <AccountIcon />
            {isAuthenticated && (
              <span className="text-[10px] font-bold tracking-wider text-[#9D294D] uppercase">
                {user?.first_name || user?.role}
              </span>
            )}
          </Link>

          {/* Wishlist — hidden on mobile */}
          <Link
            to="/wishlist"
            aria-label="View Wishlist"
            className="p-1 hover:text-[#9D294D] transition-colors hidden sm:block"
          >
            <HeartIcon />
          </Link>

          {/* Shopping Bag — visible on all screen sizes */}
          <Link
            to="/cart"
            aria-label={`Shopping Bag (${cartCount} items)`}
            className="p-1 hover:text-[#9D294D] transition-colors relative"
          >
            <BagIcon />
            {cartCount > 0 && (
              <span
                style={{
                  background: '#9D294D',
                  color: '#FFFFFF',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '9px',
                  fontWeight: '700',
                }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-xs"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ─── Navigation Row (Desktop) ───────────────────────────── */}
      <nav
        aria-label="Main Navigation"
        className="hidden sm:flex justify-center border-t"
        style={{ borderColor: "#eae2d8" }}
      >
        <ul className="flex items-center gap-10 py-3">
          {navLinks.map((link) => (
            <li
              key={link.to}
              className="relative"
              onMouseEnter={() => link.hasDropdown && setShopDropdownOpen(true)}
              onMouseLeave={() => link.hasDropdown && setShopDropdownOpen(false)}
            >
              <NavLink
                to={link.to}
                end={link.end}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  fontWeight: "600",
                  letterSpacing: "0.18em",
                }}
                className={({ isActive }) =>
                  `transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? "text-[#9D294D] border-b border-[#9D294D] pb-0.5"
                      : "text-[#4A3728] hover:text-[#9D294D]"
                  }`
                }
              >
                {link.label}
                {link.hasDropdown && (
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="opacity-70 mt-[1px]"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
              </NavLink>

              {link.hasDropdown && shopDropdownOpen && (
                <div
                  className="absolute left-0 top-full pt-2 z-50 w-56"
                  role="menu"
                  aria-label="Shop Categories"
                >
                  <div className="bg-white border border-[#E8DED2] shadow-lg rounded-sm py-2">
                    <Link
                      to="/shop"
                      onClick={() => setShopDropdownOpen(false)}
                      className="block px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#9D294D] hover:bg-[#FAF7F2]"
                    >
                      Shop All Crafts
                    </Link>
                    <div className="my-1 border-t border-[#F0EBE3]" />
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/shop?category=${encodeURIComponent(cat.slug)}`}
                        onClick={() => setShopDropdownOpen(false)}
                        className="block px-4 py-1.5 text-xs text-[#4A3728] hover:text-[#9D294D] hover:bg-[#FAF7F2] transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* ─── Mobile Dropdown Menu ───────────────────────────────── */}
      {menuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="sm:hidden border-t bg-white px-6 py-4 space-y-1 shadow-lg"
          style={{ borderColor: "#eae2d8" }}
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.16em",
              }}
              className={({ isActive }) =>
                `flex items-center justify-between py-3 border-b border-[#f3eee7] transition-colors ${
                  isActive ? "text-[#9D294D]" : "text-[#2F211B] hover:text-[#9D294D]"
                }`
              }
            >
              <span>{link.label}</span>
              {link.hasDropdown && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </NavLink>
          ))}

          <div className="pt-4 flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to={getAccountLink()}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 text-xs font-semibold text-[#4A3728] hover:text-[#9D294D]"
                >
                  <AccountIcon /> DASHBOARD ({user?.first_name || user?.role})
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="text-left text-xs font-semibold text-[#9D294D] uppercase tracking-wider"
                >
                  SIGN OUT
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 text-xs font-semibold text-[#4A3728] hover:text-[#9D294D]"
                >
                  <AccountIcon /> SIGN IN
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="text-xs font-semibold text-[#9D294D] uppercase tracking-wider"
                >
                  CREATE CUSTOMER ACCOUNT
                </Link>
                <Link
                  to="/seller/register"
                  onClick={() => setMenuOpen(false)}
                  className="text-xs font-semibold text-[#7A5C4A] uppercase tracking-wider"
                >
                  BECOME AN ARTISAN SELLER
                </Link>
              </>
            )}
            <Link
              to="/wishlist"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 text-xs font-semibold text-[#4A3728] hover:text-[#9D294D]"
            >
              <HeartIcon /> WISHLIST
            </Link>
            <div className="pt-1 border-t border-[#f3eee7]">
              <ThemeToggleButton showLabel={true} className="text-[#4A3728] px-0 py-1.5" />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
