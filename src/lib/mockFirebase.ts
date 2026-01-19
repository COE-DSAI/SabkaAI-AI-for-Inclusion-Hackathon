// Basic mock types to satisfy Typescript
export const mockUser = {
  uid: 'demo-user-123',
  isAnonymous: true,
  displayName: 'Demo Farmer',
  email: 'demo@gramin.com'
};

export const mockProfile = {
  name: 'Demo Farmer',
  village: 'Demo Village',
  crop: 'wheat',
  financialScore: 75,
  joinedAt: new Date()
};

// Fallback error handler
export const handleAuthError = (error: any) => {
  console.error("Firebase Auth Error:", error);
  // Return demo user if auth fails
  if (error.code === 'auth/api-key-not-valid' || error.message.includes('api-key')) {
    console.warn("Using Demo Mode due to missing/invalid API Key");
    return mockUser;
  }
  return null;
};
