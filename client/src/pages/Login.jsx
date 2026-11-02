import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Building, AlertCircle, ArrowRight, Sparkles, Check, Eye, EyeOff } from 'lucide-react';

export function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Mode: 'customer' vs 'staff'
  const [roleMode, setRoleMode] = useState('customer'); // 'customer' | 'staff'
  // Customer Auth View: 'login' | 'signup' | 'forgot'
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup' | 'forgot'

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Validation
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState({ text: '', available: false });
  const [simulatedEmail, setSimulatedEmail] = useState(null);

  // AUTH-3: Password Strength & Criteria Calculation
  const criteria = {
    length: password.length > 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };

  const validCount = Object.values(criteria).filter(Boolean).length;
  const passwordPercent = Math.round((validCount / 4) * 100);

  let strengthLabel = 'Start typing a password';
  let strengthColor = '#94a3b8';

  if (password.length > 0) {
    if (validCount <= 1) {
      strengthLabel = 'Weak — Keep going! ⏳';
      strengthColor = '#ef4444';
    } else if (validCount === 2) {
      strengthLabel = 'Fair — Looking better! 👍';
      strengthColor = '#f59e0b';
    } else if (validCount === 3) {
      strengthLabel = 'Good — Almost there! 💪';
      strengthColor = '#0ea5e9';
    } else if (validCount === 4) {
      strengthLabel = 'Super strong password! 🚀';
      strengthColor = '#10b981';
    }
  }

  // Real-time unique email check for signup
  useEffect(() => {
    if (authView !== 'signup' || !email.includes('@') || email.length < 5) {
      setEmailStatus({ text: '', available: false });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.available) {
          setEmailStatus({ text: '✓ Email is available!', available: true });
        } else {
          setEmailStatus({ text: '✕ Email is already registered', available: false });
        }
      } catch (e) {
        setEmailStatus({ text: '', available: false });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [email, authView]);

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login(email, password);
      if (user.role === 'customer') {
        navigate('/portal');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Customer Signup Submit
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (validCount < 4) {
      setError('Please satisfy all password criteria (> 8 chars, uppercase, lowercase, special character).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register({
        name,
        email,
        password,
        company
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      navigate('/portal');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.simulation) {
        setSimulatedEmail(data.simulation);
      } else {
        alert(data.message || 'Reset link sent if account exists.');
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch reset link.');
    } finally {
      setLoading(false);
    }
  };

  // Quick autofill demo logins
  const fillAndLogin = async (demoEmail, demoPass, targetRole = 'customer') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setLoading(true);

    try {
      const user = await login(demoEmail, demoPass);
      if (targetRole === 'customer' || user.role === 'customer') {
        navigate('/portal');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Role Mode Switcher Pill */}
      <div className="mx-auto mb-6 flex bg-slate-200/80 p-1 rounded-full border border-slate-300/80 shadow-xs">
        <button
          type="button"
          onClick={() => {
            setRoleMode('customer');
            setAuthView('login');
            setError('');
          }}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
            roleMode === 'customer'
              ? 'bg-white text-indigo-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>👤 Customer Portal</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleMode('staff');
            setError('');
          }}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
            roleMode === 'staff'
              ? 'bg-white text-indigo-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🏢 Staff & Admin Console</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. CUSTOMER PORTAL AUTH CARD */}
      {/* ========================================================================= */}
      {roleMode === 'customer' ? (
        <div className="casual-auth-container animate-in fade-in zoom-in-95 duration-200">
          {/* Friendly Brand Heading */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-primary-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-500/25 mx-auto mb-3">
              B
            </div>
            <h2 className="text-2xl font-extrabold text-[#1e1b4b] font-['Outfit'] mb-1">
              {authView === 'signup'
                ? 'Create your account 👋'
                : authView === 'login'
                ? 'Welcome back! ✨'
                : 'Forgot your password? ☕'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              {authView === 'signup'
                ? 'Join Brightloop to manage subscriptions & billing with zero hassle.'
                : authView === 'login'
                ? 'Sign in to access your subscriptions, invoices, and payments.'
                : 'No worries! Enter your registered email and we will send a reset link.'}
            </p>
          </div>

          {/* Tab Switcher (Visible on Signup & Sign In) */}
          {authView !== 'forgot' && (
            <div className="auth-tabs-header">
              <button
                type="button"
                onClick={() => {
                  setAuthView('signup');
                  setError('');
                }}
                className={`auth-tab-choice ${authView === 'signup' ? 'active' : ''}`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthView('login');
                  setError('');
                }}
                className={`auth-tab-choice ${authView === 'login' ? 'active' : ''}`}
              >
                Sign In
              </button>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* VIEW: SIGN IN */}
          {authView === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('forgot');
                      setError('');
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 transition-all font-['Outfit'] mt-2"
              >
                {loading ? 'Signing in...' : 'Sign In to Portal'}
              </button>

              {/* Quick Customer 1-Click Autofill Demo Button */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => fillAndLogin('customer@acmecorp.com', 'CustomerAcme2026!', 'customer')}
                  className="w-full py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <span>✨ 1-Click Demo Customer (Acme Corp)</span>
                </button>
              </div>

              <div className="text-center text-xs text-slate-500 pt-2">
                New customer?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('signup');
                    setError('');
                  }}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Create an account
                </button>
              </div>
            </form>
          )}

          {/* VIEW: CREATE ACCOUNT */}
          {authView === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company or Org</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Work Email (Must be unique)</label>
                  {emailStatus.text && (
                    <span className={`text-[11px] font-bold ${emailStatus.available ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {emailStatus.text}
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">Each email can belong to only one account in Brightloop.</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Strong Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-bold text-indigo-600 flex items-center gap-1"
                  >
                    {showPassword ? '🙈 Hide' : '👁️ Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a strong password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
                />

                {/* Password Strength Progress Bar */}
                <div className="password-meter-wrap mt-2">
                  <div className="password-meter-bar">
                    <div
                      className="password-meter-fill"
                      style={{ width: `${passwordPercent}%`, backgroundColor: strengthColor }}
                    />
                  </div>
                  <div className="password-meter-label mt-1">
                    <span style={{ color: strengthColor }}>{strengthLabel}</span>
                    <span>{passwordPercent}%</span>
                  </div>
                </div>

                {/* Live 4-Criteria Validation Checklist */}
                <div className="password-criteria-list mt-3">
                  <div className={`criterion-item ${criteria.length ? 'valid' : ''}`}>
                    <span className="criterion-icon">{criteria.length ? '✓' : '○'}</span>
                    <span>More than 8 characters (&gt;8)</span>
                  </div>
                  <div className={`criterion-item ${criteria.hasUpper ? 'valid' : ''}`}>
                    <span className="criterion-icon">{criteria.hasUpper ? '✓' : '○'}</span>
                    <span>One uppercase letter (A-Z)</span>
                  </div>
                  <div className={`criterion-item ${criteria.hasLower ? 'valid' : ''}`}>
                    <span className="criterion-icon">{criteria.hasLower ? '✓' : '○'}</span>
                    <span>One lowercase letter (a-z)</span>
                  </div>
                  <div className={`criterion-item ${criteria.hasSpecial ? 'valid' : ''}`}>
                    <span className="criterion-icon">{criteria.hasSpecial ? '✓' : '○'}</span>
                    <span>One special character (!@#$)</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 transition-all font-['Outfit'] mt-2"
              >
                {loading ? 'Creating Account...' : 'Create Account & Go to Portal 🚀'}
              </button>

              <div className="text-center text-xs text-slate-500 pt-2">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('login');
                    setError('');
                  }}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {authView === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your registered email address below. We will send a secure password reset link to your registered email immediately.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Registered Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 transition-all font-['Outfit']"
              >
                {loading ? 'Dispatching...' : 'Send Reset Link ✉️'}
              </button>

              {/* Interactive Simulated Email Inbox Toast Card */}
              {simulatedEmail && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-4 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-blue-800 font-extrabold text-xs uppercase tracking-wider">
                    <span>📬</span>
                    <span>Simulated Email Received!</span>
                  </div>
                  <p className="text-xs text-slate-700">
                    A reset token was generated and dispatched to <strong>{simulatedEmail.email}</strong>.
                  </p>
                  <Link
                    to={simulatedEmail.resetUrl}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span>👉 Click Here to Open Reset Link</span>
                  </Link>
                </div>
              )}

              <div className="text-center text-xs text-slate-500 pt-2">
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('login');
                    setError('');
                  }}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Return to sign in
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. STAFF & ADMIN CONSOLE LOGIN CARD                                       */
        /* ========================================================================= */
        <div className="max-w-md w-full mx-auto bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-900 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-slate-900/20 mx-auto mb-3">
              🛡️
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 font-['Outfit']">Staff & Admin Console</h2>
            <p className="text-xs text-slate-500 mt-1">Authorized internal Brightloop operational access only</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Staff Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@brightloop.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all font-['Outfit'] mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In as Employee'}
            </button>
          </form>

          {/* Quick 1-Click Demo Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
              Quick 1-Click Internal Logins
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillAndLogin('admin@brightloop.com', 'BrightloopAdmin2026!', 'admin')}
                className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors text-center"
              >
                👑 Administrator
              </button>
              <button
                type="button"
                onClick={() => fillAndLogin('staff@brightloop.com', 'BrightloopStaff2026!', 'staff')}
                className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition-colors text-center"
              >
                💼 Operations Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
