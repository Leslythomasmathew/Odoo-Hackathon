import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './db/database.js';
import { seedData } from './db/seed.js';
import { seedSupportData } from './db/seedSupport.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import customerRoutes from './routes/customers.js';
import productRoutes from './routes/products.js';
import planRoutes from './routes/plans.js';
import quotationTemplateRoutes from './routes/quotationTemplates.js';
import subscriptionRoutes from './routes/subscriptions.js';
import invoiceRoutes from './routes/invoices.js';
import billingRoutes from './routes/billing.js';
import discountRoutes from './routes/discounts.js';
import taxRoutes from './routes/taxes.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';
import systemRoutes from './routes/system.js';
import supportRoutes from './routes/support.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB and ensure seed data exists
initDatabase();
seedData(false);
seedSupportData();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/quotation-templates', quotationTemplateRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/support', supportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Brightloop Subscription Management System',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build if exists
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

const isMainModule = process.argv[1] && process.argv[1].endsWith('server.js');
if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`Brightloop Subscription System API running on http://localhost:${PORT}`);
  });
}

export default app;
