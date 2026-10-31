import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Repeat, Package, Check, AlertCircle, RefreshCw, Zap } from 'lucide-react';

export function CustomerSubscribeModal({ isOpen, onClose, onSubscribed }) {
  const { authFetch, user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
    }
  }, [isOpen]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      setError('');
      const [plansData, productsData] = await Promise.all([
        authFetch('/api/plans'),
        authFetch('/api/products')
      ]);
      const availablePlans = plansData.plans || [];
      const availableProducts = productsData.products || [];
      setPlans(availablePlans);
      setProducts(availableProducts);

      if (availablePlans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(String(availablePlans[0].id));
      }
      if (availableProducts.length > 0 && !selectedProductId) {
        setSelectedProductId(String(availableProducts[0].id));
      }
    } catch (err) {
      setError(err.message || 'Failed to load catalog.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => String(p.id) === String(selectedPlanId));
  const selectedProduct = products.find(p => String(p.id) === String(selectedProductId));

  const unitPrice = selectedProduct ? selectedProduct.sales_price : (selectedPlan ? selectedPlan.price : 0);
  const totalPrice = unitPrice * Math.max(1, Number(quantity) || 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanId || !selectedProductId) {
      setError('Please select both a plan and a product.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await authFetch('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: Number(selectedPlanId),
          start_date: today,
          status: 'active',
          lines: [
            {
              product_id: Number(selectedProductId),
              quantity: Math.max(1, Number(quantity) || 1),
              unit_price: unitPrice
            }
          ]
        })
      });

      if (onSubscribed) onSubscribed(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to activate subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Subscribe to a Product & Plan"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
            <span>Loading product catalog...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Choose Plan */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800">1. Select Billing Plan</label>
              <div className="grid grid-cols-2 gap-2">
                {plans.map(p => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelectedPlanId(String(p.id))}
                    className={`p-3 rounded-xl border text-left transition ${
                      String(selectedPlanId) === String(p.id)
                        ? 'border-primary-600 bg-primary-50/50 ring-2 ring-primary-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-500 capitalize">{p.billing_period} billing</div>
                    <div className="font-mono font-bold text-primary-700 mt-1">${p.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Choose Product */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800">2. Select Product / Software</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 font-medium"
              >
                {products.map(pr => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name} • ${pr.sales_price} ({pr.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800">3. Seats / Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 font-mono"
              />
            </div>

            {/* Order Summary Box */}
            <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-xl border border-indigo-100 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subscription Summary</div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                <span>{selectedProduct?.name || 'Product'} × {quantity}</span>
                <span className="font-mono text-primary-700">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Billed {selectedPlan?.billing_period || 'monthly'}. Activates instantly with live confirmation sent to your email & mobile.
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting || loading || !selectedPlanId || !selectedProductId}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 fill-white" />
            )}
            <span>{submitting ? 'Activating...' : 'Confirm & Subscribe'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
