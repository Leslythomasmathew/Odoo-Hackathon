import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Plus, Trash2, Sparkles, AlertCircle } from 'lucide-react';

export function CreateSubscriptionModal({ isOpen, onClose, onCreated }) {
  const { authFetch } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [status, setStatus] = useState('draft'); // 'draft' or 'quotation'
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const [cData, pData, prData, tData, tplData] = await Promise.all([
        authFetch('/api/customers'),
        authFetch('/api/plans'),
        authFetch('/api/products'),
        authFetch('/api/taxes'),
        authFetch('/api/quotation-templates')
      ]);

      setCustomers(cData.customers || []);
      setPlans(pData.plans || []);
      setProducts(prData.products || []);
      setTaxes(tData.taxes || []);
      setTemplates(tplData.templates || []);

      if (cData.customers?.length > 0) setCustomerId(String(cData.customers[0].id));
      if (pData.plans?.length > 0) setPlanId(String(pData.plans[0].id));

      // Default lines: empty or 1 line
      if (prData.products?.length > 0) {
        const firstProd = prData.products[0];
        setLines([{
          product_id: firstProd.id,
          variant_id: '',
          quantity: 1,
          unit_price: firstProd.sales_price,
          tax_id: tData.taxes?.[0]?.id || ''
        }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // When a template is selected, pre-fill plan and lines (QT-1 & QT-2)
  const handleApplyTemplate = (templateId) => {
    const tpl = templates.find(t => String(t.id) === String(templateId));
    if (!tpl) return;

    setPlanId(String(tpl.plan_id));

    // Calculate expiry based on validity_days
    const exp = new Date();
    exp.setDate(exp.getDate() + (tpl.validity_days || 30));
    setExpiryDate(exp.toISOString().split('T')[0]);

    const newLines = (tpl.lines || []).map(tl => ({
      product_id: tl.product_id,
      variant_id: tl.variant_id || '',
      quantity: tl.quantity,
      unit_price: tl.unit_price,
      tax_id: taxes[0]?.id || ''
    }));

    if (newLines.length > 0) {
      setLines(newLines);
    }
  };

  const handleProductChange = (index, prodId) => {
    const prod = products.find(p => String(p.id) === String(prodId));
    const updated = [...lines];
    updated[index].product_id = Number(prodId);
    updated[index].variant_id = '';
    updated[index].unit_price = prod ? prod.sales_price : 0;
    setLines(updated);
  };

  // PROD-3: Variant extra price adjustment
  const handleVariantChange = (index, variantId) => {
    const updated = [...lines];
    updated[index].variant_id = variantId ? Number(variantId) : '';

    const prod = products.find(p => p.id === updated[index].product_id);
    let basePrice = prod ? prod.sales_price : 0;

    if (variantId && prod?.variants) {
      const v = prod.variants.find(item => String(item.id) === String(variantId));
      if (v) {
        basePrice += (v.extra_price || 0); // e.g. +560 for Odoo brand
      }
    }
    updated[index].unit_price = basePrice;
    setLines(updated);
  };

  const handleLineQtyChange = (index, qty) => {
    const updated = [...lines];
    updated[index].quantity = Math.max(1, Number(qty) || 1);
    setLines(updated);
  };

  const addLine = () => {
    if (products.length === 0) return;
    const first = products[0];
    setLines([...lines, {
      product_id: first.id,
      variant_id: '',
      quantity: 1,
      unit_price: first.sales_price,
      tax_id: taxes[0]?.id || ''
    }]);
  };

  const removeLine = (index) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authFetch('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(customerId),
          plan_id: Number(planId),
          start_date: startDate,
          expiry_date: expiryDate || null,
          payment_terms: paymentTerms,
          status,
          notes,
          lines
        })
      });

      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create subscription.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => String(p.id) === String(planId));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Subscription / Offer" maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Template Selector Banner (QT-1) */}
        {templates.length > 0 && (
          <div className="bg-primary-50/70 border border-primary-200/60 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-primary-900">Start from a Quotation Template</p>
                <p className="text-[11px] text-primary-700">Pre-fill plan and approved product packages instantly</p>
              </div>
            </div>
            <select
              onChange={(e) => handleApplyTemplate(e.target.value)}
              defaultValue=""
              className="text-xs px-2.5 py-1.5 bg-white border border-primary-300 rounded-lg text-slate-700 font-semibold focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>Choose template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.validity_days}d validity)
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Header Fields: Customer, Plan, Terms, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Customer *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `(${c.company})` : ''} - {c.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subscription Plan *</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - ${p.price}/{p.billing_period} (min qty: {p.min_quantity})
                </option>
              ))}
            </select>
            {selectedPlan && (
              <p className="text-[10px] text-slate-500 mt-1">
                Period: <span className="font-bold uppercase">{selectedPlan.billing_period}</span> •
                Min Qty: <span className="font-bold">{selectedPlan.min_quantity}</span> •
                Pausable: {selectedPlan.pausable ? 'Yes' : 'No'} •
                Auto-close: {selectedPlan.auto_close ? 'Yes' : 'No'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date (Optional)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Payment Terms</label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="Immediate">Immediate / Due on Receipt</option>
              <option value="Net 15">Net 15 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 60">Net 60 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="draft">Draft (Internal Preparation)</option>
              <option value="quotation">Quotation (Shared with customer)</option>
            </select>
          </div>
        </div>

        {/* Product Lines Section (SUB-3) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Subscription Product Lines</h4>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product Line
            </button>
          </div>

          <div className="space-y-2">
            {lines.map((line, idx) => {
              const prod = products.find(p => p.id === line.product_id);
              const availableVariants = prod?.variants || [];

              return (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center gap-3 text-xs">
                  {/* Product */}
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Product</label>
                    <select
                      value={line.product_id}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-medium"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${p.sales_price})</option>
                      ))}
                    </select>
                  </div>

                  {/* Variant (PROD-2 & PROD-3) */}
                  <div className="w-full md:w-44">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Variant / Brand</label>
                    <select
                      value={line.variant_id}
                      onChange={(e) => handleVariantChange(idx, e.target.value)}
                      disabled={availableVariants.length === 0}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-xs disabled:opacity-50"
                    >
                      <option value="">Standard (+$0)</option>
                      {availableVariants.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.value} {v.extra_price ? `(+$${v.extra_price})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="w-20">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => handleLineQtyChange(idx, e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-center font-mono text-xs"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="w-24">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) => {
                        const updated = [...lines];
                        updated[idx].unit_price = parseFloat(e.target.value) || 0;
                        setLines(updated);
                      }}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-right font-mono text-xs"
                    />
                  </div>

                  {/* Tax */}
                  <div className="w-32">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Tax</label>
                    <select
                      value={line.tax_id}
                      onChange={(e) => {
                        const updated = [...lines];
                        updated[idx].tax_id = e.target.value;
                        setLines(updated);
                      }}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    >
                      <option value="">No Tax (0%)</option>
                      {taxes.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Line Total */}
                  <div className="w-24 text-right">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Amount</label>
                    <p className="font-mono font-bold text-slate-800 py-1.5">
                      ${(line.quantity * line.unit_price).toFixed(2)}
                    </p>
                  </div>

                  {/* Delete button */}
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg md:mt-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm"
          >
            {loading ? 'Creating...' : status === 'quotation' ? 'Create & Prepare Quotation' : 'Save as Draft'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
