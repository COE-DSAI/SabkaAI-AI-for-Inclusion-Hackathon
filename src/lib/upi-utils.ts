/**
 * UPI QR Code and Payment Utilities
 * Handles UPI payment link generation, QR code creation, and payment processing
 */

/**
 * Generate UPI payment string
 * Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
 */
export const generateUPIString = (
  upiId: string,
  name: string,
  amount?: number,
  note?: string
): string => {
  let upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}`;
  
  if (amount) {
    upiString += `&am=${amount}`;
  }
  
  upiString += `&cu=INR`;
  
  if (note) {
    upiString += `&tn=${encodeURIComponent(note)}`;
  }
  
  return upiString;
};

/**
 * Generate QR code as Data URL
 * Uses qrcode library for generation
 */
export const generateQRCode = async (text: string, size: number = 300): Promise<string> => {
  try {
    // Dynamically import qrcode
    const QRCode = (await import('qrcode')).default;
    
    const qrDataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrDataUrl;
  } catch (error) {
    console.error('QR Code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate UPI payment QR code
 */
export const generatePaymentQR = async (
  upiId: string,
  name: string,
  amount?: number,
  note?: string,
  size?: number
): Promise<string> => {
  const upiString = generateUPIString(upiId, name, amount, note);
  return await generateQRCode(upiString, size);
};

/**
 * Parse UPI string from scanned QR
 */
export const parseUPIString = (upiString: string): {
  upiId: string;
  name: string;
  amount?: number;
  note?: string;
} | null => {
  try {
    const url = new URL(upiString.replace('upi://pay', 'http://dummy'));
    const params = url.searchParams;
    
    const upiId = params.get('pa');
    const name = params.get('pn');
    const amount = params.get('am');
    const note = params.get('tn');
    
    if (!upiId || !name) {
      return null;
    }
    
    return {
      upiId: decodeURIComponent(upiId),
      name: decodeURIComponent(name),
      amount: amount ? parseFloat(amount) : undefined,
      note: note ? decodeURIComponent(note) : undefined
    };
  } catch (error) {
    console.error('Failed to parse UPI string:', error);
    return null;
  }
};

/**
 * Validate UPI ID format
 */
export const isValidUPIId = (upiId: string): boolean => {
  // UPI ID format: username@bankname
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return upiRegex.test(upiId);
};

/**
 * Format UPI ID for display (mask middle part)
 */
export const maskUPIId = (upiId: string): string => {
  const [username, bank] = upiId.split('@');
  if (!username || !bank) return upiId;
  
  if (username.length <= 4) return upiId;
  
  const masked = username.substring(0, 2) + '****' + username.substring(username.length - 2);
  return `${masked}@${bank}`;
};

/**
 * Open UPI payment in supported apps
 */
export const openUPIApp = (upiString: string): void => {
  // Try to open in UPI app
  window.location.href = upiString;
  
  // Fallback: show payment link
  setTimeout(() => {
    const confirmed = confirm('UPI app not detected. Copy payment link?');
    if (confirmed) {
      navigator.clipboard.writeText(upiString);
      alert('Payment link copied to clipboard!');
    }
  }, 1000);
};
