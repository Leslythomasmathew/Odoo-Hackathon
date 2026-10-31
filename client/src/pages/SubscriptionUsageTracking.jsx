import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Gauge,
  Repeat,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Activity,
  Layers,
  Search,
  Filter,
  Bell,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Info,
  ChevronRight,
  RefreshCw,
  PlusCircle,
  BarChart3,
  Sliders,
  Check
} from 'lucide-react';

export function SubscriptionUsageTracking() {
  const { user, authFetch, isAdmin, isStaff } = useAuth();

  // State
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [charges, setCharges] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview | analytics | alerts | overage | simulator
  const [sectorFilter, setSectorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Feature Drilldown
  const [selectedFeatureKey, setSelectedFeatureKey] = useState(null);
  const [featureDetail, setFeatureDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Simulator State
  const [simFeature, setSimFeature] = useState('');
  const [simQuantity, setSimQuantity] = useState(1);
  const [simLoading, setSimLoading] = useState(false);
  const [simFeedback, setSimFeedback] = useState(null);

  // Load Subscriptions List
  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/usage/subscriptions');
      const list = res.subscriptions || [];
      setSubscriptions(list);
      if (list.length > 0) {
        if (!selectedSubId) {
          setSelectedSubId(list[0].id);
        } else {
          loadUsageData(selectedSubId);
        }
      } else {
        // Customer has no active subscriptions
        setData({ noSubscription: true });
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      setData({ noSubscription: true });
      setLoading(false);
    }
  };

  // Load Current Usage, Analytics & Alerts
  const loadUsageData = async (subId) => {
    try {
      setLoading(true);
      const queryParam = subId ? `?subscription_id=${subId}` : '';
      const [usageRes, analyticsRes, alertsRes, chargesRes] = await Promise.all([
        authFetch(`/api/usage/current${queryParam}`),
        authFetch(`/api/usage/analytics${queryParam}`),
        authFetch(`/api/usage/alerts${queryParam}`),
        authFetch(`/api/usage/charges${queryParam}`)
      ]);

      setData(usageRes);
      setAnalytics(analyticsRes);
      setAlerts(alertsRes.alerts || []);
      setCharges(chargesRes);

      // Auto-populate simulator dropdown with first available feature
      if (usageRes.features && usageRes.features.length > 0 && !simFeature) {
        setSimFeature(usageRes.features[0].feature_key);
      }
    } catch (err) {
      console.error('Failed to load usage data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  useEffect(() => {
    if (selectedSubId) {
      loadUsageData(selectedSubId);
    }
  }, [selectedSubId]);

  // Open Feature Drilldown Details
  const handleOpenFeatureDetail = async (featureKey) => {
    try {
      setSelectedFeatureKey(featureKey);
      setLoadingDetail(true);
      const queryParam = selectedSubId ? `?subscription_id=${selectedSubId}` : '';
      const detail = await authFetch(`/api/usage/features/${featureKey}${queryParam}`);
      setFeatureDetail(detail);
    } catch (err) {
      console.error('Failed to fetch feature detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Mark Alert Read
  const handleMarkAlertRead = async (alertId) => {
    try {
      const queryParam = selectedSubId ? `?subscription_id=${selectedSubId}` : '';
      await authFetch(`/api/usage/alerts/${alertId}/read${queryParam}`, {
        method: 'PATCH'
      });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: 1 } : a));
    } catch (err) {
      alert(err.message || 'Failed to update alert');
    }
  };

  // Run Simulator Event
  const handleSimulateEvent = async (e) => {
    e?.preventDefault();
    if (!simFeature) return;
    setSimLoading(true);
    setSimFeedback(null);

    try {
      const payload = {
        subscription_id: selectedSubId,
        feature_key: simFeature,
        quantity: Number(simQuantity) || 1,
        operation_type: 'client_usage_simulation',
        source_ref: `sim-${Date.now()}`
      };

      const res = await authFetch('/api/usage/record', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSimFeedback({
        type: 'success',
        message: `Successfully recorded +${simQuantity} consumption for ${res.feature_name || simFeature}. New total: ${res.new_usage}`,
        details: res.triggered_alerts && res.triggered_alerts.length > 0
          ? `Triggered alerts: ${res.triggered_alerts.map(a => a.message).join(' | ')}`
          : null
      });

      // Reload data to reflect new usage and progress bars
      loadUsageData(selectedSubId);
    } catch (err) {
      setSimFeedback({
        type: 'error',
        message: err.message || 'Simulation event failed'
      });
    } finally {
      setSimLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading dynamic subscription usage telemetry...</span>
      </div>
    );
  }

  if (data?.noSubscription) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm space-y-4 max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 mx-auto shadow-inner">
          <Gauge className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">No Active Subscription Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Your account ({user?.email}) does not have an active subscription yet. Feature usage tracking will automatically activate as soon as your subscription plan is confirmed.
          </p>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-left text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary-600" />
            <span>Want to test the dynamic usage dashboard right now?</span>
          </p>
          <p className="text-[11px] text-slate-500">
            Click <strong>Switch Role: Customer</strong> in the top navbar and select <strong>Alex Rivera (customer@acmecorp.com)</strong> or <strong>Sarah Connor (sarah@retailflow.io)</strong> to preview live contracts with active quota consumption, alerts, overage, and telemetry.
          </p>
        </div>
      </div>
    );
  }

  const { subscription, period, overview, features = [] } = data || {};

  // Filtering features
  const filteredFeatures = features.filter(f => {
    const matchesSector = sectorFilter === 'all' || f.sector === sectorFilter;
    const matchesType = typeFilter === 'all' || f.type === typeFilter;
    const matchesSearch = !searchQuery ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.feature_key.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSector && matchesType && matchesSearch;
  });

  // Unique sectors present in catalog
  const sectors = ['all', ...Array.from(new Set(features.map(f => f.sector).filter(Boolean)))];

  // Helper for progress bar color thresholds
  const getProgressColor = (status, pct) => {
    if (status === 'exceeded') return 'bg-rose-500';
    if (status === 'critical' || pct >= 90) return 'bg-rose-500';
    if (status === 'warning' || pct >= 80) return 'bg-amber-500';
    if (pct >= 50) return 'bg-blue-500';
    return 'bg-primary-600';
  };

  // Helper for status badge
  const renderStatusBadge = (status, isUnlimited) => {
    if (isUnlimited) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" />
          Unlimited
        </span>
      );
    }
    switch (status) {
      case 'exceeded':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <ShieldAlert className="w-2.5 h-2.5" />
            Exceeded
          </span>
        );
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Critical (90%+)
          </span>
        );
      case 'warning':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Warning (80%+)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Optimal
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Plan Context */}
      <div className="bg-gradient-to-r from-primary-950 via-primary-900 to-indigo-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg text-white shadow-inner">
              <Gauge className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">Subscription Usage Tracking</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {subscription?.plan_name}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {subscription?.status}
                </span>
              </div>
              <p className="text-xs text-primary-200 mt-1 flex items-center gap-2 flex-wrap">
                <span>Contract #{subscription?.number}</span>
                <span>•</span>
                <span>Customer: <strong className="text-white">{subscription?.customer_name}</strong> ({subscription?.customer_company || 'Personal'})</span>
                <span>•</span>
                <span>Cycle: {subscription?.billing_period}</span>
              </p>
            </div>
          </div>

          {/* Subscription Switcher (Multi-subscription or Admin/Staff) */}
          {subscriptions.length > 1 && (
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-xs border border-white/15">
              <label className="text-[10px] uppercase font-bold tracking-wider text-primary-200 block mb-1">
                Active Subscription:
              </label>
              <select
                value={selectedSubId || ''}
                onChange={(e) => setSelectedSubId(Number(e.target.value))}
                className="bg-primary-900 text-white text-xs rounded-lg px-2.5 py-1.5 border border-primary-700 focus:outline-hidden focus:ring-1 focus:ring-primary-400 cursor-pointer"
              >
                {subscriptions.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.number} - {s.plan_name} ({s.customer_name})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Billing Period Sub-bar */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-[10px] text-primary-300 uppercase tracking-wider font-semibold">Current Period</p>
            <p className="font-semibold text-white mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary-400" />
              <span>{period?.start} → {period?.end}</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-primary-300 uppercase tracking-wider font-semibold">Next Renewal</p>
            <p className="font-semibold text-white mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{subscription?.next_billing_date || 'Continuous'}</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-primary-300 uppercase tracking-wider font-semibold">Included Entitlements</p>
            <p className="font-semibold text-white mt-0.5">
              {overview?.total_included_features} features
            </p>
          </div>
          <div>
            <p className="text-[10px] text-primary-300 uppercase tracking-wider font-semibold">Unread Alerts</p>
            <p className="font-semibold text-amber-300 mt-0.5 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              <span>{overview?.unread_alerts_count} new</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tracked Features"
          value={overview?.actively_tracked_features || 0}
          subtitle={`Across ${sectors.length - 1} industry sectors`}
          icon={Layers}
          color="primary"
        />
        <StatsCard
          title="Approaching Limit"
          value={overview?.features_nearing_limit || 0}
          subtitle={overview?.features_nearing_limit > 0 ? "Requires attention (>80%)" : "All features within healthy range"}
          icon={AlertTriangle}
          color={overview?.features_nearing_limit > 0 ? "amber" : "emerald"}
        />
        <StatsCard
          title="Exceeded Features"
          value={overview?.features_exceeded || 0}
          subtitle={overview?.features_exceeded > 0 ? "Active overage applied" : "Zero limit breaches"}
          icon={ShieldAlert}
          color={overview?.features_exceeded > 0 ? "rose" : "emerald"}
        />
        <StatsCard
          title="Pending Overage"
          value={`$${(overview?.total_pending_overage_amount || 0).toFixed(2)}`}
          subtitle="Applied on next invoice cycle"
          icon={DollarSign}
          color={overview?.total_pending_overage_amount > 0 ? "amber" : "purple"}
        />
      </div>

      {/* 3. Actionable Recommendations / Warnings Banner */}
      {analytics?.recommendations && analytics.recommendations.length > 0 && (
        <div className="space-y-2">
          {analytics.recommendations.slice(0, 2).map((rec, i) => (
            <div
              key={i}
              className={`rounded-xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                rec.type === 'upgrade_warning'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : rec.type === 'overage_cost'
                  ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                  : 'bg-primary-50/70 border-primary-200 text-primary-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-primary-600" />
                <div>
                  <p className="font-bold text-slate-900">{rec.title}</p>
                  <p className="text-slate-600 text-[11px] mt-0.5">{rec.description}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('analytics')}
                className="px-3 py-1.5 bg-white shadow-xs border border-slate-200 rounded-lg text-slate-800 font-bold hover:bg-slate-50 transition-colors shrink-0"
              >
                {rec.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 4. Tab Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-primary-600 text-primary-700 bg-primary-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Feature Usage Cards ({features.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-primary-600 text-primary-700 bg-primary-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Usage Analytics & Forecast</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'border-primary-600 text-primary-700 bg-primary-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Threshold Alerts ({alerts.filter(a => !a.is_read).length} new)</span>
        </button>

        <button
          onClick={() => setActiveTab('overage')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'overage'
              ? 'border-primary-600 text-primary-700 bg-primary-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Overage & Charges (${(overview?.total_pending_overage_amount || 0).toFixed(2)})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'border-primary-600 text-primary-700 bg-primary-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Interactive Test Simulator</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: FEATURE USAGE CARDS                                            */}
      {/* ==================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Controls: Search, Sector and Type Filter */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search features or units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:bg-white focus:border-primary-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-slate-400 font-semibold text-[11px]">Sector:</span>
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700"
                >
                  {sectors.map(s => (
                    <option key={s} value={s}>
                      {s === 'all' ? 'All Sectors' : s.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-slate-400 font-semibold text-[11px]">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700"
                >
                  <option value="all">All Types</option>
                  <option value="quantity">Quantity-Based</option>
                  <option value="consumption">Consumption-Based</option>
                  <option value="access">Access-Based</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeatures.map(feat => {
              const pct = feat.is_unlimited ? 0 : Math.min(100, feat.percentage);
              const progressColor = getProgressColor(feat.status, feat.percentage);

              return (
                <div
                  key={feat.feature_id}
                  onClick={() => handleOpenFeatureDetail(feat.feature_key)}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-primary-300 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Sector, Name & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {feat.sector}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                            {feat.type}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                          {feat.name}
                        </h4>
                      </div>
                      {renderStatusBadge(feat.status, feat.is_unlimited)}
                    </div>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {feat.description}
                    </p>

                    {/* Numeric Consumption Display */}
                    <div className="mt-4 flex items-baseline justify-between text-xs">
                      <div>
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {feat.actual_usage.toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-[11px] ml-1 font-medium">
                          {feat.unit}
                        </span>
                      </div>
                      <div className="text-right text-slate-500 text-[11px]">
                        {feat.is_unlimited ? (
                          <span className="text-emerald-600 font-semibold">Included Unlimited</span>
                        ) : (
                          <span>
                            of <strong>{feat.allowance?.toLocaleString()}</strong> included
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {!feat.is_unlimited && (
                      <div className="mt-2.5">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${progressColor} transition-all duration-500 rounded-full`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mt-1">
                          <span>{feat.percentage}% consumed</span>
                          {feat.remaining !== null && (
                            <span className={feat.remaining === 0 ? 'text-rose-600 font-bold' : ''}>
                              {feat.remaining} {feat.unit} remaining
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Overage Notice */}
                    {feat.overage_units > 0 && (
                      <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[11px] text-rose-800 flex items-center justify-between">
                        <span>Overage: +{feat.overage_units} {feat.unit}</span>
                        <strong className="font-mono">+${feat.overage_amount.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="capitalize font-medium">Policy: {feat.policy.replace('_', ' ')}</span>
                    <span className="text-primary-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                      Details <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredFeatures.length === 0 && (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              No features match your current filter criteria.
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: USAGE ANALYTICS & FORECAST                                    */}
      {/* ==================================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Burn Rate & Forecast Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-600" />
                <span>Estimated Period-End Consumption Forecast</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated based on {analytics?.days_elapsed} days elapsed and {analytics?.days_remaining} days remaining in current billing cycle.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Feature</th>
                    <th className="py-2.5 px-4 text-right">Allowance</th>
                    <th className="py-2.5 px-4 text-right">Current Usage</th>
                    <th className="py-2.5 px-4 text-right">Daily Burn Rate</th>
                    <th className="py-2.5 px-4 text-right">Projected Total</th>
                    <th className="py-2.5 px-4 text-center">Projected %</th>
                    <th className="py-2.5 px-4 text-center">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {analytics?.forecast?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {item.allowance} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 font-bold">
                        {item.actual_usage} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        ~{item.daily_burn_rate} / day
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-600">
                        {item.projected_usage} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.projected_percentage >= 100
                            ? 'bg-rose-100 text-rose-800'
                            : item.projected_percentage >= 80
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.projected_percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        {item.will_exceed ? (
                          <span className="text-rose-600 text-[11px] font-bold">Will Exceed Limit</span>
                        ) : (
                          <span className="text-emerald-600 text-[11px] font-bold">Within Allowance</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Trends Time-Series Visualizer */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Recent Daily Consumption Events (Last 14 Days)</span>
            </h3>

            {analytics?.daily_trends && analytics.daily_trends.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {analytics.daily_trends.slice(0, 14).map((trend, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-slate-400 font-mono">{trend.date}</p>
                      <p className="text-xs font-semibold text-slate-800 mt-1 truncate" title={trend.feature_name}>
                        {trend.feature_name}
                      </p>
                      <p className="text-base font-mono font-bold text-primary-600 mt-0.5">
                        +{trend.amount}
                      </p>
                      <p className="text-[10px] text-slate-400">{trend.unit}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No daily events recorded yet in the current observation window.</p>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: THRESHOLD ALERTS                                              */}
      {/* ==================================================================== */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Usage Threshold Alerts & Notifications</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated threshold warnings dispatched at 50%, 80%, 90%, and 100% capacity milestones.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden text-xs">
            {alerts.length > 0 ? (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    alert.is_read ? 'bg-white opacity-70' : 'bg-primary-50/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                      alert.severity === 'danger'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : alert.severity === 'critical'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : alert.severity === 'warning'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {alert.threshold_percent}%
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-xs font-bold">{alert.feature_name}</strong>
                        <span className="text-[10px] text-slate-400">{alert.created_at}</span>
                        {!alert.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary-600"></span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{alert.message}</p>
                    </div>
                  </div>

                  {!alert.is_read && (
                    <button
                      onClick={() => handleMarkAlertRead(alert.id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Mark Read
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No threshold alerts generated for this subscription period.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: OVERAGE & CHARGES                                             */}
      {/* ==================================================================== */}
      {activeTab === 'overage' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Overage Policy & Accumulated Charges</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Features configured with overage policy allow continuous operation beyond included allowances.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Pending Balance</span>
              <p className="text-xl font-bold font-mono text-emerald-600">
                ${(charges?.total_pending_amount || 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Feature</th>
                  <th className="py-2.5 px-4 text-right">Overage Units</th>
                  <th className="py-2.5 px-4 text-right">Unit Rate</th>
                  <th className="py-2.5 px-4 text-right">Total Charge</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {charges?.charges && charges.charges.length > 0 ? (
                  charges.charges.map(ch => (
                    <tr key={ch.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">
                        {ch.feature_name}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        +{ch.units_over} {ch.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        ${Number(ch.rate).toFixed(3)} / {ch.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${Number(ch.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                          {ch.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-sans text-[11px]">
                        {ch.period_start} → {ch.period_end}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400 font-sans">
                      No overage charges recorded. All consumption within plan allowances!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: INTERACTIVE TEST SIMULATOR                                    */}
      {/* ==================================================================== */}
      {activeTab === 'simulator' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Real-Time Usage Event Simulator</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate real application operations (e.g. invoice creation, API calls, file storage, team seats) to verify dynamic tracking, threshold alerts, and backend limit enforcement.
            </p>
          </div>

          <form onSubmit={handleSimulateEvent} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Target Feature:</label>
                <select
                  value={simFeature}
                  onChange={(e) => setSimFeature(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-primary-500"
                >
                  {features.map(f => (
                    <option key={f.feature_key} value={f.feature_key}>
                      {f.name} ({f.sector} - {f.policy}) [Current: {f.actual_usage} / {f.is_unlimited ? 'Unlimited' : f.allowance} {f.unit}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Consumption Increment Quantity:</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={simQuantity}
                  onChange={(e) => setSimQuantity(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:border-primary-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-slate-500">
                Tests atomic database transactions, idempotency deduplication, and policy checks.
              </p>
              <button
                type="submit"
                disabled={simLoading}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {simLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" />
                )}
                <span>Simulate Usage Event</span>
              </button>
            </div>

            {simFeedback && (
              <div className={`p-4 rounded-xl text-xs border ${
                simFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <p className="font-bold">{simFeedback.message}</p>
                {simFeedback.details && (
                  <p className="mt-1 text-[11px] text-emerald-700">{simFeedback.details}</p>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* FEATURE DRILLDOWN MODAL                                               */}
      {/* ==================================================================== */}
      <Modal
        isOpen={!!selectedFeatureKey}
        onClose={() => {
          setSelectedFeatureKey(null);
          setFeatureDetail(null);
        }}
        title={featureDetail?.feature ? `${featureDetail.feature.name} • Telemetry Details` : 'Feature Details'}
        maxWidth="max-w-3xl"
      >
        {loadingDetail ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading feature details...</div>
        ) : featureDetail ? (
          <div className="space-y-5 text-xs">
            {/* Header Summary */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col sm:flex-row justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">{featureDetail.feature.sector} • {featureDetail.feature.type}</span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">{featureDetail.feature.name}</h4>
                <p className="text-slate-500 mt-1">{featureDetail.feature.description}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400">Policy</span>
                <p className="font-bold text-slate-900 uppercase">{featureDetail.feature.policy.replace('_', ' ')}</p>
                {featureDetail.feature.overage_allowed && (
                  <p className="text-[11px] text-primary-600 font-semibold mt-0.5">
                    Overage: ${featureDetail.feature.overage_rate} / {featureDetail.feature.unit}
                  </p>
                )}
              </div>
            </div>

            {/* Consumption Bar */}
            <div className="border border-slate-200/80 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-700">Billing Cycle Consumption</span>
                <span className="font-mono font-bold text-slate-900">
                  {featureDetail.feature.actual_usage} / {featureDetail.feature.is_unlimited ? 'Unlimited' : featureDetail.feature.allowance} {featureDetail.feature.unit}
                </span>
              </div>
              {!featureDetail.feature.is_unlimited && (
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(featureDetail.feature.status, featureDetail.feature.percentage)} rounded-full`}
                    style={{ width: `${Math.min(100, featureDetail.feature.percentage)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Daily History Table */}
            <div>
              <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary-600" />
                <span>Daily Consumption Log (Past 30 Days)</span>
              </h5>
              <div className="max-h-48 overflow-y-auto border border-slate-200/80 rounded-xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] border-b">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Units Recorded</th>
                      <th className="py-2 px-3 text-right">Events Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {featureDetail.daily_history && featureDetail.daily_history.length > 0 ? (
                      featureDetail.daily_history.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-slate-700 font-sans">{row.date}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">+{row.total_quantity} {featureDetail.feature.unit}</td>
                          <td className="py-2 px-3 text-right text-slate-500">{row.event_count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="py-4 text-center text-slate-400 font-sans">
                          No daily consumption recorded yet for this feature.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Test Increment in Modal */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-600">Quick Test: Record +1 operation for this feature</span>
              <button
                onClick={async () => {
                  try {
                    await authFetch('/api/usage/record', {
                      method: 'POST',
                      body: JSON.stringify({
                        subscription_id: selectedSubId,
                        feature_key: featureDetail.feature.feature_key,
                        quantity: 1,
                        operation_type: 'quick_test'
                      })
                    });
                    handleOpenFeatureDetail(featureDetail.feature.feature_key);
                    loadUsageData(selectedSubId);
                  } catch (err) {
                    alert(err.message || 'Operation failed');
                  }
                }}
                className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold text-[11px] transition-colors"
              >
                +1 Increment
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default SubscriptionUsageTracking;

