import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { CreateSubscriptionModal } from '../components/CreateSubscriptionModal';
import { FileSpreadsheet, Plus, Clock, Sparkles, ArrowRight } from 'lucide-react';

export function QuotationTemplates() {
  const { authFetch, isAdmin, isStaff } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);

  // New Template Form
  const [name, setName] = useState('');
  const [planId, setPlanId] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tplData, pData, prData] = await Promise.all([
        authFetch('/api/quotation-templates'),
        authFetch('/api/plans'),
        authFetch('/api/products')
      ]);
      setTemplates(tplData.templates || []);
      setPlans(pData.plans || []);
      setProducts(prData.products || []);
      if (pData.plans?.length > 0) setPlanId(String(pData.plans[0].id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await authFetch('/api/quotation-templates', {
        method: 'POST',
        body: JSON.stringify({
          name,
          plan_id: Number(planId),
          validity_days: Number(validityDays),
          notes,
          lines
        })
      });
      setModalOpen(false);
      setName('');
      setNotes('');
      setLines([]);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create template');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-primary-600" />
            <span>Quotation Templates</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-assembled commercial packages with pre-filled plans, product lines, and expiration limits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Quote from Template</span>
          </button>
          <button
            onClick={() => {
              if (products.length > 0) {
                setLines([{ product_id: products[0].id, quantity: 1, unit_price: products[0].sales_price }]);
              }
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{tpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Valid for {tpl.validity_days} days from quotation</span>
                  </p>
                </div>
                <span className="text-xs font-bold bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full border border-primary-100">
                  {tpl.plan_name}
                </span>
              </div>

              {tpl.notes && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                  {tpl.notes}
                </p>
              )}

              {/* Pre-filled lines */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pre-Filled Product Lines</p>
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden text-xs">
                  {(tpl.lines || []).map((l, i) => (
                    <div key={i} className="p-2.5 flex justify-between items-center bg-white hover:bg-slate-50/50">
                      <div>
                        <span className="font-semibold text-slate-800">{l.product_name}</span>
                        {l.variant_value && (
                          <span className="text-[11px] text-primary-700 font-medium ml-1.5">
                            ({l.variant_value})
                          </span>
                        )}
                        <span className="text-slate-400 ml-1.5">× {l.quantity}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        ${(l.quantity * l.unit_price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSubModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700"
              >
                <span>Generate Quote with Template</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Template Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Quotation Template" maxWidth="max-w-xl">
        <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Template Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Team SaaS Pack"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Plan *</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.billing_period})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Validity (Days) *</label>
              <input
                type="number"
                min="1"
                required
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Internal Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Guidance for reps using this quotation template"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
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
              Save Template
            </button>
          </div>
        </form>
      </Modal>

      {/* Pre-fill Subscription Modal */}
      <CreateSubscriptionModal
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        onCreated={() => alert('Subscription quote prepared successfully!')}
      />
    </div>
  );
}
