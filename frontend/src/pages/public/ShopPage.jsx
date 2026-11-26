import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import AnnouncementBar from '../../components/layout/AnnouncementBar';
import Footer from '../../components/layout/Footer';
import ProductCard from '../../components/common/ProductCard';
import { productService } from '../../services/productService';
import { customerService } from '../../services/customerService';
import { useAuth } from '../../context/useAuth';
import { featuredProducts as demoProducts } from '../../data/products';
import { categories as fallbackCategories } from '../../data/categories';

const INDIAN_STATES = [
  'Rajasthan',
  'Gujarat',
  'Kashmir',
  'Uttar Pradesh',
  'Punjab',
  'Bihar',
  'West Bengal',
  'Karnataka',
  'Tamil Nadu',
  'Odisha',
  'Assam',
  'Madhya Pradesh',
  'Maharashtra',
];

const PRICE_TIERS = [
  { id: 'all', label: 'All Prices', min: null, max: null },
  { id: 'under-1000', label: 'Under ₹1,000', min: null, max: 1000 },
  { id: '1000-2500', label: '₹1,000 to ₹2,500', min: 1000, max: 2500 },
  { id: '2500-5000', label: '₹2,500 to ₹5,000', min: 2500, max: 5000 },
  { id: 'above-5000', label: 'Above ₹5,000', min: 5000, max: null },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest Arrivals' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State from URL or defaults
  const currentCategory = searchParams.get('category') || 'all';
  const currentState = searchParams.get('state') || searchParams.get('region') || 'all';
  const currentSeller = searchParams.get('seller') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('ordering') || '-created_at';
  const currentPriceTier = searchParams.get('tier') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Local filter states
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [categories, setCategories] = useState(fallbackCategories);
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUsingDemoFallback, setIsUsingDemoFallback] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistNotice, setWishlistNotice] = useState('');
  const [wishlistPendingIds, setWishlistPendingIds] = useState([]);

  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch authenticated customer's persisted wishlist IDs
  useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated || user?.role !== 'CUSTOMER') {
      return undefined;
    }
    customerService
      .getWishlistIds()
      .then((ids) => {
        if (isMounted && Array.isArray(ids)) {
          setWishlist(ids);
        }
      })
      .catch(() => {
        // Non-blocking: heart buttons remain interactive
      });
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.role]);

  // Persistent wishlist toggle
  const toggleWishlist = async (id) => {
    setWishlistNotice('');

    if (String(id).startsWith('demo-') || Number.isNaN(Number(id))) {
      setWishlistNotice('Showcase preview items cannot be saved to wishlist.');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    if (user?.role !== 'CUSTOMER') {
      setWishlistNotice('Wishlist is available for customer accounts only.');
      return;
    }

    if (wishlistPendingIds.includes(id)) return;

    const currentlySaved = wishlist.includes(id);
    try {
      setWishlistPendingIds((prev) => [...prev, id]);
      if (currentlySaved) {
        await customerService.removeFromWishlist(id);
        setWishlist((prev) => prev.filter((item) => item !== id));
      } else {
        await customerService.addToWishlist(id);
        setWishlist((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }
    } catch (err) {
      setWishlistNotice(err.message || 'Could not update wishlist. Please try again.');
    } finally {
      setWishlistPendingIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Sync search input if query param changes
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setSearchInput(currentSearch);
    });
    return () => {
      active = false;
    };
  }, [currentSearch]);

  // Load Categories from API
  useEffect(() => {
    let isMounted = true;
    productService
      .getCategories()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch(() => {
        // Fallback to initial categories
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Update query params helper
  const updateQuery = useCallback(
    (updates) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '' || val === 'all') {
          newParams.delete(key);
        } else {
          newParams.set(key, val);
        }
      });
      // Reset to page 1 unless updating page itself
      if (!('page' in updates)) {
        newParams.delete('page');
      }
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  // Helper to filter & sort demonstration showcase when no approved DB products exist
  const getFilteredDemoProducts = useCallback(() => {
    const activeTier = PRICE_TIERS.find((t) => t.id === currentPriceTier);
    let filtered = [...demoProducts];

    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.craft && p.craft.toLowerCase().includes(q)) ||
          (p.region && p.region.toLowerCase().includes(q))
      );
    }
    if (currentCategory && currentCategory !== 'all') {
      const cat = currentCategory.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.category?.slug?.toLowerCase() === cat ||
          p.category?.name?.toLowerCase().includes(cat) ||
          (p.craft && p.craft.toLowerCase().includes(cat))
      );
    }
    if (currentState && currentState !== 'all') {
      const st = currentState.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.origin_state && p.origin_state.toLowerCase() === st) ||
          (p.region && p.region.toLowerCase().includes(st))
      );
    }
    if (activeTier && (activeTier.min !== null || activeTier.max !== null)) {
      filtered = filtered.filter((p) => {
        const effectivePrice = p.discount_price || p.price;
        if (activeTier.min !== null && effectivePrice < activeTier.min) return false;
        if (activeTier.max !== null && effectivePrice > activeTier.max) return false;
        return true;
      });
    }

    if (currentSort === 'price') {
      filtered.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
    } else if (currentSort === '-price') {
      filtered.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
    }
    return filtered;
  }, [currentSearch, currentCategory, currentState, currentPriceTier, currentSort]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const activeTier = PRICE_TIERS.find((t) => t.id === currentPriceTier);
    const hasActiveFilters =
      Boolean(currentSearch) ||
      Boolean(currentSeller) ||
      currentCategory !== 'all' ||
      currentState !== 'all' ||
      currentPriceTier !== 'all';

    try {
      const data = await productService.getProducts({
        search: currentSearch,
        category: currentCategory,
        state: currentState,
        seller: currentSeller,
        min_price: activeTier?.min,
        max_price: activeTier?.max,
        ordering: currentSort,
        page: currentPage,
      });

      if (data && Array.isArray(data.results)) {
        if (data.count === 0 && !hasActiveFilters) {
          // Only show demonstration showcase when the DB has 0 approved products and no filters are applied
          const demoFiltered = getFilteredDemoProducts();
          setProducts(demoFiltered);
          setTotalCount(demoFiltered.length);
          setTotalPages(1);
          setIsUsingDemoFallback(true);
        } else {
          setProducts(data.results);
          setTotalCount(data.count);
          setTotalPages(Math.max(1, Math.ceil(data.count / 12)));
          setIsUsingDemoFallback(false);
        }
      } else {
        const demoFiltered = getFilteredDemoProducts();
        setProducts(demoFiltered);
        setTotalCount(demoFiltered.length);
        setTotalPages(1);
        setIsUsingDemoFallback(true);
      }
    } catch (err) {
      console.warn('API error fetching catalogue:', err);
      const demoFiltered = getFilteredDemoProducts();
      setProducts(demoFiltered);
      setTotalCount(demoFiltered.length);
      setTotalPages(1);
      setIsUsingDemoFallback(true);
      if (err.message && !err.message.includes('404')) {
        setError('Could not connect to live catalogue server. Showing curated demonstration showcase.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentSearch, currentSeller, currentCategory, currentState, currentPriceTier, currentSort, currentPage, getFilteredDemoProducts]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchProducts();
    });
    return () => {
      active = false;
    };
  }, [fetchProducts]);

  // Handle live search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateQuery({ search: searchInput.trim() });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    updateQuery({ search: '' });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (currentCategory !== 'all') count++;
    if (currentState !== 'all') count++;
    if (currentPriceTier !== 'all') count++;
    if (currentSearch) count++;
    return count;
  }, [currentCategory, currentState, currentPriceTier, currentSearch]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF8F5' }}>
      <AnnouncementBar />
      <Navbar />

      {/* ─── Breadcrumb & Header ────────────────────────────────────── */}
      <div
        style={{
          borderBottom: '1px solid #EBE4DA',
          background: '#FFFFFF',
        }}
        className="px-5 sm:px-8 lg:px-14 py-8"
      >
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <nav
            className="flex items-center gap-2 text-xs mb-3"
            style={{ color: 'var(--brown-light)', fontFamily: 'var(--font-sans)' }}
          >
            <Link to="/" className="hover:text-[var(--burgundy)] transition-colors">
              Home
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--burgundy)', fontWeight: '600' }}>Shop Catalogue</span>
          </nav>

          {wishlistNotice && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-sm text-xs flex items-center justify-between">
              <span>{wishlistNotice}</span>
              <button
                type="button"
                onClick={() => setWishlistNotice('')}
                className="font-bold ml-3 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '0.15em',
                  color: 'var(--burgundy)',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                Direct from Indian Artisans
              </p>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  color: 'var(--brown-dark)',
                  fontSize: 'clamp(28px, 4vw, 38px)',
                  fontWeight: '600',
                  lineHeight: '1.2',
                }}
              >
                Marketplace Catalogue
              </h1>
            </div>

            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                color: 'var(--brown-mid)',
              }}
            >
              Showing <span className="font-semibold text-[var(--brown-dark)]">{products.length}</span> of{' '}
              <span className="font-semibold text-[var(--brown-dark)]">{totalCount}</span> handcrafted items
            </p>
          </div>

          {/* Fallback Banner if DB is empty */}
          {isUsingDemoFallback && (
            <div
              className="mt-4 px-4 py-2.5 rounded text-xs flex items-center justify-between"
              style={{
                background: '#FFF8F0',
                border: '1px solid #F3D9B1',
                color: '#8A5812',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span>
                <strong>Showcase Mode:</strong> Displaying curated demonstration artisan goods while seller products undergo approval.
              </span>
              <button
                onClick={fetchProducts}
                className="underline hover:opacity-80 font-semibold cursor-pointer ml-4"
              >
                Refresh
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              className="mt-4 px-4 py-2.5 rounded text-xs flex items-center justify-between"
              style={{
                background: '#FFF1F2',
                border: '1px solid #FECDD3',
                color: '#9F1239',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span>{error}</span>
              <button
                onClick={fetchProducts}
                className="underline font-semibold cursor-pointer ml-4"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Search & Category Pill Row ─────────────────────────────── */}
      <div
        style={{
          borderBottom: '1px solid #EBE4DA',
          background: '#FAF8F5',
        }}
        className="px-5 sm:px-8 lg:px-14 py-4"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 max-w-md flex items-center"
          >
            <input
              id="shop-search-input"
              name="search"
              type="text"
              aria-label="Search products by craft, item name, or region"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by craft, item name, or region..."
              style={{
                background: '#FFFFFF',
                border: '1px solid #D6CCC2',
                color: 'var(--brown-dark)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
              }}
              className="w-full pl-9 pr-9 py-2.5 rounded-sm focus:outline-none focus:border-[var(--burgundy)]"
            />
            {/* Search Icon */}
            <svg
              className="absolute left-3 w-4 h-4 pointer-events-none"
              style={{ color: '#8C7B70' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {/* Clear Button */}
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-3 text-xs text-[#8C7B70] hover:text-[var(--brown-dark)]"
              >
                ✕
              </button>
            )}
          </form>

          {/* Mobile Filter & Sort Controls */}
          <div className="flex items-center gap-3 justify-between md:justify-end">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-sm cursor-pointer"
              style={{
                background: '#FFFFFF',
                border: '1px solid #D6CCC2',
                color: 'var(--brown-dark)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>

            {/* Sort Select */}
            <div className="flex items-center gap-2 text-xs" style={{ fontFamily: 'var(--font-sans)' }}>
              <label htmlFor="shop-sort-select" className="hidden sm:inline text-[var(--brown-mid)]">Sort by:</label>
              <select
                id="shop-sort-select"
                name="ordering"
                aria-label="Sort products"
                value={currentSort}
                onChange={(e) => updateQuery({ ordering: e.target.value })}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D6CCC2',
                  color: 'var(--brown-dark)',
                  fontSize: '12px',
                }}
                className="px-3 py-2 rounded-sm focus:outline-none focus:border-[var(--burgundy)] cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Category Chips Bar */}
        <div className="max-w-7xl mx-auto mt-4 overflow-x-auto no-scrollbar flex items-center gap-2 pb-1">
          <button
            onClick={() => updateQuery({ category: 'all' })}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
            style={{
              background: currentCategory === 'all' ? 'var(--burgundy)' : '#FFFFFF',
              color: currentCategory === 'all' ? '#FFFFFF' : 'var(--brown-dark)',
              border: `1px solid ${currentCategory === 'all' ? 'var(--burgundy)' : '#D6CCC2'}`,
              fontFamily: 'var(--font-sans)',
            }}
          >
            All Crafts
          </button>
          {categories.map((cat) => {
            const isSelected = currentCategory === cat.slug;
            return (
              <button
                key={cat.id || cat.slug}
                onClick={() => updateQuery({ category: cat.slug })}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
                style={{
                  background: isSelected ? 'var(--burgundy)' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : 'var(--brown-dark)',
                  border: `1px solid ${isSelected ? 'var(--burgundy)' : '#D6CCC2'}`,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Main Shop Content Area ─────────────────────────────────── */}
      <main className="flex-1 px-5 sm:px-8 lg:px-14 py-8">
        <div className="max-w-7xl mx-auto flex gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div
              className="p-5 rounded-sm"
              style={{
                background: '#FFFFFF',
                border: '1px solid #EBE4DA',
              }}
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EBE4DA]">
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--brown-dark)',
                    fontSize: '16px',
                    fontWeight: '600',
                  }}
                >
                  Refine Search
                </h2>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-[var(--burgundy)] hover:underline font-medium cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Filter: Categories */}
              <div className="mb-6">
                <h3
                  className="text-xs font-bold uppercase tracking-wider mb-2.5"
                  style={{ color: 'var(--brown-dark)', fontFamily: 'var(--font-sans)' }}
                >
                  Craft Category
                </h3>
                <div className="space-y-1.5 text-xs" style={{ fontFamily: 'var(--font-sans)' }}>
                  <label className="flex items-center gap-2 cursor-pointer text-[var(--brown-mid)] hover:text-[var(--brown-dark)]">
                    <input
                      type="radio"
                      name="sidebar-category"
                      checked={currentCategory === 'all'}
                      onChange={() => updateQuery({ category: 'all' })}
                      className="accent-[var(--burgundy)]"
                    />
                    <span>All Categories</span>
                  </label>
                  {categories.map((cat) => (
                    <label
                      key={cat.id || cat.slug}
                      className="flex items-center gap-2 cursor-pointer text-[var(--brown-mid)] hover:text-[var(--brown-dark)]"
                    >
                      <input
                        type="radio"
                        name="sidebar-category"
                        checked={currentCategory === cat.slug}
                        onChange={() => updateQuery({ category: cat.slug })}
                        className="accent-[var(--burgundy)]"
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filter: State of Origin */}
              <div className="mb-6">
                <label
                  htmlFor="shop-sidebar-state"
                  className="block text-xs font-bold uppercase tracking-wider mb-2.5"
                  style={{ color: 'var(--brown-dark)', fontFamily: 'var(--font-sans)' }}
                >
                  State of Origin
                </label>
                <select
                  id="shop-sidebar-state"
                  name="state"
                  value={currentState}
                  onChange={(e) => updateQuery({ state: e.target.value })}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #D6CCC2',
                    color: 'var(--brown-dark)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '12px',
                  }}
                  className="w-full px-3 py-2 rounded-sm focus:outline-none focus:border-[var(--burgundy)] cursor-pointer"
                >
                  <option value="all">All States</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter: Price Range */}
              <div className="mb-6">
                <h3
                  className="text-xs font-bold uppercase tracking-wider mb-2.5"
                  style={{ color: 'var(--brown-dark)', fontFamily: 'var(--font-sans)' }}
                >
                  Price Range
                </h3>
                <div className="space-y-1.5 text-xs" style={{ fontFamily: 'var(--font-sans)' }}>
                  {PRICE_TIERS.map((tier) => (
                    <label
                      key={tier.id}
                      className="flex items-center gap-2 cursor-pointer text-[var(--brown-mid)] hover:text-[var(--brown-dark)]"
                    >
                      <input
                        type="radio"
                        name="sidebar-price"
                        checked={currentPriceTier === tier.id}
                        onChange={() => updateQuery({ tier: tier.id })}
                        className="accent-[var(--burgundy)]"
                      />
                      <span>{tier.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid / Results */}
          <div className="flex-1">
            {/* Loading Skeleton */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div
                    key={idx}
                    className="animate-pulse flex flex-col p-4 bg-white rounded-sm border border-[#EBE4DA]"
                  >
                    <div className="w-full bg-[#EAE2D8] rounded-sm mb-4" style={{ aspectRatio: '4/3' }} />
                    <div className="h-3 bg-[#EAE2D8] rounded w-1/3 mb-2" />
                    <div className="h-5 bg-[#EAE2D8] rounded w-3/4 mb-3" />
                    <div className="h-3 bg-[#EAE2D8] rounded w-1/2 mb-4" />
                    <div className="h-6 bg-[#EAE2D8] rounded w-1/4 mt-auto mb-3" />
                    <div className="h-9 bg-[#EAE2D8] rounded w-full" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              /* Empty Search State */
              <div
                className="p-12 text-center rounded-sm border border-[#EBE4DA] bg-white my-4"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-[#FAF4ED] text-[var(--burgundy)]">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--brown-dark)',
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '8px',
                  }}
                >
                  No Artisan Products Found
                </h3>
                <p className="text-xs text-[var(--brown-mid)] max-w-md mx-auto mb-6">
                  We couldn't find any crafts matching your current filters. Try searching with a broader term or reset your filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="btn-primary text-xs py-2.5 px-6"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              /* Product Grid */
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id || product.slug}
                      product={product}
                      isWishlisted={wishlist.includes(product.id)}
                      onWishlistToggle={toggleWishlist}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => updateQuery({ page: currentPage - 1 })}
                      className="px-3.5 py-2 text-xs font-medium rounded-sm border border-[#D6CCC2] bg-white text-[var(--brown-dark)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[var(--burgundy)] cursor-pointer"
                    >
                      ← Previous
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      const isActive = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => updateQuery({ page: pageNum })}
                          className="w-8 h-8 text-xs font-semibold rounded-sm transition-colors cursor-pointer"
                          style={{
                            background: isActive ? 'var(--burgundy)' : '#FFFFFF',
                            color: isActive ? '#FFFFFF' : 'var(--brown-dark)',
                            border: `1px solid ${isActive ? 'var(--burgundy)' : '#D6CCC2'}`,
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => updateQuery({ page: currentPage + 1 })}
                      className="px-3.5 py-2 text-xs font-medium rounded-sm border border-[#D6CCC2] bg-white text-[var(--brown-dark)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[var(--burgundy)] cursor-pointer"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── Mobile Slide-out Filter Drawer ─────────────────────────── */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setMobileFilterOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div
            className="relative ml-auto w-4/5 max-w-sm h-full bg-white shadow-xl flex flex-col p-6 overflow-y-auto"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EBE4DA] mb-4">
              <h3 className="font-serif text-lg font-semibold text-[var(--brown-dark)]">
                Filters
              </h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="text-lg p-1 text-[#8C7B70] hover:text-[var(--brown-dark)]"
              >
                ✕
              </button>
            </div>

            {/* Mobile Categories */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--brown-dark)]">
                Craft Category
              </h4>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mobile-category"
                    checked={currentCategory === 'all'}
                    onChange={() => {
                      updateQuery({ category: 'all' });
                      setMobileFilterOpen(false);
                    }}
                    className="accent-[var(--burgundy)]"
                  />
                  <span>All Categories</span>
                </label>
                {categories.map((cat) => (
                  <label key={cat.id || cat.slug} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mobile-category"
                      checked={currentCategory === cat.slug}
                      onChange={() => {
                        updateQuery({ category: cat.slug });
                        setMobileFilterOpen(false);
                      }}
                      className="accent-[var(--burgundy)]"
                    />
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mobile State */}
            <div className="mb-6">
              <label htmlFor="shop-mobile-state" className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--brown-dark)]">
                State of Origin
              </label>
              <select
                id="shop-mobile-state"
                name="mobile_state"
                value={currentState}
                onChange={(e) => {
                  updateQuery({ state: e.target.value });
                  setMobileFilterOpen(false);
                }}
                className="w-full text-xs p-2 border border-[#D6CCC2] rounded-sm"
              >
                <option value="all">All States</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Price */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--brown-dark)]">
                Price Range
              </h4>
              <div className="space-y-2 text-xs">
                {PRICE_TIERS.map((tier) => (
                  <label key={tier.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mobile-price"
                      checked={currentPriceTier === tier.id}
                      onChange={() => {
                        updateQuery({ tier: tier.id });
                        setMobileFilterOpen(false);
                      }}
                      className="accent-[var(--burgundy)]"
                    />
                    <span>{tier.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-[#EBE4DA] flex gap-3">
              <button
                onClick={() => {
                  handleResetFilters();
                  setMobileFilterOpen(false);
                }}
                className="flex-1 py-2 text-xs font-medium border border-[#D6CCC2] text-[var(--brown-dark)] rounded-sm"
              >
                Clear All
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-2 text-xs font-medium bg-[var(--burgundy)] text-white rounded-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
