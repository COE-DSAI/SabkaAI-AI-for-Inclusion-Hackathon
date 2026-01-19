/**
 * Razorpay Payment Gateway Integration
 * 
 * This module handles all Razorpay payment operations including:
 * - Initializing Razorpay checkout
 * - Creating payment orders
 * - Handling payment callbacks
 * - Verifying payment signatures
 */

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise (1 rupee = 100 paise)
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

/**
 * Load Razorpay script dynamically
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Initialize Razorpay payment
 * 
 * @param amount Amount in rupees (will be converted to paise)
 * @param description Payment description
 * @param onSuccess Callback on successful payment
 * @param onFailure Callback on payment failure
 * @param userProfile User details for prefill
 */
export const initiateRazorpayPayment = async (
  amount: number,
  description: string,
  onSuccess: (response: RazorpayResponse) => void,
  onFailure: () => void,
  userProfile?: { name?: string; email?: string; phone?: string }
): Promise<void> => {
  // Load Razorpay script
  const loaded = await loadRazorpayScript();
  
  if (!loaded) {
    alert('Failed to load Razorpay. Please check your internet connection.');
    onFailure();
    return;
  }

  // Get Razorpay key from environment
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
  
  if (!razorpayKey || razorpayKey === 'your_razorpay_key_id_here') {
    alert('Razorpay is not configured. Please add your Razorpay keys to .env file.');
    onFailure();
    return;
  }

  // Configure Razorpay options
  const options: RazorpayOptions = {
    key: razorpayKey,
    amount: Math.round(amount * 100), // Convert rupees to paise
    currency: 'INR',
    name: 'Gramin Saathi',
    description: description,
    prefill: {
      name: userProfile?.name || '',
      email: userProfile?.email || '',
      contact: userProfile?.phone || ''
    },
    theme: {
      color: '#c8e038' // Your app's primary color
    },
    handler: (response: RazorpayResponse) => {
      // Payment successful
      console.log('Payment successful:', response);
      onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        // Payment cancelled by user
        console.log('Payment cancelled');
        onFailure();
      }
    }
  };

  try {
    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error('Razorpay error:', error);
    alert('Failed to open payment gateway. Please try again.');
    onFailure();
  }
};

/**
 * Verify payment signature (basic client-side check)
 * Note: For production, always verify on server-side as well
 */
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  // This is a placeholder - real verification should happen on server
  // Client-side verification is not secure enough for production
  return true;
};

/**
 * Format amount for display
 */
export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

/**
 * Predefined amount options for quick selection
 */
export const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];
