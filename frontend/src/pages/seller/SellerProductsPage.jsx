import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/useAuth';
import SellerLayout from '../../components/seller/SellerLayout';
import { sellerService } from '../../services/sellerService';
import { productService } from '../../services/productService';

const STATUS_BADGES = {
  APPROVED: { label: 'Approved', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  PENDING: { label: 'Pending Review', bg: 'bg-amber-100', text: 'text-amber-800' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800' },
  DRAFT: { label: 'Draft', bg: 'bg-stone-100', text: 'text-stone-700' },
  INACTIVE: { label: 'Inactive', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const EMPTY_FORM = {
  name: '',
  short_description: '',
  description: '',
  category_id: '',
  price: '',
  discount_price: '',
  available_stock: 1,
  sku: '',
  craft_type: '',
  origin_state: '',
  origin_city: '',
  tags: '',
  primary_image: '',
  gallery_images: [],
  materials: '',
  dimensions: '',
  care_instructions: '',
  shipping_info: 'Dispatched within 2-4 business days directly from the artisan workshop.',
  returns_info: '7-day replacement for transit damage or manufacturing defects.',
};

export default function SellerProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & sorting
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ordering, setOrdering] = useState('newest');

  // Create / Edit Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load Categories
  useEffect(() => {
    productService
      .getCategories()
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await sellerService.getProducts({
        search,
        category: categoryFilter,
        status: statusFilter,
        ordering,
      });
      setProducts(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load your product catalogue.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, ordering]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadProducts();
    });
    return () => {
      active = false;
    };
  }, [loadProducts]);

  const openCreateModal = () => {
    const profile = user?.seller_profile || {};
    setEditingProductId(null);
    setFormData({
      ...EMPTY_FORM,
      category_id: categories[0]?.id || '',
      craft_type: profile.craft_category || '',
      origin_state: profile.state || '',
      origin_city: profile.city || '',
    });
    setImageUrlInput('');
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (prod) => {
    const gallery = Array.isArray(prod.images) ? prod.images.map((i) => i.image_url) : [];
    if (prod.primary_image && !gallery.includes(prod.primary_image)) {
      gallery.unshift(prod.primary_image);
    }
    setEditingProductId(prod.id);
    setFormData({
      name: prod.name || '',
      short_description: prod.short_description || '',
      description: prod.description || '',
      category_id: prod.category?.id || '',
      price: prod.price || '',
      discount_price: prod.discount_price || '',
      available_stock: prod.available_stock ?? 1,
      sku: prod.sku || '',
      craft_type: prod.craft_type || '',
      origin_state: prod.origin_state || '',
      origin_city: prod.origin_city || '',
      tags: prod.tags || '',
      primary_image: prod.primary_image || gallery[0] || '',
      gallery_images: gallery,
      materials: prod.materials || '',
      dimensions: prod.dimensions || '',
      care_instructions: prod.care_instructions || '',
      shipping_info: prod.shipping_info || '',
      returns_info: prod.returns_info || '',
    });
    setImageUrlInput('');
    setFormError('');
    setShowFormModal(true);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImg(true);
    setFormError('');
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const res = await sellerService.uploadProductImage(file);
        if (res.image_url) uploadedUrls.push(res.image_url);
      }
      setFormData((prev) => {
        const nextGallery = [...prev.gallery_images, ...uploadedUrls];
        return {
          ...prev,
          primary_image: prev.primary_image || uploadedUrls[0] || '',
          gallery_images: nextGallery,
        };
      });
    } catch (err) {
      setFormError(err.message || 'Image upload failed. Please use a valid JPG/PNG/WEBP file under 5 MB.');
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/media/')) {
      setFormError('Image URL must begin with http://, https://, or /media/.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      primary_image: prev.primary_image || url,
      gallery_images: prev.gallery_images.includes(url) ? prev.gallery_images : [...prev.gallery_images, url],
    }));
    setImageUrlInput('');
    setFormError('');
  };

  const handleRemoveImage = (urlToRemove) => {
    setFormData((prev) => {
      const remaining = prev.gallery_images.filter((u) => u !== urlToRemove);
      return {
        ...prev,
        gallery_images: remaining,
        primary_image: prev.primary_image === urlToRemove ? (remaining[0] || '') : prev.primary_image,
      };
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.category_id) {
      setFormError('Please select a craft category.');
      return;
    }

    const payload = {
      ...formData,
      category_id: Number(formData.category_id),
      price: formData.price,
      discount_price: formData.discount_price ? formData.discount_price : null,
      available_stock: Number(formData.available_stock),
    };

    try {
      setSubmitting(true);
      if (editingProductId) {
        await sellerService.updateProduct(editingProductId, payload);
        setSuccessMsg('Product updated successfully.');
      } else {
        await sellerService.createProduct(payload);
        setSuccessMsg('Product submitted! It is now Pending Review before appearing on the public marketplace.');
      }
      setShowFormModal(false);
      await loadProducts();
    } catch (err) {
      setFormError(err.message || 'Failed to save product. Please check all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await sellerService.deleteProduct(deleteTarget.id);
      setSuccessMsg(`"${deleteTarget.name}" removed from your catalog.`);
      setDeleteTarget(null);
      await loadProducts();
    } catch (err) {
      setError(err.message || 'Failed to delete product.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SellerLayout
      title="Product Catalogue"
      subtitle="Add, edit, and manage your handcrafted listings. Newly created items undergo curatorial review before going live."
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-sm border border-[#E8DED2]">
          <div className="text-xs text-[#7A5C4A]">
            Showing <strong className="text-[#2C2C2C]">{products.length}</strong> studio listings
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-white cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: '#C0522B' }}
          >
            + Add New Product
          </button>
        </div>

        {/* Success & Error Alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg('')} className="font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-sm border border-[#E8DED2]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or craft..."
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[#C0522B]"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[#C0522B]"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[#C0522B]"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending Review</option>
            <option value="REJECTED">Rejected</option>
            <option value="DRAFT">Draft</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[#C0522B]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        {/* Product Table / Grid */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <div className="w-7 h-7 border-2 border-[#C0522B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#7A5C4A]">Loading your studio listings...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#FFF8F0', border: '1px solid #E8DED2' }}
            >
              <span className="text-2xl">🏺</span>
            </div>
            <h3
              className="text-base font-bold text-[#2C2C2C]"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              No Handcrafted Products Found
            </h3>
            <p className="text-xs text-[#7A5C4A] mt-1 max-w-md mx-auto">
              {search || categoryFilter !== 'all' || statusFilter !== 'ALL'
                ? 'No listings match your current search or filter criteria.'
                : 'Start building your BharatBazaar storefront by adding your first handcrafted article.'}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 px-5 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-white cursor-pointer"
              style={{ background: '#C0522B' }}
            >
              + Add Your First Product
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-sm border border-[#E8DED2] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F0EBE3] bg-[#FAF7F2] text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3] text-xs">
                {products.map((prod) => {
                  const badge = STATUS_BADGES[prod.approval_status] || STATUS_BADGES.PENDING;
                  const thumb = prod.primary_image || prod.images?.[0]?.image_url;
                  return (
                    <tr key={prod.id} className="hover:bg-[#FDFBF9]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-sm bg-[#FAF7F2] border border-[#E8DED2] overflow-hidden shrink-0 flex items-center justify-center">
                            {thumb ? (
                              <img src={thumb} alt={prod.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-[#8C7665]">No Img</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#2C2C2C] line-clamp-1">{prod.name}</p>
                            <p className="text-[11px] text-[#7A5C4A] font-mono">SKU: {prod.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#4A3728]">{prod.category?.name || '—'}</td>
                      <td className="py-3 px-4">
                        {prod.discount_price ? (
                          <div>
                            <span className="font-bold text-[#C0522B]">
                              ₹{Number(prod.discount_price).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-[#8C7665] line-through block">
                              ₹{Number(prod.price).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-[#2C2C2C]">
                            ₹{Number(prod.price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            prod.available_stock === 0 ? 'text-red-600' : 'text-[#2C2C2C]'
                          }`}
                        >
                          {prod.available_stock}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(prod)}
                          className="font-semibold text-[#C0522B] hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(prod)}
                          className="font-semibold text-red-600 hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Create / Edit Product Modal ───────────────────────────── */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-3xl w-full p-6 rounded-sm border border-[#D6CCC2] shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0EBE3]">
              <h3
                className="text-lg font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                {editingProductId ? 'Edit Handcrafted Listing' : 'Add New Handcrafted Product'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-[#7A5C4A] hover:text-[#2C2C2C] text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                    placeholder="e.g. Jaipur Hand-painted Blue Pottery Vase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Craft Category *
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Short Summary (for catalogue cards)
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  placeholder="One-sentence highlight of this piece..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Full Craft Story & Description *
                </label>
                <textarea
                  rows="3"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  placeholder="Describe the artisan technique, heritage motifs, and usage..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Original Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Offer Price (₹, Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.discount_price}
                    onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Available Stock *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.available_stock}
                    onChange={(e) => setFormData({ ...formData, available_stock: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    SKU (Auto if blank)
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                    placeholder="BB-ART-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Craft Tradition *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.craft_type}
                    onChange={(e) => setFormData({ ...formData, craft_type: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                    placeholder="e.g. Blue Pottery"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Origin City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.origin_city}
                    onChange={(e) => setFormData({ ...formData, origin_city: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Origin State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.origin_state}
                    onChange={(e) => setFormData({ ...formData, origin_state: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Materials Used
                  </label>
                  <input
                    type="text"
                    value={formData.materials}
                    onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                    placeholder="e.g. Quartz Powder, Natural Cobalt"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Dimensions / Sizing
                  </label>
                  <input
                    type="text"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                    placeholder='e.g. 10" H × 5" W'
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Shipping Information
                  </label>
                  <input
                    type="text"
                    value={formData.shipping_info}
                    onChange={(e) => setFormData({ ...formData, shipping_info: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Return Policy
                  </label>
                  <input
                    type="text"
                    value={formData.returns_info}
                    onChange={(e) => setFormData({ ...formData, returns_info: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Discovery Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  placeholder="handmade, pottery, home decor, rajasthan"
                />
              </div>

              {/* Product Images Section */}
              <div className="p-4 rounded-sm bg-[#FAF7F2] border border-[#E8DED2] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#2C2C2C]">
                    Product Photographs (Upload JPG/PNG/WEBP or paste Image URL)
                  </label>
                  <label className="px-3 py-1.5 rounded-sm text-[11px] font-semibold text-white bg-[#2C2C2C] hover:opacity-90 cursor-pointer">
                    {uploadingImg ? 'Uploading...' : '+ Upload Image File'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={uploadingImg}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Or paste image URL (https://...)"
                    className="flex-1 px-3 py-1.5 border border-[#D6CCC2] rounded-sm text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-1.5 border border-[#D6CCC2] bg-white text-xs font-semibold text-[#2C2C2C] rounded-sm cursor-pointer hover:bg-[#F0EBE3]"
                  >
                    Add URL
                  </button>
                </div>

                {formData.gallery_images.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {formData.gallery_images.map((url, idx) => {
                      const isPrimary = formData.primary_image === url;
                      return (
                        <div
                          key={idx}
                          className={`relative w-20 h-20 rounded-sm overflow-hidden border-2 ${
                            isPrimary ? 'border-[#C0522B]' : 'border-[#D6CCC2]'
                          }`}
                        >
                          <img src={url} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, primary_image: url })}
                            className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[9px] py-0.5 text-center cursor-pointer"
                          >
                            {isPrimary ? 'Primary' : 'Set Main'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(url)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 text-white text-[9px] rounded-full flex items-center justify-center cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0EBE3]">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-[#4A3728] hover:bg-[#FAF7F2] rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white rounded-sm cursor-pointer disabled:opacity-50"
                  style={{ background: '#C0522B' }}
                >
                  {submitting
                    ? 'Saving...'
                    : editingProductId
                    ? 'Update Listing'
                    : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#D6CCC2] shadow-xl">
            <h3
              className="text-base font-bold text-[#2C2C2C] mb-2"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              Delete "{deleteTarget.name}"?
            </h3>
            <p className="text-xs text-[#7A5C4A] mb-4 leading-relaxed">
              This will permanently remove this product listing from your artisan studio catalog.
              Historical customer order snapshots will remain intact.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0EBE3]">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-[#4A3728] hover:bg-[#FAF7F2] rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-sm cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}
