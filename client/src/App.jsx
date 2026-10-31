import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BillingRunModal } from './components/BillingRunModal';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

import { Dashboard } from './pages/Dashboard';
import { Subscriptions } from './pages/Subscriptions';
import { SubscriptionDetail } from './pages/SubscriptionDetail';
import { Invoices } from './pages/Invoices';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { Payments } from './pages/Payments';
import { Customers } from './pages/Customers';
import { Products } from './pages/Products';
import { Plans } from './pages/Plans';
import { QuotationTemplates } from './pages/QuotationTemplates';
import { Discounts } from './pages/Discounts';
import { Taxes } from './pages/Taxes';
import { StaffManagement } from './pages/StaffManagement';
import { Reports } from './pages/Reports';
import { CustomerPortal } from './pages/CustomerPortal';
import { SubscriptionUsageTracking } from './pages/SubscriptionUsageTracking';
import { SystemBenchmark } from './pages/SystemBenchmark';
import { CommunicationSettings } from './pages/CommunicationSettings';

// Protected App Shell Layout
function ProtectedLayout() {
  const { user, loading, isCustomer } = useAuth();
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If customer accesses admin root, redirect to customer portal
  if (isCustomer && location.pathname === '/') {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar onOpenBillingRun={() => setBillingModalOpen(true)} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard onOpenBillingRun={() => setBillingModalOpen(true)} />} />
            <Route path="/portal" element={<CustomerPortal />} />
            <Route path="/usage" element={<SubscriptionUsageTracking />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
            <Route path="/invoices" element={<Invoices onOpenBillingRun={() => setBillingModalOpen(true)} />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/quotation-templates" element={<QuotationTemplates />} />
            <Route path="/discounts" element={<Discounts />} />
            <Route path="/taxes" element={<Taxes />} />
            <Route path="/staff" element={<StaffManagement />} />
            <Route path="/communication-settings" element={<CommunicationSettings />} />
            <Route path="/settings/communication" element={<CommunicationSettings />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/system" element={<SystemBenchmark />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Billing Runner Modal */}
      <BillingRunModal
        isOpen={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
        onCompleted={() => {
          // Refresh window or state when completed
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
