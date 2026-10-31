import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Package, Plus, Tag, Trash2, AlertCircle, Sparkles } from 'lucide-react';

export function Products() {
  const { authFetch, isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // New Product Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Software');
  const [salesPrice, setSalesPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [variants, setVariants] = useState([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add Variant Form State
  const [varAttr, setVarAttr] = useState('Brand');
  const [varVal, setVarVal] = useState('');
  const [varExtraPrice, setVarExtraPrice] = useState('0');

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await authFetch('/api/products');
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      await authFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          type,
          sales_price: parseFloat(salesPrice),
          cost_price: parseFloat(costPrice) || 0,
          notes,
          variants
        })
      });
      setModalOpen(false);
      setName('');
      setSalesPrice('');
      setCostPrice('');
      setNotes('');
      setVariants([]);
      loadProducts();
    } catch (err) {
      setFormError(err.message || 'Failed to create product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVariantToProduct = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      await authFetch(`/api/products/${selectedProduct.id}/variants`, {
        method: 'POST',
        body: JSON.stringify({
          attribute: varAttr,
          value: varVal,
          extra_price: parseFloat(varExtraPrice) || 0
        })
      });
      setVariantModalOpen(false);
      setVarVal('');
      setVarExtraPrice('0');
      loadProducts();
    } catch (err) {
      alert(err.message || 'Failed to add variant');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-600" />
            <span>Products & Product Variants</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage software catalog items, add-on modules, and variant price adjustments.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {p.type}
                </span>
                <span className="font-mono font-bold text-lg text-slate-900">
                  ${Number(p.sales_price).toFixed(2)}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                {p.notes && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.notes}</p>}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>Cost: ${Number(p.cost_price).toFixed(2)}</span>
                <span>•</span>
                <span>Margin: {p.sales_price > 0 ? `${(((p.sales_price - p.cost_price) / p.sales_price) * 100).toFixed(0)}%` : '0%'}</span>
              </div>

              {/* Variants Section (PROD-2 & PROD-3) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Variants ({p.variants?.length || 0})
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedProduct(p);
                        setVariantModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-primary-600 hover:text-primary-700"
                    >
                      + Add Variant
                    </button>
                  )}
                </div>

                {p.variants && p.variants.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {p.variants.map((v) => (
                      <span
                        key={v.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          v.extra_price > 0
                            ? 'bg-primary-50 text-primary-700 border-primary-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span>{v.attribute}: {v.value}</span>
                        {v.extra_price > 0 && (
                          <span className="font-mono text-primary-800 font-bold bg-primary-100 px-1 py-0.2 rounded">
                            +${v.extra_price}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No variants configured (standard base pricing).</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal (PROD-1, PROD-2, PROD-3) */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Product" maxWidth="max-w-lg">
        <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Security Shield"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Software">Software</option>
                <option value="Add-on">Add-on</option>
                <option value="Service">Service / Support</option>
                <option value="Hardware">Hardware / Appliance</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Base Sales Price ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                placeholder="450.00"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="50.00"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Quick Variant Preset</label>
              <button
                type="button"
                onClick={() => {
                  setVariants([
                    { attribute: 'Brand', value: 'Odoo Enterprise', extra_price: 560 },
                    { attribute: 'Brand', value: 'Standard Edition', extra_price: 0 }
                  ]);
                }}
                className="w-full px-2 py-2 text-[11px] font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Add Odoo (+560) Preset
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes / Description</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal product specs or customer facing summary"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Variants list preview */}
          {variants.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-700 text-[11px]">Included Variants:</p>
              {variants.map((v, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span>{v.attribute}: {v.value}</span>
                  <span className="font-mono font-bold text-primary-700">+${v.extra_price}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm"
            >
              {submitting ? 'Saving...' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Variant to Existing Product Modal */}
      <Modal
        isOpen={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        title={`Add Variant to ${selectedProduct?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddVariantToProduct} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Attribute Type</label>
            <input
              type="text"
              required
              value={varAttr}
              onChange={(e) => setVarAttr(e.target.value)}
              placeholder="e.g. Brand, Tier, Cloud Region"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Variant Value</label>
            <input
              type="text"
              required
              value={varVal}
              onChange={(e) => setVarVal(e.target.value)}
              placeholder="e.g. Odoo Enterprise"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Price Adjustment ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={varExtraPrice}
              onChange={(e) => setVarExtraPrice(e.target.value)}
              placeholder="e.g. 560"
              className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Example: Entering 560 adds $560 to this product's line total when chosen.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setVariantModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              Add Variant
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
