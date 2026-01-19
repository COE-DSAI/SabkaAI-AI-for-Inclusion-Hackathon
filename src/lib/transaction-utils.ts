import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a "banking-grade" transaction ID.
 * Format: GS-XXXX-XXXX-XXXX where X is an uppercase alphanumeric character.
 */
export function generateBankingTransactionId(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const segment = () => {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  };
  
  return `GS-${segment()}-${segment()}-${segment()}`;
}

/**
 * Formats a timestamp into a professional date/time string.
 */
export function formatTransactionDateTime(date: Date | string | number, lang: string = 'en'): { date: string, time: string } {
  const d = new Date(date);
  return {
    date: d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }),
    time: d.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };
}

/**
 * Generates and downloads a professional PDF receipt for a transaction.
 */
export function generateReceiptPDF(transaction: any, lang: string = 'en') {
  const doc = new jsPDF();
  const txnIdDisplay = transaction.transactionId || (transaction.id ? `GS-${transaction.id.substring(0, 12).toUpperCase()}` : 'GS-TXN-TEMP');
  const { date, time } = formatTransactionDateTime(transaction.timestamp || transaction.date?.toDate?.() || new Date(), lang);
  
  // Colors
  const primaryColor = [13, 41, 34]; // #0d2922
  const secondaryColor = [200, 224, 56]; // #c8e038
  
  // Header Box
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Logo / App Name
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('GRAMIN SAATHI', 20, 25);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Digital Empowerment for Farmers', 20, 32);
  
  // Receipt Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(lang === 'hi' ? 'लेनदेन की रसीद' : 'TRANSACTION RECEIPT', 105, 55, { align: 'center' });
  
  // Horizontal Line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 60, 190, 60);
  
  // Transaction Details Table
  const tableData = [
    [lang === 'hi' ? 'लेनदेन ID' : 'Transaction ID', txnIdDisplay],
    [lang === 'hi' ? 'तारीख' : 'Date', date],
    [lang === 'hi' ? 'समय' : 'Time', time],
    [lang === 'hi' ? 'विवरण' : 'Description', transaction.description],
    [lang === 'hi' ? 'भुगतान विधि' : 'Payment Method', transaction.paymentMethod?.toUpperCase() || 'N/A'],
    [lang === 'hi' ? 'स्थिति' : 'Status', transaction.status?.toUpperCase() || 'SUCCESS'],
    [lang === 'hi' ? 'से' : 'From', transaction.from || 'User Wallet'],
    [lang === 'hi' ? 'को' : 'To', transaction.to || 'Gramin Saathi'],
  ];
  
  autoTable(doc, {
    startY: 70,
    head: [[lang === 'hi' ? 'विवरण' : 'FIELD', lang === 'hi' ? 'जानकारी' : 'VALUE']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor as any, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });
  
  // Amount Section
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, finalY, 170, 20, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(lang === 'hi' ? 'कुल राशि:' : 'Amount:', 30, finalY + 13);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${lang === 'hi' ? 'Rs.' : 'INR'} ${transaction.amount?.toLocaleString('en-IN') || '0'}.00`, 180, finalY + 13, { align: 'right' });
  
  // Footer / Verification
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  doc.text(
    lang === 'hi' 
      ? 'यह एक कंप्यूटर द्वारा जनरेट की गई रसीद है और इसमें हस्ताक्षर की आवश्यकता नहीं है।' 
      : 'This is a computer-generated receipt and does not require a signature.',
    105, 280, { align: 'center' }
  );
  
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('graminsaathi.netlify.app', 105, 285, { align: 'center' });
  
  // Save PDF
  doc.save(`Receipt_${txnIdDisplay}.pdf`);
}
