import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Tag, Plus, CheckCircle, AlertCircle, Percent, DollarSign, Calendar } from 'lucide-react';

export function Discounts() {
  const { authFetch, isAdmin } = useAuth();
  const [discounts, setDiscounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('percentage'); // 'percentage' or 'fixed'
  const [value, setValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('0');
  const [minQuantity, setMinQuantity] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [scope, setScope] = useState('whole_subscription');
  const [targetProductId, setTargetProductId] = useState('');
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [dData, prData] = await Promise.all([
        authFetch('/api/discounts'),
        authFetch('/api/products')
      ]);
      setDiscounts(dData.discounts || []);
      setProducts(prData.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      await authFetch('/api/discounts', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name,
          type,
          value: parseFloat(value),
          min_purchase: parseFloat(minPurchase) || 0,
          min_quantity: parseInt(minQuantity, 10) || 0,
          start_date: startDate || null,
          end_date: endDate || null,
          usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
          scope,
          target_product_id: scope === 'specific_products' && targetProductId ? Number(targetProductId) : null
        })
      });

      setModalOpen(false);
      setCode('');
      setName('');
      setValue('');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to create discount.');
    }
  };

  const getStatusBadge = (d) => {
    if (d.computed_status === 'expired') {
      return <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded text-[10px] font-bold">Expired</span>;
    }
    if (d.computed_status === 'limit_reached') {
      return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">Limit Reached</span>;
    }
    if (d.computed_status === 'disabled') {
      return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Disabled</span>;
    }
    return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">Active</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-purple-600" />
            <span>Discount Rules</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin-defined promotion rules automatically deducted from recurring invoices.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Discount Rule</span>
          </button>
        ) : (
          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
            Read Only (Admin restricted)
          </span>
        )}
      </div>

      {/* Discounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discounts.map((d) => (
          <div
            key={d.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="font-mono text-sm font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                  {d.code}
                </span>
                {getStatusBadge(d)}
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">{d.name}</h3>
                <p className="font-mono text-xl font-black text-slate-900 mt-1">
                  {d.type === 'percentage' ? `${d.value}% OFF` : `$${Number(d.value).toFixed(2)} OFF`}
                </p>
              </div>

              <div className="text-xs text-slate-500 space-y-1 py-2 border-y border-slate-100">
                <div className="flex justify-between">
                  <span>Scope:</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {d.scope === 'whole_subscription' ? 'Whole Subscription' : 'Specific Product'}
                  </span>
                </div>
                {d.min_purchase > 0 && (
                  <div className="flex justify-between">
                    <span>Min Purchase:</span>
                    <span className="font-mono text-slate-800">${d.min_purchase}</span>
                  </div>
                )}
                {d.min_quantity > 0 && (
                  <div className="flex justify-between">
                    <span>Min Quantity:</span>
                    <span className="font-bold text-slate-800">{d.min_quantity} seat(s)</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Usage Count:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {d.times_used} / {d.usage_limit || '∞'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Validity:</span>
                  <span className="font-mono text-slate-700">
                    {d.start_date || 'Always'} → {d.end_date || 'Ongoing'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal (DISC-1 to DISC-6) */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Discount Rule" maxWidth="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Discount Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. FLASH20"
                className="w-full px-3 py-2 font-mono font-bold uppercase border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rule Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Autumn Flash Sale 20%"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Type (DISC-2) *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Discount Value *</label>
              <input
                type="number"
                step="0.01"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === 'percentage' ? '15 for 15%' : '50.00 for $50'}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Conditions (DISC-3) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Min Purchase ($)</label>
              <input
                type="number"
                step="0.01"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Min Seats / Quantity</label>
              <input
                type="number"
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Scope (DISC-6) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Scope (DISC-6)</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="whole_subscription">Whole Subscription (Applies to invoice subtotal)</option>
              <option value="specific_products">Specific Product Only</option>
            </select>
          </div>

          {scope === 'specific_products' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Product</label>
              <select
                value={targetProductId}
                onChange={(e) => setTargetProductId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select target product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dates & Usage limit (DISC-4, DISC-5) */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-2 font-mono border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-2 font-mono border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Usage Limit</label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                className="w-full px-2 py-2 font-mono border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

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
              className="px-4 py-2 font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm"
            >
              Create Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
