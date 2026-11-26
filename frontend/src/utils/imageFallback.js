/**
 * Shared neutral SVG craft placeholder and one-shot image error handler.
 * Prevents infinite onError retry loops when an external image URL fails or is blocked by ORB.
 */
export const CRAFT_FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#F5EFE6"/>
      <rect x="20" y="20" width="360" height="260" fill="none" stroke="#DFD3C3" stroke-width="1.5"/>
      <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#8B6F5E" font-family="Georgia, serif" font-size="16">BharatBazaar Artisan Craft</text>
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#A68B79" font-family="sans-serif" font-size="11">Image Unavailable</text>
    </svg>`
  );

export function handleImageError(e, fallback = CRAFT_FALLBACK_IMAGE) {
  const img = e?.currentTarget || e?.target;
  if (!img || img.dataset.fallbackApplied === '1') return;
  img.onerror = null;
  img.dataset.fallbackApplied = '1';
  img.src = fallback;
}
