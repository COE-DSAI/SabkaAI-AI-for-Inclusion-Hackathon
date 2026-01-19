// --- GEMINI API QUOTA MANAGEMENT ---
const API_QUOTA_KEY = 'gemini_api_quota';
const DAILY_LIMIT = 50; // Max requests per day
const RATE_LIMIT_MS = 2000; // Min 2 seconds between requests
let lastApiCall = 0;
const responseCache = new Map();

export function checkApiQuota() {
  const today = new Date().toDateString();
  const quota = JSON.parse(localStorage.getItem(API_QUOTA_KEY) || '{}');
  
  if (quota.date !== today) {
    // Reset daily quota
    quota.date = today;
    quota.count = 0;
    localStorage.setItem(API_QUOTA_KEY, JSON.stringify(quota));
  }
  
  return quota.count < DAILY_LIMIT;
}

export function incrementApiQuota() {
  const quota = JSON.parse(localStorage.getItem(API_QUOTA_KEY) || '{}');
  quota.count = (quota.count || 0) + 1;
  localStorage.setItem(API_QUOTA_KEY, JSON.stringify(quota));
}

export function getRemainingQuota() {
  const quota = JSON.parse(localStorage.getItem(API_QUOTA_KEY) || '{}');
  return DAILY_LIMIT - (quota.count || 0);
}

export async function callGeminiWithQuota(url: string, body: any, cacheKey: string | null = null) {
  // Check cache first
  if (cacheKey && responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey);
  }
  
  // Check quota
  if (!checkApiQuota()) {
    throw new Error('Daily API quota exceeded. Please try again tomorrow.');
  }
  
  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastCall));
  }
  
  lastApiCall = Date.now();
  incrementApiQuota();
  
  const response = await fetch(url, body);
  const data = await response.json();
  
  // Cache response if cacheKey provided
  if (cacheKey && data) {
    responseCache.set(cacheKey, data);
    // Limit cache size
    if (responseCache.size > 100) {
      const firstKey = responseCache.keys().next().value;
      responseCache.delete(firstKey);
    }
  }
  
  return data;
}

// --- SHARE FUNCTIONS ---
export const shareContent = async (title: string, text: string, url: string | null = null) => {
  const shareData: any = { title, text };
  if (url) shareData.url = url;
  
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Share failed:', err);
    }
  }
  
  // Fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(`${title}\n\n${text}${url ? `\n\n${url}` : ''}`);
    alert('Copied to clipboard! Share via WhatsApp or any app.');
    return true;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
};

// --- DUMMY DATA GENERATION ---
import { Wallet, Sprout, Store, ShieldCheck } from 'lucide-react';

export function generateDummyTransactions(lang = 'en') {
  const categories = [
    { name: lang === 'en' ? 'Seeds' : 'बीज', icon: 'Sprout', color: 'text-emerald-500', amount: -1200 },
    { name: lang === 'en' ? 'Fertilizer' : 'खाद', icon: 'Leaf', color: 'text-green-500', amount: -2500 },
    { name: lang === 'en' ? 'Mandi Sale' : 'मंडी बिक्री', icon: 'Store', color: 'text-blue-500', amount: 45000 },
    { name: lang === 'en' ? 'Labor' : 'मजदूरी', icon: 'Users', color: 'text-orange-500', amount: -3500 },
    { name: lang === 'en' ? 'Diesel' : 'डीजल', icon: 'Fuel', color: 'text-gray-500', amount: -4500 },
    { name: lang === 'en' ? 'Pesticide' : 'कीटनाशक', icon: 'Zap', color: 'text-yellow-500', amount: -1800 }
  ];

  const transactions = [];
  const now = new Date();
  
  for (let i = 0; i < 15; i++) {
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const date = new Date();
    date.setDate(now.getDate() - Math.floor(Math.random() * 30));
    
    // Use whole numbers only - round to nearest 100
    const randomVariation = Math.floor((Math.random() * 500 - 250) / 100) * 100;
    
    transactions.push({
      id: `dummy-${i}`,
      category: cat.name,
      amount: cat.amount + randomVariation,
      date: date.toISOString(),
      type: cat.amount > 0 ? 'income' : 'expense',
      note: lang === 'en' ? 'Sample transaction' : 'नमूना लेनदेन'
    });
  }
  
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
