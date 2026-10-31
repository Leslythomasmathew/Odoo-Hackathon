import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Bot,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Volume2,
  VolumeX,
  CreditCard,
  Repeat,
  FileText,
  Tag,
  Ticket,
  ChevronRight,
  User,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
  Zap,
  ArrowRight
} from 'lucide-react';

export function ChatbotWidget({ defaultOpen = false, onOpenBillingRun }) {
  const { user, isCustomer, authFetch } = useAuth();

  // Chatbot is strictly for customer self-service; disabled in administrator and staff dashboard
  if (!isCustomer) {
    return null;
  }

  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Ticket creation modal inside chat
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('enquiry');
  const [ticketPriority, setTicketPriority] = useState('normal');
  const [ticketDetails, setTicketDetails] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Initial welcome message
  const getInitialMessages = () => [
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `Hello **${user?.name || 'there'}**! 👋 I'm **BrightCare AI**, your 24/7 customer care assistant for Brightloop.\n\nI can answer enquiries about the platform, explain billing and discounts, look up your active subscriptions, check unpaid balances, or help you open a support ticket for our engineering team.\n\nHow can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedQuestions: [
        'What are my active subscriptions?',
        'Do I have any unpaid invoices?',
        'When is my next billing date?',
        'How do I pause my subscription?',
        'Submit a support ticket'
      ],
      quickActions: [
        { label: '📦 My Subscriptions', action: 'navigate_subscriptions' },
        { label: '💳 View Invoices', action: 'navigate_invoices' },
        { label: '🎫 Open Support Ticket', action: 'open_ticket_modal' }
      ]
    }
  ];

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`brightcare_chat_${user?.id || 'guest'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return getInitialMessages();
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Persist messages
  useEffect(() => {
    try {
      if (user?.id) {
        localStorage.setItem(`brightcare_chat_${user.id}`, JSON.stringify(messages));
      }
    } catch (e) {
      // ignore
    }
  }, [messages, user?.id]);

  // Scroll to bottom on message update
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen, isMinimized]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // Play subtle feedback chime
  const playSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // AudioContext may be blocked before interaction
    }
  };

  // Reset conversation
  const handleResetChat = () => {
    const initial = getInitialMessages();
    setMessages(initial);
    try {
      if (user?.id) {
        localStorage.removeItem(`brightcare_chat_${user.id}`);
      }
    } catch (e) {}
  };

  // Copy message text
  const handleCopyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Handle Quick Action Clicks
  const handleActionClick = (actionItem) => {
    if (!actionItem) return;
    const action = typeof actionItem === 'string' ? actionItem : (actionItem.action || '');
    const label = typeof actionItem === 'string' ? actionItem : (actionItem.label || '');
    const invoiceId = typeof actionItem === 'object' ? actionItem.invoiceId : null;

    // Subscriptions
    if (
      action === 'navigate_subscriptions' ||
      action === 'subscriptions' ||
      action === 'view_subscriptions' ||
      /sub/i.test(action) ||
      /sub/i.test(label)
    ) {
      handleSendMessage('What are my active subscriptions?');
      window.dispatchEvent(new CustomEvent('switch-portal-tab', { detail: 'subscriptions' }));
      if (window.location.pathname !== '/portal') {
        navigate('/portal?tab=subscriptions');
      } else {
        const url = new URL(window.location);
        url.searchParams.set('tab', 'subscriptions');
        window.history.pushState({}, '', url);
      }
      return;
    }

    // Invoices
    if (
      action === 'navigate_invoices' ||
      action === 'invoices' ||
      action === 'view_invoices' ||
      /inv/i.test(action) ||
      /inv/i.test(label) ||
      /bill/i.test(action) ||
      /bill/i.test(label)
    ) {
      handleSendMessage('Show my invoices and balance');
      window.dispatchEvent(new CustomEvent('switch-portal-tab', { detail: 'invoices' }));
      if (window.location.pathname !== '/portal') {
        navigate(isCustomer ? '/portal?tab=invoices' : '/invoices');
      } else {
        const url = new URL(window.location);
        url.searchParams.set('tab', 'invoices');
        window.history.pushState({}, '', url);
      }
      return;
    }

    // Payments
    if (
      action === 'navigate_payments' ||
      action === 'payments' ||
      (/pay/i.test(action) && !action.includes('invoice')) ||
      (/pay/i.test(label) && !label.includes('Pay INV') && !label.includes('Pay $'))
    ) {
      handleSendMessage('Show my payment history');
      window.dispatchEvent(new CustomEvent('switch-portal-tab', { detail: 'payments' }));
      if (window.location.pathname !== '/portal') {
        navigate(isCustomer ? '/portal?tab=payments' : '/payments');
      } else {
        const url = new URL(window.location);
        url.searchParams.set('tab', 'payments');
        window.history.pushState({}, '', url);
      }
      return;
    }

    // Pay specific invoice
    if (action === 'pay_invoice' || /pay/i.test(label)) {
      window.dispatchEvent(new CustomEvent('pay-invoice-modal', { detail: invoiceId }));
      window.dispatchEvent(new CustomEvent('switch-portal-tab', { detail: 'invoices' }));
      if (window.location.pathname !== '/portal') {
        navigate('/portal?tab=invoices');
      } else {
        const url = new URL(window.location);
        url.searchParams.set('tab', 'invoices');
        window.history.pushState({}, '', url);
      }
      return;
    }

    // Discounts
    if (
      action === 'navigate_discounts' ||
      action === 'discounts' ||
      /disc/i.test(action) ||
      /disc/i.test(label)
    ) {
      handleSendMessage('What automated discounts apply to me?');
      window.dispatchEvent(new CustomEvent('switch-portal-tab', { detail: 'discounts' }));
      if (window.location.pathname !== '/portal') {
        navigate(isCustomer ? '/portal?tab=discounts' : '/discounts');
      } else {
        const url = new URL(window.location);
        url.searchParams.set('tab', 'discounts');
        window.history.pushState({}, '', url);
      }
      return;
    }

    // Support tab
    if (action === 'navigate_support_tab' || /support/i.test(action) || /support/i.test(label)) {
      window.dispatchEvent(new CustomEvent('switch-portal-tab', { detail: 'support' }));
      if (window.location.pathname !== '/portal') {
        navigate('/portal?tab=support');
      } else {
        const url = new URL(window.location);
        url.searchParams.set('tab', 'support');
        window.history.pushState({}, '', url);
      }
      return;
    }

    // Open ticket modal
    if (action === 'open_ticket_modal' || action === 'ticket' || /ticket/i.test(action) || /ticket/i.test(label)) {
      setIsTicketModalOpen(true);
      return;
    }

    // Plans
    if (action === 'navigate_plans' || /plan/i.test(action) || /plan/i.test(label)) {
      navigate('/plans');
      return;
    }

    // Billing simulation
    if (action === 'trigger_billing_simulation') {
      if (onOpenBillingRun) {
        onOpenBillingRun();
      } else {
        window.dispatchEvent(new CustomEvent('switch-portal-tab', { detail: 'subscriptions' }));
        navigate('/portal');
      }
      return;
    }
  };

  // Send message
  const handleSendMessage = async (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend.trim() : inputMessage.trim();
    if (!text) return;
    if (isTyping) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const res = await authFetch('/api/support/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      playSound();

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: res.reply || 'I am processing your enquiry. How else may I assist you?',
        suggestedQuestions: res.suggestedQuestions || [],
        quickActions: res.quickActions || [],
        dataCard: res.dataCard || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);

      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      const errorMsg = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: `I apologize, but I encountered a temporary connection glitch. You can retry your question or submit an inquiry ticket directly.`,
        suggestedQuestions: ['Submit a support ticket', 'What are my active subscriptions?'],
        quickActions: [{ label: '🎫 Open Support Ticket', action: 'open_ticket_modal' }],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Submit in-chat ticket
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDetails.trim()) return;

    try {
      setSubmittingTicket(true);
      const res = await authFetch('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          category: ticketCategory,
          priority: ticketPriority,
          message: ticketDetails.trim()
        })
      });

      const ticketNum = res.ticket?.ticket_number || 'TICK-NEW';

      setIsTicketModalOpen(false);
      setTicketSubject('');
      setTicketDetails('');

      playSound();

      const confirmMsg = {
        id: `bot-ticket-${Date.now()}`,
        sender: 'bot',
        text: `🎉 **Support Ticket Created!**\n\nTicket Reference: **\`${ticketNum}\`**\n- **Subject:** ${res.ticket?.subject}\n- **Category:** \`${res.ticket?.category.toUpperCase()}\`\n- **Priority:** \`${res.ticket?.priority.toUpperCase()}\`\n- **Status:** \`OPEN\`\n\nA notification has been dispatched to our engineering customer care lead. You can check ticket updates anytime on the **Support** tab.`,
        suggestedQuestions: ['What are my active subscriptions?', 'Do I have any unpaid invoices?'],
        quickActions: [{ label: 'Go to Support Center', action: 'navigate_support_tab' }],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, confirmMsg]);
    } catch (err) {
      alert(err.message || 'Failed to submit support ticket.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Helper to format bot markdown text
  const formatMarkdown = (content) => {
    if (!content) return '';
    return content
      .split('\n')
      .map((line, i) => {
        // Bullet item
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <li key={i} className="ml-4 list-disc text-slate-700">
              {renderInlineMarkdown(line.replace(/^[•\-]\s*/, ''))}
            </li>
          );
        }
        // Heading 3
        if (line.startsWith('### ')) {
          return (
            <h4 key={i} className="font-extrabold text-slate-900 mt-2 mb-1 text-sm font-['Outfit']">
              {line.replace('### ', '')}
            </h4>
          );
        }
        // Empty lines
        if (!line.trim()) {
          return <div key={i} className="h-1.5" />;
        }
        return (
          <p key={i} className="mb-1 leading-relaxed text-slate-800">
            {renderInlineMarkdown(line)}
          </p>
        );
      });
  };

  // Inline markdown: **bold**, `code`
  const renderInlineMarkdown = (text) => {
    const parts = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-bold text-slate-950">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[11px] font-semibold border border-indigo-100"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* FLOATING LAUNCHER BUTTON                                                  */}
      {/* ========================================================================= */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          {/* Pulsing Hint Pill */}
          <div
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-white text-slate-800 text-xs font-bold shadow-lg shadow-indigo-500/10 border border-indigo-100 hover:border-indigo-300 cursor-pointer transition-all hover:scale-105 group"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-700">Need Help? <strong className="text-primary-600 font-extrabold">Ask BrightCare AI</strong></span>
          </div>

          {/* Trigger Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="relative w-14 h-14 rounded-full bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-700 text-white shadow-xl shadow-primary-600/35 hover:shadow-primary-600/50 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-primary-500/30"
            aria-label="Open BrightCare Customer Support Chat"
          >
            <Bot className="w-7 h-7 text-white group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>

            {unreadCount > 0 && (
              <span className="absolute -top-2 -left-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950 shadow-sm animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHATBOT WINDOW DIALOG                                                     */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 w-[94vw] sm:w-[410px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-300 font-['Plus_Jakarta_Sans',sans-serif] ${
            isMinimized ? 'h-16' : 'h-[620px] max-h-[88vh]'
          }`}
        >
          {/* HEADER */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-primary-950 text-white p-4 flex items-center justify-between shadow-md relative">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-500 flex items-center justify-center text-white shadow-inner">
                  <Bot className="w-6 h-6" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm tracking-tight text-white font-['Outfit']">
                    BrightCare AI
                  </h3>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary-500/30 text-primary-200 border border-primary-400/30">
                    24/7 Support
                  </span>
                </div>
                <p className="text-[11px] text-indigo-200/80 flex items-center gap-1">
                  <span>Customer Care & Site Enquiries</span>
                </p>
              </div>
            </div>

            {/* Header Control Icons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title={soundEnabled ? 'Mute audio feedback' : 'Unmute audio feedback'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>

              <button
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Restart conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MAIN BODY (When not minimized) */}
          {!isMinimized && (
            <>
              {/* MESSAGES FEED */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
                {messages.map((msg, idx) => {
                  const isBot = msg.sender === 'bot';

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-end gap-2 max-w-[88%]">
                        {isBot && (
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mb-1 shadow-xs">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-xs relative group ${
                            isBot
                              ? 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                              : 'bg-primary-600 text-white rounded-br-xs'
                          }`}
                        >
                          {/* Message Content */}
                          {isBot ? (
                            <div className="space-y-1">{formatMarkdown(msg.text)}</div>
                          ) : (
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          )}

                          {/* Interactive Data Card for Subscriptions */}
                          {isBot && msg.dataCard && msg.dataCard.type === 'subscriptions_summary' && (
                            <div className="mt-3 p-3 rounded-xl bg-slate-900 text-white shadow-md border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold font-['Outfit'] text-indigo-300">
                                  <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Active Subscriptions ({msg.dataCard.subscriptions?.length || 0})</span>
                                </div>
                                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/40">
                                  ${Number(msg.dataCard.totalMonthly || 0).toFixed(2)} / mo
                                </span>
                              </div>

                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                                {msg.dataCard.subscriptions?.map((sub, sIdx) => (
                                  <div key={sIdx} className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-[11px]">
                                    <div>
                                      <div className="flex items-center gap-1.5 font-bold text-white">
                                        <span>{sub.plan_name}</span>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 font-mono">
                                          {sub.number}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                        <span>${Number(sub.recurring_amount || 0).toFixed(2)} / {sub.billing_period}</span>
                                        <span>•</span>
                                        <span>Seats: {sub.quantity || 1}</span>
                                      </div>
                                    </div>
                                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                      sub.status === 'active' ? 'bg-emerald-900/60 text-emerald-300' :
                                      sub.status === 'confirmed' ? 'bg-blue-900/60 text-blue-300' :
                                      sub.status === 'paused' ? 'bg-amber-900/60 text-amber-300' : 'bg-slate-700 text-slate-300'
                                    }`}>
                                      {sub.status}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <button
                                onClick={() => handleActionClick('navigate_subscriptions')}
                                className="w-full mt-1 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1 transition-all"
                              >
                                <span>Manage in Subscriptions Tab</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Interactive Data Card for Invoices */}
                          {isBot && msg.dataCard && msg.dataCard.type === 'invoices_summary' && (
                            <div className="mt-3 p-3 rounded-xl bg-slate-900 text-white shadow-md border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold font-['Outfit'] text-indigo-300">
                                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Invoices & Balance</span>
                                </div>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  (msg.dataCard.totalBalanceDue || 0) > 0
                                    ? 'text-amber-400 bg-amber-950/80 border-amber-800/40'
                                    : 'text-emerald-400 bg-emerald-950/80 border-emerald-800/40'
                                }`}>
                                  {(msg.dataCard.totalBalanceDue || 0) > 0 ? `Due: $${Number(msg.dataCard.totalBalanceDue).toFixed(2)}` : 'All Settled $0.00'}
                                </span>
                              </div>

                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                                {msg.dataCard.invoices?.map((inv, iIdx) => (
                                  <div key={iIdx} className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-[11px]">
                                    <div>
                                      <div className="flex items-center gap-1.5 font-bold text-white">
                                        <span>{inv.number}</span>
                                        <span className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${
                                          inv.status === 'paid' ? 'bg-emerald-900/60 text-emerald-300' :
                                          inv.status === 'confirmed' ? 'bg-amber-900/60 text-amber-300' : 'bg-slate-700 text-slate-300'
                                        }`}>
                                          {inv.status}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                        <span>Due: {inv.dueDate || 'N/A'}</span>
                                        <span>•</span>
                                        <span className="font-bold text-white">Total: ${Number(inv.total || 0).toFixed(2)}</span>
                                      </div>
                                    </div>

                                    {inv.remaining > 0 ? (
                                      <button
                                        onClick={() => handleActionClick({ action: 'pay_invoice', invoiceId: inv.id, amount: inv.remaining })}
                                        className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-extrabold shadow-xs transition-all"
                                      >
                                        Pay ${Number(inv.remaining).toFixed(2)}
                                      </button>
                                    ) : (
                                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                                        <CheckCircle2 className="w-3 h-3" /> Paid
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <button
                                onClick={() => handleActionClick('navigate_invoices')}
                                className="w-full mt-1 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1 transition-all"
                              >
                                <span>View Invoices in Portal</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Interactive Action Buttons */}
                          {isBot && msg.quickActions && msg.quickActions.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                              {msg.quickActions.map((qa, qIdx) => (
                                <button
                                  key={qIdx}
                                  onClick={() => handleActionClick(qa)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200/60 transition-all hover:scale-105 active:scale-95"
                                >
                                  <span>{qa.label}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Quick Follow-up Question Chips */}
                          {isBot && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Questions</p>
                              <div className="flex flex-wrap gap-1">
                                {msg.suggestedQuestions.map((sq, sqIdx) => (
                                  <button
                                    key={sqIdx}
                                    onClick={() => handleSendMessage(sq)}
                                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-medium transition-colors text-left"
                                  >
                                    💬 {sq}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Copy icon on hover for bot messages */}
                          {isBot && (
                            <button
                              onClick={() => handleCopyMessage(msg.text, idx)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                              title="Copy answer"
                            >
                              {copiedIndex === idx ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {!isBot && (
                          <div className="w-7 h-7 rounded-xl bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0 mb-1">
                            {user?.name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 mt-1 px-9">
                        {msg.timestamp}
                      </span>
                    </div>
                  );
                })}

                {/* TYPING INDICATOR */}
                {isTyping && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      <Bot className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-xs px-3.5 py-2.5 flex items-center gap-1.5 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium">BrightCare is checking...</span>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* TICKET SUBMISSION DRAWER / MODAL INSIDE CHAT */}
              {isTicketModalOpen && (
                <div className="p-3 bg-white border-t border-slate-200 shadow-inner">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-['Outfit']">
                      <Ticket className="w-4 h-4 text-primary-600" />
                      <span>Submit Customer Care Ticket</span>
                    </div>
                    <button
                      onClick={() => setIsTicketModalOpen(false)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitTicket} className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Subject</label>
                      <input
                        type="text"
                        required
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        placeholder="e.g. Invoice tax question or Plan pause assistance"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Category</label>
                        <select
                          value={ticketCategory}
                          onChange={(e) => setTicketCategory(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                        >
                          <option value="enquiry">General Enquiry</option>
                          <option value="billing">Billing & Invoices</option>
                          <option value="subscription">Subscriptions & Plans</option>
                          <option value="technical">Technical / Connector</option>
                          <option value="account">Account Access</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                        <select
                          value={ticketPriority}
                          onChange={(e) => setTicketPriority(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                        >
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Enquiry Details</label>
                      <textarea
                        required
                        rows={2}
                        value={ticketDetails}
                        onChange={(e) => setTicketDetails(e.target.value)}
                        placeholder="Please describe how our customer care team can help you..."
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsTicketModalOpen(false)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingTicket}
                        className="px-3 py-1 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-xs disabled:opacity-50"
                      >
                        {submittingTicket ? 'Submitting...' : 'Send to Customer Care'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* INPUT BAR */}
              <div className="p-3 bg-white border-t border-slate-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about billing, subscriptions, or site support..."
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all placeholder:text-slate-400 bg-slate-50/50"
                  />

                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isTyping}
                    className="w-9 h-9 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-primary-500/20 hover:shadow-primary-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform active:scale-95 shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                {/* Subtext info */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
                  <span>Brightloop Customer Support Engine</span>
                  <button
                    onClick={() => setIsTicketModalOpen(true)}
                    className="text-primary-600 hover:underline font-bold"
                  >
                    + Open Support Ticket
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
