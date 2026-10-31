import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Percent, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export function Taxes() {
  const { authFetch, isAdmin } = useAuth();
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [rate, setRate] = useState('');

  const loadTaxes = async () => {
    try {
      setLoading(true);
      const data = await authFetch('/api/taxes');
      setTaxes(data.taxes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxes();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await authFetch('/api/taxes', {
        method: 'POST',
        body: JSON.stringify({
          name,
          rate: parseFloat(rate),
          is_active: 1
        })
      });
      setModalOpen(false);
      setName('');
      setRate('');
      loadTaxes();
    } catch (err) {
      alert(err.message || 'Failed to create tax rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Percent className="w-6 h-6 text-primary-600" />
            <span>Tax Rules & Jurisdiction Rates</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin-configured tax rules automatically calculated during billing invoice generation.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tax Rule</span>
          </button>
        )}
      </div>

      {/* Tax Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {taxes.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex justify-between items-center"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tax Rule #{t.id}</span>
              <h3 className="font-bold text-slate-900 text-base mt-0.5">{t.name}</h3>
              <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active during billing runs
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-2xl text-slate-900">{t.rate}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Tax Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Tax Rule" maxWidth="max-w-md">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Rule Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard VAT (10%)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tax Rate Percentage (%) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 10.0"
              className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
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
              Save Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
