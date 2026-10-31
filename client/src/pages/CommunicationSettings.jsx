import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, MessageSquare, Save, Send, CheckCircle2, AlertCircle, RefreshCw, Key, ShieldCheck, Info, Zap, ExternalLink } from 'lucide-react';

export function CommunicationSettings() {
  const { authFetch } = useAuth();

  const [settings, setSettings] = useState({
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: '',
    SMTP_PASS: '',
    EMAIL_FROM: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Test email state
  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState('');
  const [testEmailError, setTestEmailError] = useState('');
  const [testEmailPreviewUrl, setTestEmailPreviewUrl] = useState('');
  const [generatingTestAccount, setGeneratingTestAccount] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/notifications/settings/config');
      if (res && res.settings) {
        setSettings(prev => ({ ...prev, ...res.settings }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset) => {
    if (preset === 'gmail') {
      setSettings(prev => ({
        ...prev,
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        EMAIL_FROM: prev.SMTP_USER ? `Brightloop Billing <${prev.SMTP_USER}>` : prev.EMAIL_FROM
      }));
    } else if (preset === 'brevo') {
      setSettings(prev => ({
        ...prev,
        SMTP_HOST: 'smtp-relay.brevo.com',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false'
      }));
    } else if (preset === 'sendgrid') {
      setSettings(prev => ({
        ...prev,
        SMTP_HOST: 'smtp.sendgrid.net',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: 'apikey'
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await authFetch('/api/notifications/settings/config', {
        method: 'POST',
        body: JSON.stringify({ settings })
      });
      setSuccessMsg(res.message || 'Settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTestMailbox = async () => {
    try {
      setGeneratingTestAccount(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await authFetch('/api/notifications/settings/auto-test-account', {
        method: 'POST'
      });
      if (res && res.account) {
        setSettings(prev => ({
          ...prev,
          SMTP_HOST: res.account.host,
          SMTP_PORT: String(res.account.port),
          SMTP_SECURE: String(res.account.secure),
          SMTP_USER: res.account.user,
          SMTP_PASS: res.account.pass,
          EMAIL_FROM: `Brightloop Billing <${res.account.user}>`
        }));
        setSuccessMsg('⚡ Instant Live Test Mailbox generated & connected! Live emails will be delivered and viewable in real-time.');
        if (!testEmailTo) {
          setTestEmailTo(res.account.user);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to auto-generate test mailbox.');
    } finally {
      setGeneratingTestAccount(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTo) {
      setTestEmailError('Please enter a recipient email.');
      return;
    }
    setSendingTestEmail(true);
    setTestEmailResult('');
    setTestEmailError('');
    setTestEmailPreviewUrl('');

    try {
      const res = await authFetch('/api/notifications/test-email', {
        method: 'POST',
        body: JSON.stringify({ to: testEmailTo })
      });
      setTestEmailResult(res.message);
      setTestEmailPreviewUrl(res.previewUrl || '');
    } catch (err) {
      setTestEmailError(err.message || 'Test email delivery failed.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading email gateway configuration...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary-600" />
          <span>Email Gateway Settings</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure real delivery credentials (Gmail, SMTP, Brevo, SendGrid) so all subscription confirmations, invoice due alerts, and payment receipts arrive directly in actual user inboxes.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Email SMTP Gateway Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-600" />
                <span>Live Email Provider (SMTP)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sends branded HTML emails for subscriptions, invoices, and payment receipts.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('gmail')}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px]"
              >
                Gmail
              </button>
              <button
                type="button"
                onClick={() => applyPreset('brevo')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px]"
              >
                Brevo
              </button>
              <button
                type="button"
                onClick={() => applyPreset('sendgrid')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px]"
              >
                SendGrid
              </button>
              <button
                type="button"
                onClick={handleGenerateTestMailbox}
                disabled={generatingTestAccount}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-[11px] flex items-center gap-1 disabled:opacity-50"
              >
                <Zap className="w-3 h-3 text-amber-600" />
                <span>{generatingTestAccount ? 'Connecting...' : 'Instant Test Mailbox (1-Click)'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">SMTP Host</label>
              <input
                type="text"
                placeholder="smtp.gmail.com"
                value={settings.SMTP_HOST}
                onChange={(e) => handleChange('SMTP_HOST', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">SMTP Port</label>
              <input
                type="number"
                placeholder="465 or 587"
                value={settings.SMTP_PORT}
                onChange={(e) => handleChange('SMTP_PORT', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={settings.SMTP_SECURE === 'true'}
                  onChange={(e) => handleChange('SMTP_SECURE', e.target.checked ? 'true' : 'false')}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="font-semibold text-slate-700">SSL/TLS Secure (Port 465)</span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">SMTP Username / Email</label>
              <input
                type="text"
                placeholder="your.email@gmail.com"
                value={settings.SMTP_USER}
                onChange={(e) => handleChange('SMTP_USER', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">SMTP Password / App Password</label>
              <input
                type="password"
                placeholder="16-character App Password"
                value={settings.SMTP_PASS}
                onChange={(e) => handleChange('SMTP_PASS', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Sender Identity (From)</label>
              <input
                type="text"
                placeholder="Brightloop Billing <noreply@brightloop.com>"
                value={settings.EMAIL_FROM}
                onChange={(e) => handleChange('EMAIL_FROM', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-indigo-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>How to get your Gmail 16-Character App Password in 60 seconds:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-indigo-900 leading-relaxed text-[11px]">
              <li>Visit your Google Account App Passwords page: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-700">myaccount.google.com/apppasswords</a> (ensure 2-Step Verification is active on your Google account).</li>
              <li>Enter <strong>Brightloop</strong> as the App Name and click <strong>Create</strong>.</li>
              <li>Google will reveal a 16-character code (e.g. <code className="bg-white px-1.5 py-0.5 rounded font-mono text-indigo-800">abcd efgh ijkl mnop</code>). Copy it.</li>
              <li>Enter your Gmail in <strong>SMTP Username / Email</strong> and paste the 16 characters in <strong>SMTP Password / App Password</strong>.</li>
              <li>Click <strong>Save Gateway Configuration</strong> below.</li>
            </ol>
            <p className="text-[11px] text-indigo-800 pt-1 border-t border-indigo-200/60 font-medium">
              💡 <em>Don't have an App Password ready? Click <strong>"Instant Test Mailbox (1-Click)"</strong> at the top to test live email delivery immediately!</em>
            </p>
          </div>

          {/* Test Real Email Box */}
          <div className="pt-3 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-800 text-xs">Verify Live Email Delivery</h4>
                <p className="text-[11px] text-slate-500">Send an immediate test verification email to your real personal inbox.</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  placeholder="Enter your personal email"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  className="text-xs px-3 py-2 border border-slate-300 rounded-lg w-full sm:w-64 bg-white focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                >
                  {sendingTestEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{sendingTestEmail ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>
            </div>

            {testEmailResult && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs flex flex-col gap-1.5">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{testEmailResult}</span>
                </div>
                {testEmailPreviewUrl && (
                  <a
                    href={testEmailPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary-700 hover:text-primary-800 font-bold text-[11px] underline ml-6"
                  >
                    <span>Click to view live email delivery in web viewer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
            {testEmailError && (
              <div className="mt-3 p-2.5 bg-rose-100/70 border border-rose-300 text-rose-900 rounded-lg text-xs font-medium">
                {testEmailError}
              </div>
            )}
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Gateway Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
