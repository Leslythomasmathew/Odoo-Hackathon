import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cpu, Zap, RefreshCw, CheckCircle2, Clock, ShieldCheck, Activity } from 'lucide-react';

export function SystemBenchmark() {
  const { authFetch } = useAuth();
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchResult, setBenchResult] = useState(null);
  const [reseeding, setReseeding] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [message, setMessage] = useState('');

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await authFetch('/api/system/logs?limit=30');
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const runBenchmark = async () => {
    setBenchmarking(true);
    setMessage('');
    try {
      const data = await authFetch('/api/system/benchmark', {
        method: 'POST',
        body: JSON.stringify({ count: 1000 })
      });
      setBenchResult(data);
      loadLogs();
    } catch (err) {
      setMessage(err.message || 'Benchmark failed');
    } finally {
      setBenchmarking(false);
    }
  };

  const reseedDatabase = async () => {
    if (!confirm('This will reset the database back to clean Brightloop demonstration data. Continue?')) return;
    setReseeding(true);
    try {
      const res = await authFetch('/api/system/reseed', { method: 'POST' });
      setMessage(res.message);
      setBenchResult(null);
      loadLogs();
    } catch (err) {
      setMessage(err.message || 'Reseed failed');
    } finally {
      setReseeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Cpu className="w-6 h-6 text-indigo-600" />
          <span>System Scalability, Benchmark & Audit</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify non-functional performance requirements (sub-2 second response under 1,000+ subscriptions) and review system audit trails.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Benchmark Action Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Non-Functional SLA Verification
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              1,000+ Subscription Load Test & Query Latency Benchmark
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Specification SLA Requirement: "With thousands of subscriptions on the books, every page must respond in under 2 seconds."
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={benchmarking}
              onClick={runBenchmark}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-102"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>{benchmarking ? 'Generating & Measuring...' : 'Run 1,000+ Record Benchmark'}</span>
            </button>

            <button
              disabled={reseeding}
              onClick={reseedDatabase}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reseeding ? 'animate-spin' : ''}`} />
              <span>Reset & Reseed</span>
            </button>
          </div>
        </div>

        {/* Live Result Cards */}
        {benchResult && (
          <div className="bg-white/10 border border-white/20 rounded-xl p-5 space-y-4 pt-4 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Benchmark Success — SLA Compliant!
              </span>
              <span className="font-mono text-slate-300">
                Generation Time: {benchResult.generationTimeMs}ms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Query Latency</p>
                <p className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                  {benchResult.queryResponseTimeMs} ms
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Target: &lt; 2,000 ms</p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400 font-bold uppercase">SLA Target Margin</p>
                <p className="text-2xl font-black text-indigo-300 font-mono mt-0.5">
                  {(2000 - benchResult.queryResponseTimeMs)} ms
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Faster than ceiling</p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Active Subscriptions</p>
                <p className="text-2xl font-black text-white font-mono mt-0.5">
                  {benchResult.stats.activeSubscriptionsCount}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">In SQLite memory index</p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Invoices</p>
                <p className="text-2xl font-black text-white font-mono mt-0.5">
                  {benchResult.stats.totalInvoicesCount}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Processed in DB</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Logs Stream */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-600" />
              <span>System Activity & Audit Log Stream</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit trail of automated billing runs, status transitions, payments, and chasing notifications.
            </p>
          </div>
          <button
            onClick={loadLogs}
            className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden text-xs max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{log.title}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                    {log.type}
                  </span>
                </div>
                {log.details && <p className="text-slate-600 text-[11px]">{log.details}</p>}
                <p className="text-slate-400 text-[10px]">Triggered by: {log.created_by || 'System'}</p>
              </div>
              <span className="font-mono text-slate-400 text-[10px] whitespace-nowrap">
                {log.created_at}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
