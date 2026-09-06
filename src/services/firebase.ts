/**
 * File2Flow — Firebase Auth + Supabase DB/Storage
 * Firebase handles: authentication only
 * Supabase handles: PostgreSQL database + file storage
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  User,
  onAuthStateChanged
} from 'firebase/auth';

// Supabase DB + Storage services
import {
  getUserProfile as sbGetUserProfile,
  saveUserProfile as sbSaveUserProfile,
  updateUserQuota as sbUpdateUserQuota,
  saveConversionRecord as sbSaveConversionRecord,
  fetchConversionHistory as sbFetchConversionHistory,
  deleteConversionRecord as sbDeleteConversionRecord,
  clearAllConversionRecords as sbClearAllConversionRecords,
  getActiveSubscription as sbGetActiveSubscription,
  saveSubscription as sbSaveSubscription,
  fetchInvoices as sbFetchInvoices,
  saveInvoice as sbSaveInvoice,
  fetchPayments as sbFetchPayments,
  savePayment as sbSavePayment,
  uploadToStorage as sbUploadToStorage,
  deleteFromStorage as sbDeleteFromStorage,
  getStorageUsage as sbGetStorageUsage,
  getSignedUrl as sbGetSignedUrl,
} from './db';

import {
  ConversionHistoryItem,
  UserProfile,
  Subscription,
  Invoice,
  Payment,
  PlanTier,
  PLAN_DEFAULTS,
} from '../types';

const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    console.info('Firebase Auth initialized');
  } catch (error) {
    console.warn('Firebase Auth init failed:', error);
  }
} else {
  console.info('Firebase credentials not set. Using local-only mode.');
}

export { auth, isFirebaseConfigured };

// Re-export storage helpers for backward compatibility
export { sbGetSignedUrl as getSignedUrl };

const LOCAL_STORAGE_USER_KEY = 'ff_user';
const LOCAL_STORAGE_HISTORY_KEY = 'ff_history';

// --- Default Demo User ---
export const DEFAULT_DEMO_USER: UserProfile = {
  uid: 'demo-user-101',
  email: 'demo@file2flow.app',
  displayName: 'User',
  createdAt: new Date().toISOString(),
  accountType: 'individual',
  plan: 'free',
  conversionsLimitPerMonth: 10,
  conversionsUsedThisMonth: 0,
  monthlyResetDate: new Date().toISOString(),
  storageLimit: 0,
  storageUsed: 0,
  historyRetentionDays: 0,
  isPermanentStorage: false,
  subscription: { status: 'none', plan: null, cancelAtPeriodEnd: false },
  totalSpent: 0,
  failedPaymentAttempts: 0,
  authProviders: ['password'],
  emailVerified: true,
  preferences: { theme: 'dark', emailNotifications: true, emailNotificationType: 'all', newsletter: false },
  gstinStatus: 'none',
  referralEarnings: 0,
  lastLoginAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
  isActive: true,
  isVerified: true,
  isBanned: false,
};

// --- Helper: Create Default UserProfile ---
function createDefaultUserProfile(uid: string, email: string, name?: string): UserProfile {
  const defaults = PLAN_DEFAULTS.free;
  return {
    uid,
    email,
    displayName: name || email.split('@')[0],
    createdAt: new Date().toISOString(),
    accountType: 'individual',
    plan: 'free',
    conversionsLimitPerMonth: defaults.conversionsLimitPerMonth,
    conversionsUsedThisMonth: 0,
    monthlyResetDate: new Date().toISOString(),
    storageLimit: defaults.storageLimit,
    storageUsed: 0,
    historyRetentionDays: defaults.historyRetentionDays,
    isPermanentStorage: defaults.isPermanentStorage,
    subscription: { status: 'none', plan: null, cancelAtPeriodEnd: false },
    totalSpent: 0,
    failedPaymentAttempts: 0,
    authProviders: ['password'],
    emailVerified: false,
    preferences: {
      theme: 'dark',
      emailNotifications: true,
      emailNotificationType: 'all',
      newsletter: false,
    },
    gstinStatus: 'none',
    referralEarnings: 0,
    lastLoginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isActive: true,
    isVerified: false,
    isBanned: false,
    apiKey: `ff_live_${Math.random().toString(36).substring(2, 12)}`,
  };
}

// =====================================================================
// AUTH SERVICES (Firebase)
// =====================================================================
export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  if (auth && isFirebaseConfigured) {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const user = cred.user;
    let profile = await getUserProfile(user.uid);
    if (!profile) {
      profile = createDefaultUserProfile(user.uid, user.email || email);
      await saveUserProfile(profile);
    }
    profile.lastLoginAt = new Date().toISOString();
    profile.lastActivityAt = new Date().toISOString();
    profile.emailVerified = user.emailVerified;
    await saveUserProfile(profile);
    return profile;
  }
  const storedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed.email === email) return parsed;
    } catch {}
  }
  const newUser = createDefaultUserProfile(`usr_${Date.now()}`, email);
  newUser.emailVerified = true;
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
  return newUser;
}

export async function signUpWithEmail(email: string, pass: string, name?: string): Promise<UserProfile> {
  if (auth && isFirebaseConfigured) {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const user = cred.user;
    await sendEmailVerification(user);
    const profile = createDefaultUserProfile(user.uid, user.email || email, name);
    profile.authProviders = ['password'];
    await saveUserProfile(profile);
    return profile;
  }
  const newUser = createDefaultUserProfile(`usr_${Date.now()}`, email, name);
  newUser.emailVerified = true;
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
  return newUser;
}

export async function resendVerificationEmail(): Promise<void> {
  if (auth && auth.currentUser && isFirebaseConfigured) {
    await sendEmailVerification(auth.currentUser);
  }
}

export async function checkEmailVerified(): Promise<boolean> {
  if (auth && auth.currentUser && isFirebaseConfigured) {
    await reload(auth.currentUser);
    return auth.currentUser.emailVerified;
  }
  return true;
}

export async function loginWithGoogle(): Promise<UserProfile> {
  if (auth && isFirebaseConfigured) {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user = cred.user;
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        profile = createDefaultUserProfile(user.uid, user.email || '');
        profile.displayName = user.displayName || 'Google User';
        profile.photoURL = user.photoURL || undefined;
        profile.authProviders = ['google.com'];
      }
      profile.lastLoginAt = new Date().toISOString();
      profile.lastActivityAt = new Date().toISOString();
      profile.emailVerified = user.emailVerified;
      await saveUserProfile(profile);
      return profile;
    } catch (err: any) {
      console.error('Google sign-in error:', err.code, err.message);
      if (err.code === 'auth/popup-blocked-by-user') {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled. Please try again.');
      }
      if (err.code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized for Google sign-in. Please check Firebase console settings.');
      }
      throw new Error(`Google sign-in failed: ${err.message || 'Unknown error'}`);
    }
  }
  const googleUser = createDefaultUserProfile(`google_usr_${Date.now()}`, 'user.workspace@gmail.com', 'Google Account User');
  googleUser.photoURL = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80';
  googleUser.emailVerified = true;
  googleUser.plan = 'starter';
  googleUser.storageUsed = 5.4 * 1024 * 1024;
  googleUser.conversionsUsedThisMonth = 14;
  googleUser.subscription = { status: 'active', plan: 'starter', cancelAtPeriodEnd: false };
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(googleUser));
  return googleUser;
}

export async function logoutFirebase(): Promise<void> {
  if (auth && isFirebaseConfigured) await signOut(auth);
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
}

export async function resetFirebasePassword(email: string): Promise<void> {
  if (auth && isFirebaseConfigured) {
    await sendPasswordResetEmail(auth, email);
    return;
  }
  await new Promise((res) => setTimeout(res, 500));
}

// =====================================================================
// EMAIL LINK SIGN-IN (Firebase)
// =====================================================================
export async function sendMagicLink(email: string): Promise<void> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Email link sign-in requires Firebase.');
  }
  const actionCodeSettings = {
    url: window.location.origin + window.location.pathname,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  window.localStorage.setItem('emailForSignIn', email);
}

export function isMagicLinkUrl(): boolean {
  if (!auth || !isFirebaseConfigured) return false;
  return isSignInWithEmailLink(auth, window.location.href);
}

export async function completeMagicLinkSignIn(): Promise<UserProfile | null> {
  if (!auth || !isFirebaseConfigured) return null;
  let email = window.localStorage.getItem('emailForSignIn');
  if (!email) {
    email = window.prompt('Please confirm your email to complete sign-in:');
  }
  if (!email) return null;
  const cred = await signInWithEmailLink(auth, email, window.location.href);
  window.localStorage.removeItem('emailForSignIn');
  const user = cred.user;
  let profile = await getUserProfile(user.uid);
  if (!profile) {
    profile = createDefaultUserProfile(user.uid, user.email || email);
    profile.emailVerified = true;
    await saveUserProfile(profile);
  }
  profile.lastLoginAt = new Date().toISOString();
  profile.lastActivityAt = new Date().toISOString();
  profile.emailVerified = true;
  await saveUserProfile(profile);
  return profile;
}

// =====================================================================
// USER PROFILE (Supabase DB)
// =====================================================================
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  // Try Supabase first
  const profile = await sbGetUserProfile(uid);
  if (profile) return profile;

  // Fallback to local storage
  const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.uid === uid) return parsed;
    } catch {}
  }
  return null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await sbSaveUserProfile(profile);
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
}

export async function updateUserQuota(uid: string, conversionsIncrement: number, storageBytes: number): Promise<void> {
  await sbUpdateUserQuota(uid, conversionsIncrement, storageBytes);
}

// =====================================================================
// STORAGE (Supabase Storage)
// =====================================================================
export async function uploadToStorage(userId: string, fileName: string, blob: Blob): Promise<string> {
  return await sbUploadToStorage(userId, fileName, blob);
}

export async function deleteFromStorage(url: string): Promise<void> {
  // If it's a storage path, delete from Supabase
  if (url && !url.startsWith('http')) {
    await sbDeleteFromStorage(url);
  }
}

export async function getStorageUsage(userId: string): Promise<number> {
  return await sbGetStorageUsage(userId);
}

// =====================================================================
// CONVERSION HISTORY (Supabase DB)
// =====================================================================
export async function saveConversionRecord(record: ConversionHistoryItem): Promise<void> {
  await sbSaveConversionRecord(record);
  // Also keep local copy
  const existing = getLocalHistory();
  const updated = [record, ...existing.filter((item) => item.id !== record.id)];
  localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated.slice(0, 100)));
}

export async function fetchConversionHistory(
  userId: string,
  pageSize: number = 20,
): Promise<{ items: ConversionHistoryItem[] }> {
  const result = await sbFetchConversionHistory(userId, pageSize);
  if (result.items.length > 0) return result;

  // Fallback to local
  const localList = getLocalHistory();
  const filtered = localList.filter((item) => item.userId === userId || userId === 'demo-user-101');
  return { items: filtered.slice(0, pageSize) };
}

export async function deleteConversionRecord(id: string): Promise<void> {
  await sbDeleteConversionRecord(id);
  const existing = getLocalHistory();
  localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(existing.filter((item) => item.id !== id)));
}

export async function clearAllConversionRecords(userId: string): Promise<void> {
  await sbClearAllConversionRecords(userId);
  localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify([]));
}

// =====================================================================
// SUBSCRIPTIONS (Supabase DB)
// =====================================================================
export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  return await sbGetActiveSubscription(userId);
}

export async function saveSubscription(sub: Subscription): Promise<void> {
  await sbSaveSubscription(sub);
}

// =====================================================================
// INVOICES (Supabase DB)
// =====================================================================
export async function fetchInvoices(userId: string): Promise<Invoice[]> {
  return await sbFetchInvoices(userId);
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
  await sbSaveInvoice(invoice);
}

// =====================================================================
// PAYMENTS (Supabase DB)
// =====================================================================
export async function fetchPayments(userId: string): Promise<Payment[]> {
  return await sbFetchPayments(userId);
}

export async function savePayment(payment: Payment): Promise<void> {
  await sbSavePayment(payment);
}

// =====================================================================
// LOCAL HELPERS
// =====================================================================
function getLocalHistory(): ConversionHistoryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
