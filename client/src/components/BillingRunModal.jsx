import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Zap, Calendar, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export function BillingRunModal({ isOpen, onClose, onCompleted }) {
  const { authFetch } = useAuth();
  const [simulationDate, setSimulationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Fetch preview when date changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError('');
      loadPreview(simulationDate);
    }
  }, [isOpen, simulationDate]);

  const loadPreview = async (date) => {
    try {
      const data = await authFetch(`/api/billing/preview?date=${date}`);
      setPreview(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRun = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authFetch('/api/billing/run', {
        method: 'POST',
        body: JSON.stringify({ simulationDate })
      });
      setResult(data);
      if (onCompleted) onCompleted();
    } catch (err) {
      setError(err.message || 'Billing run failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Automated Bulk Billing Engine" maxWidth="max-w-2xl">
      <div className="space-y-5">
        <p className="text-xs text-slate-500">
          Scan all active subscriptions across Brightloop. Any subscription where the next billing date is due on or before the selected date will be billed automatically.
        </p>

        {/* Date Selector */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-primary-600" />
            Billing Simulation / Run Cutoff Date
          </label>
          <div className="flex gap-3">
            <input
              type="date"
              value={simulationDate}
              onChange={(e) => setSimulationDate(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono bg-white"
            />
            <button
              type="button"
              onClick={() => {
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                setSimulationDate(nextMonth.toISOString().split('T')[0]);
              }}
              className="px-3 py-2 text-xs font-semibold text-primary-700 bg-primary-100/70 hover:bg-primary-200 rounded-lg transition-colors"
            >
              +1 Month
            </button>
          </div>
        </div>

        {/* Live Preview */}
        {preview && !result && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preview for {simulationDate}</span>
              <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                {preview.totalDue} Subscriptions Due
              </span>
            </div>

            {preview.totalDue === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                No active subscriptions currently due for renewal on or before {simulationDate}.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                {preview.dueSubscriptions.map((sub) => (
                  <div key={sub.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{sub.number}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="font-medium text-slate-700">{sub.customer_name}</span>
                      <span className="text-slate-400 ml-1">({sub.plan_name})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-slate-700">Due: {sub.next_billing_date}</span>
                      {sub.already_billed > 0 && (
                        <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold">Already Billed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2 border border-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Summary */}
        {result && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Billing Run Completed in {result.durationMs}ms</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center pt-2">
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
                <p className="text-[11px] text-slate-400 font-bold uppercase">Invoices Created</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{result.generatedCount}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
                <p className="text-[11px] text-slate-400 font-bold uppercase">Total Billed</p>
                <p className="text-xl font-bold text-slate-900 mt-1">${result.totalAmountBilled.toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
                <p className="text-[11px] text-slate-400 font-bold uppercase">Skipped (Idempotent)</p>
                <p className="text-xl font-bold text-slate-500 mt-1">{result.skippedCount}</p>
              </div>
            </div>
            {result.invoices && result.invoices.length > 0 && (
              <div className="mt-3 bg-white p-3 rounded-lg border border-emerald-100 text-xs">
                <p className="font-bold text-slate-700 mb-1">Generated Invoice References:</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.invoices.map((inv) => (
                    <span key={inv.invoiceId} className="font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                      {inv.invoiceNumber} (${Number(inv.total).toFixed(2)})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button
              type="button"
              disabled={loading || (preview && preview.totalDue === 0)}
              onClick={handleRun}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>{loading ? 'Processing Billing...' : 'Execute Billing Run Now'}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
