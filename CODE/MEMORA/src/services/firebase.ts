import { initializeApp } from 'firebase/app';
import { 
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider, 
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { User } from '../types';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

// Firebase configuration - uses env variables or placeholders
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY || "your-api-key",
  authDomain: FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: FIREBASE_APP_ID || "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence for React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

WebBrowser.maybeCompleteAuthSession();

export class FirebaseAuthService {
  private static instance: FirebaseAuthService;
  private authStateListeners: Array<(user: User | null) => void> = [];

  private constructor() {
    // Set up auth state listener
    onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      const user = this.convertFirebaseUser(firebaseUser);
      this.authStateListeners.forEach(listener => listener(user));
    });
  }

  static getInstance(): FirebaseAuthService {
    if (!FirebaseAuthService.instance) {
      FirebaseAuthService.instance = new FirebaseAuthService();
    }
    return FirebaseAuthService.instance;
  }

  async signInWithGoogle(): Promise<User | null> {
    try {
      // For demo purposes, we'll simulate a successful sign-in
      // In production, implement actual Google sign-in flow
      const mockUser: User = {
        uid: 'demo-user-id',
        email: 'demo@example.com',
        displayName: 'Demo User',
        photoURL: null,
        isAnonymous: false,
      };
      
      // Simulate sign-in delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return mockUser;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      // For demo purposes, just clear the user
      console.log('User signed out');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.convertFirebaseUser(auth.currentUser);
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  private convertFirebaseUser(firebaseUser: FirebaseUser | null): User | null {
    if (!firebaseUser) return null;
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || undefined,
      displayName: firebaseUser.displayName || undefined,
      photoURL: firebaseUser.photoURL || undefined,
      isAnonymous: firebaseUser.isAnonymous,
    };
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      
      const token = await currentUser.getIdToken();
      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }
}

export const firebaseAuth = FirebaseAuthService.getInstance();