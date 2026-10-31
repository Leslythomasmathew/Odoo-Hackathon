// pdfService.js - Professional Branded Invoice & Receipt PDF Generator using jsPDF
import { jsPDF } from 'jspdf';

export const pdfService = {
  generateInvoicePdf(invoice, customer = {}) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const client = {
      name: customer.name || invoice.customer_name || 'Valued Customer',
      company: customer.company || invoice.customer_company || 'Client Organization',
      email: customer.email || invoice.customer_email || '',
      address: customer.billing_address || invoice.customer_address || 'Address on file',
      vatNumber: customer.vat_number || invoice.vat_number || 'US-934810291'
    };

    // Color Palette
    const primaryColor = [15, 23, 42];    // Slate 900
    const textColor = [51, 65, 85];       // Slate 700
    const lightBg = [248, 250, 252];      // Slate 50
    const emeraldColor = [16, 185, 129];  // Green 500
    const amberColor = [245, 158, 11];    // Amber 500

    // Header Background Accent Bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 32, 'F');

    // Brand Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('BRIGHTLOOP', 15, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(186, 230, 253);
    doc.text('SOFTWARE SUBSCRIPTION PLATFORM', 15, 25);

    // Invoice Title on Top Right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('TAX INVOICE', 195, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(invoice.number || invoice.id || 'INV-2026', 195, 25, { align: 'right' });

    // Status Banner Bar
    let startY = 42;
    const isPaid = invoice.status === 'paid' || (invoice.outstanding === 0 && Number(invoice.total) > 0);
    if (isPaid) {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(...emeraldColor);
      doc.roundedRect(15, startY, 180, 10, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...emeraldColor);
      doc.text(`PAID IN FULL - Cleared Electronic Settlement (Ref: ${invoice.number || 'SETTLED'})`, 20, startY + 6.5);
    } else {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(...amberColor);
      doc.roundedRect(15, startY, 180, 10, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...amberColor);
      doc.text(`OUTSTANDING - Payment Due by ${invoice.due_date || 'Due Immediately'}`, 20, startY + 6.5);
    }

    // Two Column Metadata: Issuer & Bill To
    startY = 60;

    // Left Column: Billed To
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('BILLED TO:', 15, startY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(client.company || client.name, 15, startY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text(`Attn: ${client.name}`, 15, startY + 11);
    doc.text(client.email, 15, startY + 16);
    doc.text(client.address, 15, startY + 21);
    if (client.vatNumber) {
      doc.text(`Tax ID: ${client.vatNumber}`, 15, startY + 26);
    }

    // Right Column: Issuer Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('ISSUED BY:', 125, startY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text('Brightloop Software Ltd.', 125, startY + 6);
    doc.text('100 Cyber Tower, Boston, MA 02110', 125, startY + 11);
    doc.text('VAT ID: US-100293847 | billing@brightloop.com', 125, startY + 16);

    doc.setFont('helvetica', 'bold');
    doc.text('Issue Date:', 125, startY + 23);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.issue_date || invoice.billing_period_start || new Date().toISOString().split('T')[0], 160, startY + 23);

    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', 125, startY + 28);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.due_date || 'Immediate', 160, startY + 28);

    doc.setFont('helvetica', 'bold');
    doc.text('Contract:', 125, startY + 33);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.subscription_number || 'Direct Recurring', 160, startY + 33);

    // Line Items Table Header
    let tableY = startY + 45;
    doc.setFillColor(...primaryColor);
    doc.rect(15, tableY, 180, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('DESCRIPTION', 18, tableY + 5.5);
    doc.text('QTY', 125, tableY + 5.5, { align: 'center' });
    doc.text('UNIT PRICE', 155, tableY + 5.5, { align: 'right' });
    doc.text('AMOUNT', 190, tableY + 5.5, { align: 'right' });

    let currentY = tableY + 8;

    // Product Line Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);

    const productLines = invoice.lines && invoice.lines.length > 0
      ? invoice.lines
      : [{ product_name: invoice.plan_name || 'Brightloop Enterprise Cloud Suite', quantity: 1, unit_price: invoice.subtotal || invoice.total, amount: invoice.subtotal || invoice.total }];

    productLines.forEach((line, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(...lightBg);
        doc.rect(15, currentY, 180, 8, 'F');
      }

      const desc = line.product_name + (line.variant_value ? ` (${line.variant_value})` : '');
      doc.text(desc, 18, currentY + 5.5);
      doc.text(String(line.quantity || 1), 125, currentY + 5.5, { align: 'center' });
      doc.text(`$${Number(line.unit_price || line.amount).toFixed(2)}`, 155, currentY + 5.5, { align: 'right' });
      doc.text(`$${Number(line.amount).toFixed(2)}`, 190, currentY + 5.5, { align: 'right' });

      currentY += 8;
    });

    // Discount deduction if exists
    const discountAmount = Number(invoice.discount_amount || invoice.discountTotal || 0);
    if (discountAmount > 0) {
      doc.setFillColor(240, 253, 244);
      doc.rect(15, currentY, 180, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52);
      doc.text('[AUTO DISCOUNT] Volume & Ecosystem Incentive', 18, currentY + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.text('1', 125, currentY + 5.5, { align: 'center' });
      doc.text(`-$${discountAmount.toFixed(2)}`, 155, currentY + 5.5, { align: 'right' });
      doc.text(`-$${discountAmount.toFixed(2)}`, 190, currentY + 5.5, { align: 'right' });

      currentY += 8;
    }

    // Divider Line
    doc.setDrawColor(203, 213, 225);
    doc.line(15, currentY + 2, 195, currentY + 2);
    currentY += 6;

    // Totals Calculation Block
    const totalsX = 135;
    const valuesX = 190;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);

    const subtotal = Number(invoice.subtotal || invoice.total);
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`$${subtotal.toFixed(2)}`, valuesX, currentY, { align: 'right' });
    currentY += 6;

    if (discountAmount > 0) {
      doc.setTextColor(22, 101, 52);
      doc.text('Discounts Applied:', totalsX, currentY);
      doc.text(`-$${discountAmount.toFixed(2)}`, valuesX, currentY, { align: 'right' });
      currentY += 6;
      doc.setTextColor(...textColor);
    }

    const tax = Number(invoice.tax_amount || invoice.tax || 0);
    if (tax > 0) {
      doc.text('Estimated VAT/Tax:', totalsX, currentY);
      doc.text(`$${tax.toFixed(2)}`, valuesX, currentY, { align: 'right' });
      currentY += 7;
    }

    // Final Total Box
    doc.setFillColor(...primaryColor);
    doc.roundedRect(totalsX - 5, currentY - 4, 65, 12, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL DUE:', totalsX, currentY + 4);
    doc.text(`$${Number(invoice.total).toFixed(2)}`, valuesX, currentY + 4, { align: 'right' });

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Thank you for choosing Brightloop Software. Subscriptions automatically renew according to selected plan policy.', 105, 280, { align: 'center' });
    doc.text('For questions regarding this invoice, contact billing@brightloop.com or manage subscriptions directly from your portal.', 105, 285, { align: 'center' });

    return doc;
  },

  downloadInvoicePdf(invoice, customer) {
    const doc = this.generateInvoicePdf(invoice, customer);
    doc.save(`Brightloop_Invoice_${invoice.number || invoice.id}.pdf`);
  }
};
