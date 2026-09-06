export type SupportedFormat =
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'json'
  | 'image'
  | 'markdown'
  | 'html'
  | 'txt'
  | 'csv'
  | 'pdf';

export type OutputFormat = 'pdf' | 'docx' | 'html' | 'txt' | 'md';

export type ConversionStatus = 'idle' | 'uploading' | 'converting' | 'completed' | 'error';

export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise';

export type AccountType = 'individual' | 'student' | 'business' | 'freelancer';

export type SubscriptionStatus = 'none' | 'active' | 'paused' | 'cancelled' | 'expired';

export type BillingCycle = 'monthly' | 'yearly';

export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet';

export type PaymentStatus = 'authorized' | 'captured' | 'failed' | 'refunded';

export type InvoiceStatus = 'issued' | 'paid' | 'expired' | 'failed';

// --- User Profile (users collection) ---
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  createdAt: string;

  // Account & Plan
  accountType: AccountType;
  plan: PlanTier;

  // Quota
  conversionsLimitPerMonth: number;
  conversionsUsedThisMonth: number;
  monthlyResetDate: string;

  // Storage
  storageLimit: number;
  storageUsed: number;

  // History
  historyRetentionDays: number;
  isPermanentStorage: boolean;

  // Subscription
  subscription: SubscriptionInfo;

  // Billing
  totalSpent: number;
  lastPaymentDate?: string;
  failedPaymentAttempts: number;

  // Auth
  authProviders: string[];
  emailVerified?: boolean;

  // Preferences
  preferences: UserPreferences;

  // Address
  address?: Address;

  // Tax (India)
  gstinStatus: 'none' | 'verified' | 'not_verified';
  gstin?: string;
  businessName?: string;
  pan?: string;

  // Referral
  referralCode?: string;
  referredBy?: string;
  referralEarnings: number;

  // Metadata
  lastLoginAt: string;
  lastActivityAt: string;
  isActive: boolean;
  isVerified: boolean;
  isBanned: boolean;

  // Legacy
  apiKey?: string;
}

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  plan: PlanTier | null;
  paddleCustomerId?: string;
  paddleSubscriptionId?: string;
  renewalDate?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  pausedAt?: string;
  pauseExpiresAt?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  emailNotifications: boolean;
  emailNotificationType: 'all' | 'important' | 'none';
  newsletter: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
}

// --- Conversion (conversions collection) ---
export interface ConversionHistoryItem {
  id: string;
  userId: string;
  userPlan: string;

  // Input
  originalFileName: string;
  originalFormat: SupportedFormat;
  originalSize: number;
  fromFormat: string;
  toFormat: string;

  // Output
  outputFormat: OutputFormat;
  outputFileName: string;
  outputSize: number;
  pageCount: number;

  // Storage
  storagePathInput?: string;
  storageUrlInput?: string;
  storagePathOutput?: string;
  storageUrlOutput?: string;
  downloadUrl?: string;
  downloadUrlExpiry?: string;

  // Expiry
  expiresAt: string;
  isPermanent: boolean;
  isDeleted: boolean;
  deletedAt?: string;

  // Status
  status: 'uploading' | 'converting' | 'completed' | 'failed';
  errorMessage?: string;

  // Timestamps
  createdAt: number;
  completedAt?: number;
  conversionTimeMs: number;

  // Analytics
  downloadedCount: number;
  lastDownloadedAt?: string;

  // Metadata
  metadata: ConversionMetadata;
  searchableFileName: string;
  tags: string[];
  settings?: Partial<ConversionSettings>;
}

export interface ConversionMetadata {
  outputFormat: string;
  pageCount: number | null;
  compression: 'standard' | 'high';
  quality: 'standard' | 'high' | 'low';
}

// --- Subscription (subscriptions collection) ---
export interface Subscription {
  id: string;
  userId: string;
  paddleSubscriptionId: string;
  paddleCustomerId: string;
  plan: PlanTier;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  createdAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewalDate: string;
  cancelledAt?: string;
  pausedAt?: string;
  pauseExpiresAt?: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  notes?: string;
}

// --- Invoice (invoices collection) ---
export interface Invoice {
  id: string;
  userId: string;
  paddleInvoiceId: string;
  paddleSubscriptionId?: string;
  amount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: InvoiceStatus;
  createdAt: string;
  invoiceDate: string;
  dueDate: string;
  paidAt?: string;
  description: string;
  itemName: string;
  itemQuantity: number;
  itemUnitPrice: number;
  customerEmail: string;
  customerName: string;
  subtotal: number;
  total: number;
  invoicePdfUrl?: string;
}

