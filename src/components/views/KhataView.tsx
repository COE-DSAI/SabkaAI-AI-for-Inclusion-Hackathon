import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { secureAddDoc } from '../../lib/secure-storage';
import { decryptData } from '../../lib/encryption';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  QrCode,
  Scan,
  Send,
  Download,
  X,
  Loader2,
  IndianRupee,
  Copy,
  Check,
  CreditCard,
  Smartphone
} from 'lucide-react';
import { db } from '../../lib/firebase-config';
import { initiateRazorpayPayment, formatCurrency, QUICK_AMOUNTS } from '../../lib/razorpay-client';
import { generatePaymentQR, parseUPIString, isValidUPIId } from '../../lib/upi-utils';
import { Html5Qrcode } from 'html5-qrcode';
import { generateBankingTransactionId, generateReceiptPDF } from '../../lib/transaction-utils';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense' | 'payment_sent' | 'payment_received';
  description: string;
  paymentMethod: 'cash' | 'upi' | 'razorpay' | 'qr_payment';
  date: any;
  displayDate: string;
  displayTime?: string;
  transactionId?: string;
  orderId?: string;
  timestamp?: string;
  status?: string;
  from?: string;
  to?: string;
  category?: string;
  verified?: boolean;
  upiTransactionId?: string;
  razorpayPaymentId?: string;
}

