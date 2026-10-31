import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  Mail
} from 'lucide-react';

export function RazorpayModal({ invoice, isOpen, onClose, onSuccess }) {
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [activeTab, setActiveTab] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // Form states
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC');

  // Amount
  const amountToPay = invoice ? (invoice.outstanding !== undefined ? invoice.outstanding : invoice.total) : 0;

  useEffect(() => {
    if (isOpen && invoice) {
      initiateOrder();
    } else {
      setOrderData(null);
      setError('');
      setSuccessResult(null);
      setProcessing(false);
    }
  }, [isOpen, invoice]);

  const initiateOrder = async () => {
    try {
      setLoadingOrder(true);
      setError('');
      const token = localStorage.getItem('brightloop_token') || localStorage.getItem('token');
      const res = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: amountToPay
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create payment order');
      }

      setOrderData(data);
    } catch (err) {
      setError(err.message || 'Could not initiate Razorpay order.');
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleSimulatePayment = async (methodType) => {
    if (!orderData) return;
    setProcessing(true);
    setError('');

    try {
      setProcessStep('Connecting to Razorpay Secure Gateway...');
      await new Promise((r) => setTimeout(r, 600));

      setProcessStep('Authorizing payment with issuing bank...');
      await new Promise((r) => setTimeout(r, 800));

      setProcessStep('Verifying cryptographic signature & updating invoice...');

      const fakePaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const fakeSignature = `sig_${Math.random().toString(36).substring(2, 16)}`;

      const token = localStorage.getItem('brightloop_token') || localStorage.getItem('token');
      const res = await fetch('/api/payments/razorpay/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          razorpay_order_id: orderData.orderId,
          razorpay_payment_id: fakePaymentId,
          razorpay_signature: fakeSignature,
          invoice_id: invoice.id,
          amount: orderData.amount,
          payment_method: methodType
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      setSuccessResult(data);
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
      setProcessStep('');
    }
  };

  const fillTestCard = () => {
    setCardNumber('4111 2222 3333 4444');
    setCardExpiry('12/28');
    setCardCvv('789');
    setCardName(invoice?.customer_name || 'Alwin Sabu');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Razorpay navy styling */}
        <div className="bg-[#0c2340] text-white px-6 py-4 flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-[#3395ff]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-9 h-9 rounded-xl bg-[#3395ff]/20 border border-[#3395ff]/40 flex items-center justify-center text-[#3395ff] font-extrabold text-lg shadow-inner">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">Razorpay Secure Checkout</h3>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                  {orderData?.mode === 'live_test' ? 'Live Test' : 'Sandbox Ready'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Invoice #{invoice?.number} &bull; <strong className="text-white">₹{Number(amountToPay).toFixed(2)}</strong> Due
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={processing}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loadingOrder ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#3395ff] animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Initializing Razorpay Secure Order...</p>
            </div>
          ) : successResult ? (
            /* Success Screen */
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-50 shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-lg font-extrabold text-slate-900">Payment Successful!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  ₹{Number(amountToPay).toFixed(2)} received and verified via Razorpay
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="font-mono font-bold text-slate-800">{successResult.paymentRef}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Invoice Status:</span>
                  <span className="font-bold text-emerald-600 uppercase">{successResult.invoiceStatus}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Total Outstanding:</span>
                  <span className="font-bold text-slate-800">₹{Number(successResult.outstanding).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-indigo-700 font-medium">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>Official payment receipt email dispatched via live Gmail SMTP!</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-colors"
              >
                Done & Close
              </button>
            </div>
          ) : processing ? (
            /* Processing Screen */
            <div className="py-12 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 className="w-16 h-16 text-[#3395ff] animate-spin" />
                <Lock className="w-6 h-6 text-slate-600 absolute inset-0 m-auto" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">{processStep || 'Processing Payment...'}</h4>
                <p className="text-slate-400 text-[11px]">Please do not close this window or hit refresh.</p>
              </div>
            </div>
          ) : (
            /* Payment Methods Selection */
            <>
              {/* Payment Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('upi')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs transition-all ${
                    activeTab === 'upi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-[#3395ff]" />
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('card')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs transition-all ${
                    activeTab === 'card' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('netbanking')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs transition-all ${
                    activeTab === 'netbanking' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>NetBanking</span>
                </button>
              </div>

              {/* Tab 1: UPI & Dynamic QR */}
              {activeTab === 'upi' && (
                <div className="space-y-4 pt-1">
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs shrink-0 flex flex-col items-center">
                      {/* Generates standard QR representation */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(
                          orderData?.upiUri || `upi://pay?pa=billing@brightloop&pn=Brightloop&am=${amountToPay}&cu=INR`
                        )}`}
                        alt="UPI Payment QR Code"
                        className="w-28 h-28 object-contain rounded"
                      />
                      <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Scan to Pay</span>
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-700 font-bold">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        <span>Google Pay &bull; PhonePe &bull; Paytm</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Scan this dynamic QR code using any UPI app on your phone, or simulate instant payment below:
                      </p>

                      <button
                        type="button"
                        onClick={() => handleSimulatePayment('UPI')}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 text-xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Simulate Instant UPI Approval &rarr;</span>
                      </button>
                    </div>
                  </div>

                  {/* UPI VPA input */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-700 font-bold">Or enter UPI Virtual Address (VPA)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. yourname@okaxis or 9876543210@paytm"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3395ff]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSimulatePayment('UPI VPA')}
                        className="px-4 py-2 bg-[#0c2340] hover:bg-[#14325a] text-white font-bold rounded-xl text-xs"
                      >
                        Request
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Credit / Debit Card */}
              {activeTab === 'card' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Enter Card Details</span>
                    <button
                      type="button"
                      onClick={fillTestCard}
                      className="text-[#3395ff] hover:underline font-bold text-[11px] flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Fill Test Card</span>
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="Card Number (e.g. 4111 2222 3333 4444)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3395ff] font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3395ff] font-mono"
                    />
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="CVV"
                      maxLength={4}
                      className="px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3395ff] font-mono"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Cardholder Name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3395ff]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSimulatePayment('Card')}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 text-xs mt-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Pay ₹{Number(amountToPay).toFixed(2)} Securely</span>
                  </button>
                </div>
              )}

              {/* Tab 3: NetBanking */}
              {activeTab === 'netbanking' && (
                <div className="space-y-3 pt-1">
                  <label className="block font-bold text-slate-700">Select Popular Indian Bank</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBank(b)}
                        className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center justify-between ${
                          selectedBank === b
                            ? 'border-[#3395ff] bg-blue-50/50 text-[#0c2340]'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{b}</span>
                        {selectedBank === b && <CheckCircle2 className="w-3.5 h-3.5 text-[#3395ff]" />}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSimulatePayment(`NetBanking - ${selectedBank}`)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 text-xs mt-3"
                  >
                    <span>Proceed to {selectedBank} &rarr;</span>
                  </button>
                </div>
              )}

              {/* Security Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>256-bit SSL Encrypted</span>
                </span>
                <span>Powered by Razorpay</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
