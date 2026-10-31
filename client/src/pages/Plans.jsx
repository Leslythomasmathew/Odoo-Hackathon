import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Layers, Plus, Check, X, Calendar, AlertCircle } from 'lucide-react';

export function Plans() {
  const { authFetch, isAdmin } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [minQuantity, setMinQuantity] = useState(1);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [autoClose, setAutoClose] = useState(false);
  const [closable, setClosable] = useState(true);
  const [pausable, setPausable] = useState(true);
  const [renewable, setRenewable] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await authFetch('/api/plans');
      setPlans(data.plans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      await authFetch('/api/plans', {
        method: 'POST',
        body: JSON.stringify({
          name,
          price: parseFloat(price),
          billing_period: billingPeriod,
          min_quantity: parseInt(minQuantity, 10),
          available_from: availableFrom || null,
          available_to: availableTo || null,
          auto_close: autoClose,
          closable,
          pausable,
          renewable
        })
      });
      setModalOpen(false);
      setName('');
      setPrice('');
      loadPlans();
    } catch (err) {
      setFormError(err.message || 'Failed to create plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary-600" />
            <span>Subscription Plans</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure billing periods (daily, weekly, monthly, yearly), minimum quantities, and behavioral rules.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subscription Plan</span>
          </button>
        )}
      </div>

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                    {p.billing_period}
                  </span>
                  <h3 className="font-bold text-slate-900 text-lg mt-1">{p.name}</h3>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-2xl text-slate-900">
                    ${Number(p.price).toFixed(0)}
                  </span>
                  <span className="text-xs text-slate-400">/{p.billing_period}</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1.5 py-2 border-y border-slate-100">
                <div className="flex justify-between">
                  <span>Minimum Quantity:</span>
                  <span className="font-bold text-slate-800">{p.min_quantity} seat(s)</span>
                </div>
                <div className="flex justify-between">
                  <span>Availability Window:</span>
                  <span className="font-mono text-slate-700">
                    {p.available_from ? `${p.available_from} → ${p.available_to || '∞'}` : 'Always Active'}
                  </span>
                </div>
              </div>

              {/* Behavior Flags (PLAN-4) */}
              <div className="space-y-2 pt-1 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Configured Behavior</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className={`flex items-center gap-1.5 font-medium ${p.auto_close ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {p.auto_close ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5" />}
                    <span>Auto-close on end</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${p.closable ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {p.closable ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5" />}
                    <span>Closable early</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${p.pausable ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {p.pausable ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5" />}
                    <span>Pausable</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${p.renewable ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {p.renewable ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5" />}
                    <span>Renewable</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Plan Modal (PLAN-1 to PLAN-4) */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Subscription Plan" maxWidth="max-w-lg">
        <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Plan Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Growth Enterprise Monthly"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Billing Period (PLAN-1) *</label>
              <select
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white capitalize"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Base Price ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="299.00"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Minimum Quantity (PLAN-2) *</label>
            <input
              type="number"
              min="1"
              required
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
            />
          </div>

          {/* Availability Dates (PLAN-3) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Available From (PLAN-3)</label>
              <input
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Available To (PLAN-3)</label>
              <input
                type="date"
                value={availableTo}
                onChange={(e) => setAvailableTo(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Behavior Checkboxes (PLAN-4) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="font-bold text-slate-700">Plan Behavior Options (Decided per plan):</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoClose}
                  onChange={(e) => setAutoClose(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-slate-700">Auto-close when plan ends</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={closable}
                  onChange={(e) => setClosable(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-slate-700">Closable early</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pausable}
                  onChange={(e) => setPausable(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-slate-700">Pausable</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={renewable}
                  onChange={(e) => setRenewable(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-slate-700">Renewable</span>
              </label>
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
              disabled={submitting}
              className="px-4 py-2 font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm"
            >
              {submitting ? 'Saving...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