export function KhataView({ user, appId, t, lang, voiceAction }: any) {
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  
  // Modal states
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showReceiveQR, setShowReceiveQR] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);
  const [showUpiSetup, setShowUpiSetup] = useState(false);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrCodeImage, setQRCodeImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // QR Scanner
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  // Handle voice commands
  useEffect(() => {
    if (!voiceAction) return;
    
    console.log('Voice action received:', voiceAction);
    
    if (voiceAction.type === 'add') {
      setAmount(voiceAction.amount?.toString() || '');
      setShowAddMoney(true);
    } else if (voiceAction.type === 'send') {
      setAmount(voiceAction.amount?.toString() || '');
      setShowSendMoney(true);
    } else if (voiceAction.type === 'receive') {
      setShowReceiveQR(false); // Close first if open
      setTimeout(() => handleGenerateQR(), 100);
    }
  }, [voiceAction]);
  
  // Load user's UPI ID from profile and check if setup needed
  useEffect(() => {
    if (!user) return;
    
    const loadProfile = async () => {
      try {
        const profileDoc = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          const userUpiId = data.upiId || '';
          setUpiId(userUpiId);
          
          // Show setup modal if UPI ID not configured
          if (!userUpiId) {
            setShowUpiSetup(true);
          }
        } else {
          // New user - show setup
          setShowUpiSetup(true);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    
    loadProfile();
  }, [user, appId]);
  
  // Load transactions and calculate balance
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'khata'),
      orderBy('date', 'desc')
    );
    
    const unsub = onSnapshot(q, async (snapshot) => {
      // Decrypt transactions
      const txns = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // Decrypt amount if encrypted
          let amount = data.amount;
          if (data.amount_isEncrypted && data.amount_encrypted) {
            try {
              amount = await decryptData(data.amount_encrypted);
              // Convert to number if it's a string
              amount = typeof amount === 'string' ? parseFloat(amount) : amount;
            } catch (error) {
              console.error('Failed to decrypt amount:', error);
              amount = 0;
            }
          }
          
          return {
            id: docSnap.id,
            ...data,
            amount // Use decrypted amount
          };
        })
      ) as Transaction[];
      
      // Sort by timestamp (most recent first) - client-side backup
      txns.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA; // Descending order
      });
      
      setTransactions(txns);
      
      // Calculate totals with null safety
      let income = 0;
      let expense = 0;
      
      txns.forEach(txn => {
        const amount = txn.amount || 0; // Handle undefined amounts
        
        if (txn.type === 'income' || txn.type === 'payment_received') {
          income += amount;
        } else if (txn.type === 'expense' || txn.type === 'payment_sent') {
          expense += amount;
        }
      });
      
      setTotalIncome(income);
      setTotalExpense(expense);
      setBalance(income - expense);
    });
    
    return () => unsub();
  }, [user, appId]);
  
  // Handle add money via Razorpay
  const handleAddMoney = async (amt: number) => {
    if (!user) return;
    
    console.log('🔵 handleAddMoney called with amount:', amt);
    
    if (!amt || amt <= 0) {
      alert(lang === 'en' ? 'Please enter a valid amount' : 'कृपया मान्य राशि दर्ज करें');
      return;
    }
    
    setLoading(true);
    
    try {
      await initiateRazorpayPayment(
        amt,
        'Add money to wallet',
        async (response) => {
          console.log('🟢 Payment successful! Amount:', amt, 'Response:', response);
          
          // Payment successful - add comprehensive transaction with GPay-level details
          const now = new Date();
          const transactionData = {
            // Basic details
            amount: Number(amt), // Explicitly convert to number
            type: 'income' as const,
            description: 'Wallet top-up via Razorpay',
            
            // GPay-level transaction details
            transactionId: generateBankingTransactionId(),
            razorpayPaymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id || null,
            timestamp: now.toISOString(),
            displayDate: now.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN'),
            displayTime: now.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-IN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            
            // Payment details
            paymentMethod: 'razorpay' as const,
            paymentGateway: 'Razorpay',
            status: 'success',
            
            // From/To information
            from: user.displayName || 'User Bank Account',
            to: 'Gramin Saathi Wallet',
            
            // Metadata
            category: 'wallet_topup',
            verified: true,
            
            // Firebase timestamp
            date: serverTimestamp()
          };
          
          console.log('💾 Saving transaction to Firebase:', transactionData);
          
          await secureAddDoc(
            collection(db, 'artifacts', appId, 'users', user.uid, 'khata'), 
            transactionData
          );
          
          setShowAddMoney(false);
          setAmount('');
          alert(lang === 'en' 
            ? `✅ ₹${amt} added successfully!\nTransaction ID: ${response.razorpay_payment_id}` 
            : `✅ ₹${amt} सफलतापूर्वक जोड़े गए!\nलेनदेन ID: ${response.razorpay_payment_id}`
          );
        },
        () => {
          // Payment failed
          alert(lang === 'en' ? 'Payment cancelled or failed' : 'भुगतान रद्द या विफल');
        }
      );
    } catch (error) {
      console.error('❌ Payment error:', error);
      alert(lang === 'en' ? 'Payment failed. Please try again.' : 'भुगतान विफल। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate QR for receiving payment
  const handleGenerateQR = async () => {
    if (!upiId || !isValidUPIId(upiId)) {
      alert(lang === 'en' ? 'Please enter a valid UPI ID (e.g., yourname@paytm)' : 'कृपया एक मान्य UPI ID दर्ज करें');
      return;
    }
    
    setLoading(true);
    
    try {
      const amt = amount ? parseFloat(amount) : undefined;
      const qr = await generatePaymentQR(
        upiId,
        user?.displayName || 'Farmer',
        amt,
        description || 'Payment'
      );
      
      setQRCodeImage(qr);
      setShowReceiveQR(true);
    } catch (error) {
      console.error('QR generation error:', error);
      alert(lang === 'en' ? 'Failed to generate QR code' : 'QR कोड बनाने में विफल');
    } finally {
      setLoading(false);
    }
  };
  
  // Start QR scanner
  const startQRScanner = async () => {
    setScannerActive(true);
    
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // QR Code scanned successfully
          handleQRScanned(decodedText);
        },
        (errorMessage) => {
          // Scanning error (ignore)
        }
      );
    } catch (error) {
      console.error('Scanner error:', error);
      alert(lang === 'en' ? 'Camera access denied or not available' : 'कैमरा एक्सेस अस्वीकृत या उपलब्ध नहीं');
      setScannerActive(false);
    }
  };
  
  // Stop QR scanner
  const stopQRScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setScannerActive(false);
  };
  
  // Handle scanned QR code
  const handleQRScanned = async (qrData: string) => {
    await stopQRScanner();
    
    const parsed = parseUPIString(qrData);
    
    if (!parsed) {
      alert(lang === 'en' ? 'Invalid payment QR code' : 'अमान्य भुगतान QR कोड');
      return;
    }
    
    // Show payment confirmation
    setUpiId(parsed.upiId);
    setAmount(parsed.amount?.toString() || '');
    setDescription(parsed.note || '');
    setShowScanQR(false);
    setShowSendMoney(true);
  };
  
  // Send money (UPI payment)
  const handleSendMoney = () => {
    if (!amount || !upiId || !isValidUPIId(upiId)) {
      alert(lang === 'en' ? 'Please enter valid details' : 'कृपया मान्य विवरण दर्ज करें');
      return;
    }
    
    // Generate UPI intent string
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(description || 'Payment')}&am=${amount}&cu=INR`;
    
    // Open UPI app
    window.location.href = upiString;
    
    // After attempting payment, confirm with user
    setTimeout(async () => {
      if (confirm(lang === 'en' ? 'Did payment complete successfully?' : 'क्या भुगतान सफलतापूर्वक पूरा हुआ?')) {
        try {
          const now = new Date();
          await secureAddDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'khata'), {
            // Basic details
            amount: parseFloat(amount),
            type: 'payment_sent',
            description: description || `Paid to ${upiId}`,
            
            // GPay-level transaction details
            transactionId: generateBankingTransactionId(),
            upiTransactionId: `UPI_SENT_${Date.now()}`,
            timestamp: now.toISOString(),
            displayDate: now.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN'),
            displayTime: now.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-IN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            
            // Payment details
            paymentMethod: 'upi',
            status: 'success',
            
            // From/To information
            from: user.displayName || 'Me',
            to: upiId,
            
            // Metadata
            category: 'payment',
            verified: false,
            
            // Firebase timestamp
            date: serverTimestamp()
          });
          
          setShowSendMoney(false);
          setAmount('');
          setDescription('');
          setUpiId('');
          
          alert(lang === 'en' 
            ? '✅ Payment recorded successfully!' 
            : '✅ भुगतान सफलतापूर्वक रिकॉर्ड किया गया!');
        } catch (error) {
          console.error('Error recording payment:', error);
          alert(lang === 'en' ? 'Failed to record payment' : 'भुगतान रिकॉर्ड विफल');
        }
      }
    }, 3000); // Wait 3 seconds for UPI app to return
  };
  
  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Delete transaction
  const deleteTransaction = async (id: string) => {
    if (!user || !confirm(lang === 'en' ? 'Delete this transaction?' : 'इस लेनदेन को हटाएं?')) return;
    
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'khata', id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      {/* UPI Setup Modal - First Time */}
      {showUpiSetup && user && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-md w-full border border-[var(--border)]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[var(--primary)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone size={32} className="text-[var(--primary)]" />
              </div>
              <h3 className="font-bold text-xl text-[var(--text-main)] mb-2">
                {lang === 'en' ? 'Setup Payment Details' : 'भुगतान विवरण सेटअप करें'}
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                {lang === 'en' 
                  ? 'Add your UPI ID to receive payments via QR code' 
                  : 'QR कोड से भुगतान प्राप्त करने के लिए अपनी UPI ID जोड़ें'}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--text-muted)]">
                  {lang === 'en' ? 'Your UPI ID' : 'आपकी UPI ID'}
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@paytm"
                  className="w-full p-3 bg-[var(--bg-input)] border-2 border-[var(--border)] rounded-xl focus:border-[var(--primary)] focus:outline-none text-[var(--text-main)] placeholder-[var(--text-muted)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {lang === 'en' 
                    ? '💡 Example: yourname@paytm, yourname@googlepay' 
                    : '💡 उदाहरण: yourname@paytm, yourname@googlepay'}
                </p>
              </div>
              
              <button
                onClick={async () => {
                  if (!upiId || !isValidUPIId(upiId)) {
                    alert(lang === 'en' ? 'Please enter a valid UPI ID' : 'कृपया मान्य UPI ID दर्ज करें');
                    return;
                  }
                  
                  try {
                    // Save to profile
                    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid), { upiId }, { merge: true });
                    setShowUpiSetup(false);
                    alert(lang === 'en' ? '✅ UPI ID saved!' : '✅ UPI ID सहेजी गई!');
                  } catch (error) {
                    console.error('Error saving UPI ID:', error);
                    alert(lang === 'en' ? 'Failed to save. Try again.' : 'सहेजने में विफल। पुनः प्रयास करें।');
                  }
                }}
                className="w-full p-4 bg-[var(--primary)] hover:opacity-90 text-[var(--bg-main)] rounded-xl font-bold transition-opacity"
              >
                {lang === 'en' ? 'Save & Continue' : 'सहेजें और जारी रखें'}
              </button>
              
              <button
                onClick={() => setShowUpiSetup(false)}
                className="w-full p-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                {lang === 'en' ? 'Skip for now' : 'अभी के लिए छोड़ें'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-3xl p-6 text-[var(--bg-main)] shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm opacity-80">{lang === 'en' ? 'Total Balance' : 'कुल शेष'}</span>
          <Wallet size={24} />
        </div>
        <div className="text-4xl font-bold mb-4">{formatCurrency(balance)}</div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="opacity-80">{lang === 'en' ? 'Income' : 'आय'}</div>
            <div className="font-bold text-green-700">+{formatCurrency(totalIncome)}</div>
          </div>
          <div>
            <div className="opacity-80">{lang === 'en' ? 'Expense' : 'खर्च'}</div>
            <div className="font-bold text-red-700">-{formatCurrency(totalExpense)}</div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setShowAddMoney(true)}
          className="p-4 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--primary)] border border-[var(--border)] rounded-xl flex flex-col items-center gap-2 transition-colors"
        >
          <CreditCard size={24} />
          <span className="text-sm font-semibold">{lang === 'en' ? 'Add Money' : 'पैसे जोड़ें'}</span>
        </button>
        
        <button
          onClick={() => setShowScanQR(true)}
          className="p-4 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-purple-400 border border-[var(--border)] rounded-xl flex flex-col items-center gap-2 transition-colors"
        >
          <Scan size={24} />
          <span className="text-sm font-semibold">{lang === 'en' ? 'Scan & Pay' : 'स्कैन और भुगतान'}</span>
        </button>
        
        <button
          onClick={handleGenerateQR}
          disabled={loading}
          className="p-4 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-green-400 border border-[var(--border)] rounded-xl flex flex-col items-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={24} className="animate-spin" /> : <QrCode size={24} />}
          <span className="text-sm font-semibold">{lang === 'en' ? 'Receive' : 'प्राप्त करें'}</span>
        </button>
        
        <button
          onClick={() => setShowSendMoney(true)}
          className="p-4 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-orange-400 border border-[var(--border)] rounded-xl flex flex-col items-center gap-2 transition-colors"
        >
          <Send size={24} />
          <span className="text-sm font-semibold">{lang === 'en' ? 'Send Money' : 'पैसे भेजें'}</span>
        </button>
      </div>
      
      {/* Transactions List */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-4 shadow-lg border border-[var(--border)]">
        <h3 className="font-bold text-lg mb-4 text-[var(--text-main)]">{lang === 'en' ? 'Recent Transactions' : 'हाल के लेनदेन'}</h3>
        
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-8">
              {lang === 'en' ? 'No transactions yet' : 'अभी तक कोई लेनदेन नहीं'}
            </p>
          ) : (
            transactions.map(txn => (
              <div key={txn.id} className="bg-[var(--bg-input)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div 
                  onClick={() => setExpandedTxn(expandedTxn === txn.id ? null : txn.id)}
                  className="flex items-center justify-between p-3 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-full ${
                      txn.type === 'income' || txn.type === 'payment_received'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {txn.type === 'income' || txn.type === 'payment_received' ? (
                        <TrendingUp size={20} />
                      ) : (
                        <TrendingDown size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-[var(--text-main)]">{txn.description}</p>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                        <span>{txn.displayDate}</span>
                        {txn.displayTime && (
                          <>
                            <span>•</span>
                            <span>{txn.displayTime}</span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                        ID: {txn.transactionId || `GS-${txn.id.substring(0, 12).toUpperCase()}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold text-lg ${
                      txn.type === 'income' || txn.type === 'payment_received'
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}>
                      {txn.type === 'income' || txn.type === 'payment_received' ? '+' : '-'}
                      {formatCurrency(txn.amount)}
                    </p>
                    {txn.status && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        txn.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {txn.status}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Expanded Details - GPay Style */}
                {expandedTxn === txn.id && (
                  <div className="px-3 pb-3 pt-0 space-y-2 border-t border-[var(--border)] bg-[var(--bg-card)]/50">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">{lang === 'en' ? 'Transaction ID' : 'लेनदेन ID'}:</span>
                      <span className="font-mono text-[var(--text-main)] font-bold">{txn.transactionId || `GS-${txn.id.substring(0, 12).toUpperCase()}`}</span>
                    </div>
                    {txn.from && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">{lang === 'en' ? 'From' : 'से'}:</span>
                        <span className="text-[var(--text-main)]">{txn.from}</span>
                      </div>
                    )}
                    {txn.to && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">{lang === 'en' ? 'To' : 'को'}:</span>
                        <span className="text-[var(--text-main)]">{txn.to}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">{lang === 'en' ? 'Type' : 'प्रकार'}:</span>
                      <span className={`capitalize font-medium ${
                        txn.type === 'income' || txn.type === 'payment_received' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {lang === 'en' ? txn.type.replace('_', ' ') : 
                          txn.type === 'income' ? 'आय' : 
                          txn.type === 'expense' ? 'खर्च' : 
                          txn.type === 'payment_sent' ? 'भुगतान भेजा' : 'भुगतान प्राप्त'}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); generateReceiptPDF(txn, lang); }}
                        className="flex-1 text-xs py-2 bg-[var(--primary)] hover:opacity-90 rounded-lg text-black font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        {lang === 'en' ? 'Download Receipt' : 'रसीद डाउनलोड करें'}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteTransaction(txn.id); }}
                        className="text-xs py-2 px-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                      >
                        {lang === 'en' ? 'Delete' : 'हटाएं'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Add Money Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-md w-full border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-[var(--text-main)]">{lang === 'en' ? 'Add Money' : 'पैसे जोड़ें'}</h3>
              <button onClick={() => setShowAddMoney(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => handleAddMoney(amt)}
                    disabled={loading}
                    className="p-3 border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] rounded-xl font-semibold transition-all disabled:opacity-50"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--text-muted)]">
                  {lang === 'en' ? 'Custom Amount' : 'कस्टम राशि'}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full p-3 bg-[var(--bg-input)] border-2 border-[var(--border)] rounded-xl focus:border-[var(--primary)] focus:outline-none text-[var(--text-main)] placeholder-[var(--text-muted)]"
                />
              </div>
              
              <button
                onClick={() => amount && handleAddMoney(parseFloat(amount))}
                disabled={!amount || loading}
                className="w-full p-4 bg-[var(--primary)] hover:opacity-90 text-[var(--bg-main)] rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
                {lang === 'en' ? 'Pay via Razorpay' : 'Razorpay से भुगतान करें'}
              </button>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--bg-card)] px-2 text-[var(--text-muted)]">OR</span>
                </div>
              </div>
              
              <button
                onClick={async () => {
                  if (!amount || parseFloat(amount) <= 0) {
                    alert(lang === 'en' ? 'Please enter amount' : 'कृपया राशि दर्ज करें');
                    return;
                  }
                  
                  try {
                    const now = new Date();
                    await secureAddDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'khata'), {
                      amount: parseFloat(amount),
                      type: 'income',
                      description: 'Cash/Bank deposit',
                      transactionId: generateBankingTransactionId(),
                      timestamp: now.toISOString(),
                      displayDate: now.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN'),
                      displayTime: now.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }),
                      paymentMethod: 'cash',
                      status: 'success',
                      from: 'Cash/Bank',
                      to: user.displayName || 'Me',
                      date: serverTimestamp()
                    });
                    
                    setShowAddMoney(false);
                    setAmount('');
                    alert(lang === 'en' ? `✅ ₹${amount} added!` : `✅ ₹${amount} जोड़ा गया!`);
                  } catch (error) {
                    console.error('Error:', error);
                    alert(lang === 'en' ? 'Failed to add' : 'जोड़ने में विफल');
                  }
                }}
                className="w-full p-3 bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                {lang === 'en' ? 'Add Manually (Cash/Bank)' : 'मैन्युअल रूप से जोड़ें'}
              </button>
              
              <p className="text-xs text-center text-[var(--text-muted)]">
                {lang === 'en' ? '⚡ Opens Razorpay secure payment gateway' : '⚡ Razorpay सुरक्षित भुगतान खुलेगा'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Receive QR Modal */}
      {showReceiveQR && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-md w-full border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-[var(--text-main)]">{lang === 'en' ? 'Receive Payment' : 'भुगतान प्राप्त करें'}</h3>
              <button onClick={() => setShowReceiveQR(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X size={24} />
              </button>
            </div>
            
            {qrCodeImage && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl flex items-center justify-center">
                  <img src={qrCodeImage} alt="Payment QR" className="w-64 h-64" />
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-[var(--text-muted)] mb-2">
                    {lang === 'en' ? 'Scan to pay' : 'भुगतान के लिए स्कैन करें'}
                  </p>
                  <p className="font-bold text-2xl text-[var(--text-main)]">{amount ? formatCurrency(parseFloat(amount)) : lang === 'en' ? 'Any Amount' : 'कोई भी राशि'}</p>
                </div>
                
                <button
                  onClick={() => copyToClipboard(upiId)}
                  className="w-full p-3 bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] rounded-xl flex items-center justify-center gap-2 text-[var(--text-main)]"
                >
                  {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                  <span className="font-mono">{upiId}</span>
                </button>
                
                {/* Manual Confirmation for Received Payment */}
                <div className="pt-2 border-t border-[var(--border)]">
                  <p className="text-xs text-center text-[var(--text-muted)] mb-3">
                    {lang === 'en' 
                      ? '⚠️ After receiving payment, click below to record it' 
                      : '⚠️ भुगतान मिलने के बाद, रिकॉर्ड करने के लिए नीचे क्लिक करें'}
                  </p>
                  <button
                    onClick={async () => {
                      const receivedAmount = prompt(
                        lang === 'en' 
                          ? 'Enter amount received (₹):' 
                          : 'प्राप्त राशि दर्ज करें (₹):'
                      );
                      
                      if (receivedAmount && parseFloat(receivedAmount) > 0) {
                        try {
                          const now = new Date();
                          await secureAddDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'khata'), {
                            amount: parseFloat(receivedAmount),
                            type: 'payment_received',
                            description: 'Payment received via UPI QR',
                            paymentMethod: 'upi',
                            transactionId: `UPI_${Date.now()}`,
                            timestamp: now.toISOString(),
                            displayDate: now.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN'),
                            displayTime: now.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-IN', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }),
                            status: 'success',
                            from: 'UPI Payment',
                            to: user.displayName || 'Me',
                            date: serverTimestamp()
                          });
                          
                          setShowReceiveQR(false);
                          setAmount('');
                          alert(lang === 'en' ? '✅ Payment recorded!' : '✅ भुगतान रिकॉर्ड किया गया!');
                        } catch (error) {
                          console.error('Error recording payment:', error);
                          alert(lang === 'en' ? 'Failed to record payment' : 'भुगतान रिकॉर्ड विफल');
                        }
                      }
                    }}
                    className="w-full p-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-semibold transition-colors"
                  >
                    {lang === 'en' ? '✓ I Received Payment' : '✓ मुझे भुगतान मिला'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Scan QR Modal */}
      {showScanQR && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-md w-full border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-[var(--text-main)]">{lang === 'en' ? 'Scan QR Code' : 'QR कोड स्कैन करें'}</h3>
              <button onClick={() => { stopQRScanner(); setShowScanQR(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X size={24} />
              </button>
            </div>
            
            <div id="qr-reader" className="w-full"></div>
            
            {!scannerActive && (
              <button
                onClick={startQRScanner}
                className="w-full mt-4 p-4 bg-[var(--primary)] hover:opacity-90 text-[var(--bg-main)] rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Scan size={20} />
                {lang === 'en' ? 'Start Camera' : 'कैमरा शुरू करें'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Send Money Modal */}
      {showSendMoney && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-md w-full border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-[var(--text-main)]">{lang === 'en' ? 'Send Money' : 'पैसे भेजें'}</h3>
              <button onClick={() => setShowSendMoney(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--text-muted)]">
                  {lang === 'en' ? 'UPI ID' : 'UPI ID'}
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="example@paytm"
                  className="w-full p-3 bg-[var(--bg-input)] border-2 border-[var(--border)] rounded-xl focus:border-[var(--primary)] focus:outline-none text-[var(--text-main)] placeholder-[var(--text-muted)]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--text-muted)]">
                  {lang === 'en' ? 'Amount' : 'राशि'}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full p-3 bg-[var(--bg-input)] border-2 border-[var(--border)] rounded-xl focus:border-[var(--primary)] focus:outline-none text-[var(--text-main)] text-2xl font-bold placeholder-[var(--text-muted)]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--text-muted)]">
                  {lang === 'en' ? 'Note' : 'नोट'}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={lang === 'en' ? 'Payment for...' : 'के लिए भुगतान...'}
                  className="w-full p-3 bg-[var(--bg-input)] border-2 border-[var(--border)] rounded-xl focus:border-[var(--primary)] focus:outline-none text-[var(--text-main)] placeholder-[var(--text-muted)]"
                />
              </div>
              
              <button
                onClick={handleSendMoney}
                disabled={!amount || !upiId}
                className="w-full p-4 bg-[var(--primary)] hover:opacity-90 text-[var(--bg-main)] rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send size={20} />
                {lang === 'en' ? 'Send Payment' : 'भुगतान भेजें'}
              </button>
              
              <p className="text-xs text-center text-[var(--text-muted)]">
                {lang === 'en' ? '📱 Opens your UPI app to complete payment' : '📱 भुगतान पूरा करने के लिए UPI ऐप खुलेगा'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}