// --- Payment (payments collection) ---
export interface Payment {
  id: string;
  userId: string;
  paddlePaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  cardLast4?: string;
  cardBrand?: string;
  email: string;
  createdAt: string;
  capturedAt?: string;
  description: string;
  invoiceId?: string;
  subscriptionId?: string;
}

// --- AI / LLM (Groq) Types ---
export interface AiTemplateSuggestion {
  template: string;
  reason: string;
  suggestions: string[];
  style: {
    colors: string[];
    fonts: string;
    layout: string;
  };
}

export interface AiQualityAnalysis {
  qualityScore: number;
  issues: string[];
  improvements: string[];
  grammarCheck: string;
  readabilityScore: number;
}

export interface AiEnhancements {
  improvements: string[];
  suggestedStructure: string[];
  formatRecommendations: string[];
  addParagraph?: string;
}

export interface AiSummary {
  summary: string;
}

export interface AiTableOfContents {
  tableOfContents: Array<{
    section: string;
    pageNumber: string;
  }>;
}

export interface AiEnhancedContent {
  original: string;
  summary: string;
  improvements: string[];
  suggestedStructure: string[];
  header: {
    headerText: string;
    styling: string;
    layout: string;
  };
  tableOfContents: Array<{
    section: string;
    pageNumber: string;
  }>;
  generatedAt: string;
}

export interface AiSuggestions {
  documentType: string;
  template: AiTemplateSuggestion;
  quality: AiQualityAnalysis;
  enhancements?: AiEnhancements;
  summary?: string;
  enhancedContent?: AiEnhancedContent;
  generatedAt: string;
}

// --- Conversion Settings (UI) ---
export interface ConversionSettings {
  outputFormat: OutputFormat;
  pageSize: 'a4' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  margin: 'normal' | 'narrow' | 'wide' | 'none';
  quality: 'standard' | 'high';
  watermarkText?: string;
  addPageNumbers: boolean;
  theme?: 'light' | 'dark' | 'clean';
  outputFileName?: string;

  // JSON
  jsonMode: 'report' | 'formatted' | 'table' | 'smart_ai';
  // Markdown
  mdPreserveHeadings?: boolean;
  mdCodeBlocks?: boolean;
  mdTables?: boolean;
  mdLinks?: boolean;
  // HTML
  htmlPreserveStyles?: boolean;
  htmlIncludeImages?: boolean;
  htmlBackgroundGraphics?: boolean;
  // Images
  imageFit: 'contain' | 'cover' | 'original';
  // Office docs
  preserveLayout?: boolean;
}

// --- File Item (UI queue) ---
export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  format: SupportedFormat;
  outputFormat: OutputFormat;
  progress: number;
  status: ConversionStatus;
  error?: string;
  conversionTimeMs?: number;
  outputBlobUrl?: string;
  outputBlob?: Blob;
  outputSize?: number;
  pageCount?: number;
  previewUrl?: string;
  createdAt: number;
}

// --- Pricing Plan (UI) ---
export interface PricingPlan {
  id: PlanTier;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  popular?: boolean;
  features: string[];
  maxFileSizeMB: number;
  monthlyConversions: number | 'Unlimited';
  maxBatchSize: number;
  storageGB: number;
  historyDays: number;
  apiAccess: boolean;
  prioritySupport: boolean;
  ocrSupported: boolean;
}

// --- Toast ---
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

// --- Active Page ---
export type ActivePage = 'landing' | 'convert' | 'dashboard' | 'pricing' | 'account' | 'auth' | 'tools' | 'tools-pdf-compress' | 'tools-pdf-split' | 'tools-pdf-merge' | 'tools-pdf-rotate' | 'tools-pdf-protect' | 'tools-convert' | 'tools-json';

// --- Plan Defaults (constants) ---
export const PLAN_DEFAULTS: Record<PlanTier, {
  conversionsLimitPerMonth: number;
  storageLimit: number;
  historyRetentionDays: number;
  isPermanentStorage: boolean;
}> = {
  free: {
    conversionsLimitPerMonth: 10,
    storageLimit: 0,
    historyRetentionDays: 0,
    isPermanentStorage: false,
  },
  starter: {
    conversionsLimitPerMonth: -1, // unlimited
    storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
    historyRetentionDays: 30,
    isPermanentStorage: false,
  },
  professional: {
    conversionsLimitPerMonth: -1, // unlimited
    storageLimit: 100 * 1024 * 1024 * 1024, // 100GB
    historyRetentionDays: 90,
    isPermanentStorage: false,
  },
  enterprise: {
    conversionsLimitPerMonth: -1, // unlimited
    storageLimit: 999 * 1024 * 1024 * 1024, // unlimited
    historyRetentionDays: 999,
    isPermanentStorage: true,
  },
};