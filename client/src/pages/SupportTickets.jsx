import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LifeBuoy,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Send,
  User,
  Bot,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Tag,
  Mail,
  Calendar
} from 'lucide-react';

export function SupportTickets() {
  const { user, authFetch } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, open, in_progress, resolved, closed
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected ticket for message view/reply modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [newStatus, setNewStatus] = useState('in_progress');

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/support/tickets');
      setTickets(res.tickets || []);
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const openTicketModal = async (ticket) => {
    try {
      setSelectedTicket(ticket);
      setNewStatus(ticket.status === 'open' ? 'in_progress' : ticket.status);
      setLoadingMessages(true);
      const res = await authFetch(`/api/support/tickets/${ticket.id}`);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load ticket messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    try {
      setSendingReply(true);
      const res = await authFetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText.trim() })
      });

      // Update status if changed
      if (newStatus !== selectedTicket.status) {
        await authFetch(`/api/support/tickets/${selectedTicket.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus })
        });
      }

      setReplyText('');
      // Reload ticket messages
      const updated = await authFetch(`/api/support/tickets/${selectedTicket.id}`);
      setMessages(updated.messages || []);
      setSelectedTicket(updated.ticket);
      loadTickets();
    } catch (err) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChangeQuick = async (ticketId, status) => {
    try {
      await authFetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      loadTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status }));
      }
    } catch (err) {
      alert(err.message || 'Failed to update ticket status');
    }
  };

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.customer_email && t.customer_email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-primary-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              Customer Care & Enquiries Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-['Outfit'] mt-1">
            Support Ticket Management
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/80 mt-1 max-w-2xl">
            Monitor incoming customer support enquiries, technical questions, and billing tickets dispatched by customers and the BrightCare AI Chatbot.
          </p>
        </div>

        {/* Quick KPI stats in header */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/15 text-center">
            <div className="text-xl font-extrabold text-amber-300 font-['Outfit']">{openCount}</div>
            <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Open Tickets</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/15 text-center">
            <div className="text-xl font-extrabold text-indigo-300 font-['Outfit']">{inProgressCount}</div>
            <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">In Progress</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/15 text-center">
            <div className="text-xl font-extrabold text-emerald-300 font-['Outfit']">{resolvedCount}</div>
            <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Resolved</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ticket #, customer, subject..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">All Categories</option>
            <option value="billing">Billing & Invoices</option>
            <option value="subscription">Subscriptions & Plans</option>
            <option value="technical">Technical / Integration</option>
            <option value="enquiry">General Enquiry</option>
            <option value="account">Account Access</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Loading support inquiries...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <LifeBuoy className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm font-['Outfit']">No Support Tickets Found</h3>
            <p className="text-xs text-slate-400">No tickets match the selected filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTickets.map((t) => {
                  const isHighOrUrgent = t.priority === 'urgent' || t.priority === 'high';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-primary-600">
                        {t.ticket_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{t.customer_name || 'Customer'}</div>
                        <div className="text-[11px] text-slate-400">{t.customer_email}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate font-semibold text-slate-800">
                        {t.subject}
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : t.priority === 'high'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : t.priority === 'normal'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                            t.status === 'open'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : t.status === 'in_progress'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : t.status === 'resolved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              t.status === 'open'
                                ? 'bg-amber-500 animate-pulse'
                                : t.status === 'in_progress'
                                ? 'bg-indigo-500'
                                : t.status === 'resolved'
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                            }`}
                          ></span>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openTicketModal(t)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>View & Reply</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TICKET DETAILS & REPLY MODAL                                              */}
      {/* ========================================================================= */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 relative">
              <button
                onClick={() => setSelectedTicket(null)}
                className="absolute top-5 right-5 text-white/60 hover:text-white text-lg font-bold"
              >
                ✕
              </button>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-300">
                  {selectedTicket.ticket_number}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-white">
                  {selectedTicket.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedTicket.status === 'resolved'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {selectedTicket.status.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-white font-['Outfit'] mt-2">
                {selectedTicket.subject}
              </h3>

              <div className="mt-2 text-xs text-indigo-200/80 flex items-center gap-4">
                <span>Customer: <strong>{selectedTicket.customer_name}</strong> ({selectedTicket.customer_email})</span>
              </div>
            </div>

            {/* Conversation Messages Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/70">
              {loadingMessages ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading conversation history...</div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No message history available.</div>
              ) : (
                messages.map((m) => {
                  const isAgent = m.sender_type === 'agent';
                  const isBot = m.sender_type === 'bot';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-start gap-2.5 max-w-[90%]">
                        {!isAgent && (
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                              isBot ? 'bg-gradient-to-tr from-primary-600 to-indigo-600' : 'bg-slate-700'
                            }`}
                          >
                            {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-4 py-3 text-xs shadow-xs ${
                            isAgent
                              ? 'bg-primary-600 text-white rounded-br-xs'
                              : isBot
                              ? 'bg-indigo-50/80 text-indigo-950 border border-indigo-100 rounded-bl-xs'
                              : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                          }`}
                        >
                          <div className="font-bold text-[11px] mb-1 opacity-80">
                            {m.sender_name || (isAgent ? 'Support Agent' : isBot ? 'BrightCare AI' : 'Customer')}
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                        </div>

                        {isAgent && (
                          <div className="w-8 h-8 rounded-xl bg-primary-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {user?.name?.charAt(0) || 'S'}
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 mt-1 px-10">
                        {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="p-5 bg-white border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 font-['Outfit']">Respond to Customer</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[11px]">Set Status:</span>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 font-bold bg-white text-slate-800"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="open">Open</option>
                  </select>
                </div>
              </div>

              <textarea
                required
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your official support response to the customer..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStatusChangeQuick(selectedTicket.id, 'resolved')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    Mark as Resolved ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChangeQuick(selectedTicket.id, 'closed')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Close Ticket
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Close View
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingReply ? 'Sending...' : 'Send Response'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
