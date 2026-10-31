import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { UserCheck, Plus, Shield, Mail, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

export function StaffManagement() {
  const { authFetch, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await authFetch('/api/users');
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      await authFetch('/api/users/staff', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      setModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      loadUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to add staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const staffUsers = users.filter(u => u.role === 'staff' || u.role === 'admin');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-rose-600" />
            <span>Internal Team & Staff Accounts</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            AUTH-6: Only the Admin can provision and manage internal team members.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Staff Member</span>
          </button>
        )}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffUsers.map((u) => (
          <div
            key={u.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex items-start gap-4"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              u.role === 'admin'
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
            }`}>
              {u.name?.charAt(0) || 'S'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm truncate">{u.name}</h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.2 rounded-full border ${
                  u.role === 'admin'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {u.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{u.email}</p>
              <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Joined: {u.created_at?.split(' ')[0]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal (AUTH-3 & AUTH-6) */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Provision Internal Staff Member" maxWidth="max-w-md">
        <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Johnathan Smith"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Company Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jsmith@brightloop.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Initial Password (AUTH-3) *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 9 chars with Aa#1"
              className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
            />
            <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-700">Password Policy Requirements (AUTH-3):</p>
              <p className={password.length > 8 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                • More than eight characters ({password.length}/9+)
              </p>
              <p className={/[A-Z]/.test(password) ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                • At least one uppercase letter (A-Z)
              </p>
              <p className={/[a-z]/.test(password) ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                • At least one lowercase letter (a-z)
              </p>
              <p className={/[^A-Za-z0-9]/.test(password) ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                • At least one special character (!@#$%^&*)
              </p>
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
              {submitting ? 'Creating...' : 'Create Staff Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
