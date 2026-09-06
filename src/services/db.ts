/**
 * File2Flow — Supabase Database Service
 * Replaces all Firestore operations.
 * Firebase Auth is kept — only DB + Storage moved to Supabase.
 */

import { getSupabase, isSupabaseConfigured } from './supabase';
import {
  ConversionHistoryItem,
  UserProfile,
  Subscription,
  Invoice,
  Payment,
  PLAN_DEFAULTS,
  PlanTier,
} from '../types';

const STORAGE_BUCKET = 'file2flow-outputs';

// ============================================================
// HELPERS
// ============================================================

function getConversionExpiry(plan: PlanTier): { expiresAt: string; isPermanent: boolean } {
  const defaults = PLAN_DEFAULTS[plan];
  if (defaults.isPermanentStorage) {
    return { expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), isPermanent: true };
  }
  const days = defaults.historyRetentionDays;
  if (days === 0) {
    return { expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), isPermanent: false };
  }
  return { expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(), isPermanent: false };
}

// ============================================================
// USER PROFILE SERVICES
// ============================================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('users')
      .select('*')
      .eq('uid', uid)
      .single();

    if (error || !data) return null;

    return {
      uid: data.uid,
      email: data.email,
      displayName: data.display_name || '',
      photoURL: data.photo_url || '',
      phone: data.phone || '',
      createdAt: data.created_at,
      accountType: data.account_type || 'individual',
      plan: data.plan || 'free',
      conversionsLimitPerMonth: data.conversions_limit_per_month,
      conversionsUsedThisMonth: data.conversions_used_this_month,
      monthlyResetDate: data.monthly_reset_date,
      storageLimit: data.storage_limit,
      storageUsed: data.storage_used,
      historyRetentionDays: data.history_retention_days,
      isPermanentStorage: data.is_permanent_storage,
      subscription: {
        status: data.subscription_status || 'none',
        plan: data.subscription_plan || null,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        renewalDate: data.renewal_date || undefined,
        razorpayCustomerId: data.razorpay_customer_id || undefined,
        razorpaySubscriptionId: data.razorpay_subscription_id || undefined,
      },
      totalSpent: data.total_spent || 0,
      failedPaymentAttempts: data.failed_payment_attempts || 0,
      authProviders: data.auth_providers || ['password'],
      emailVerified: data.email_verified || false,
      preferences: {
        theme: data.theme || 'dark',
        emailNotifications: data.email_notifications ?? true,
        emailNotificationType: data.email_notification_type || 'all',
        newsletter: data.newsletter || false,
      },
      gstinStatus: data.gstin_status || 'none',
      gstin: data.gstin || undefined,
      businessName: data.business_name || undefined,
      pan: data.pan || undefined,
      referralCode: data.referral_code || undefined,
      referredBy: data.referred_by || undefined,
      referralEarnings: data.referral_earnings || 0,
      apiKey: data.api_key || undefined,
      lastLoginAt: data.last_login_at,
      lastActivityAt: data.last_activity_at,
      isActive: data.is_active,
      isVerified: data.is_verified,
      isBanned: data.is_banned,
    } as UserProfile;
  } catch (e) {
    console.warn('Supabase getUserProfile error:', e);
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const row = {
      uid: profile.uid,
      email: profile.email,
      display_name: profile.displayName,
      photo_url: profile.photoURL || '',
      phone: profile.phone || '',
      account_type: profile.accountType,
      plan: profile.plan,
      conversions_limit_per_month: profile.conversionsLimitPerMonth,
      conversions_used_this_month: profile.conversionsUsedThisMonth,
      monthly_reset_date: profile.monthlyResetDate,
      storage_limit: profile.storageLimit,
      storage_used: profile.storageUsed,
      history_retention_days: profile.historyRetentionDays,
      is_permanent_storage: profile.isPermanentStorage,
      subscription_status: profile.subscription.status,
      subscription_plan: profile.subscription.plan,
      razorpay_customer_id: profile.subscription.razorpayCustomerId,
      razorpay_subscription_id: profile.subscription.razorpaySubscriptionId,
      renewal_date: profile.subscription.renewalDate,
      cancel_at_period_end: profile.subscription.cancelAtPeriodEnd,
      total_spent: profile.totalSpent,
      failed_payment_attempts: profile.failedPaymentAttempts,
      auth_providers: profile.authProviders,
      email_verified: profile.emailVerified,
      theme: profile.preferences.theme,
      email_notifications: profile.preferences.emailNotifications,
      email_notification_type: profile.preferences.emailNotificationType,
      newsletter: profile.preferences.newsletter,
      gstin_status: profile.gstinStatus,
      gstin: profile.gstin,
      business_name: profile.businessName,
      pan: profile.pan,
      referral_code: profile.referralCode,
      referred_by: profile.referredBy,
      referral_earnings: profile.referralEarnings,
      api_key: profile.apiKey,
      last_login_at: profile.lastLoginAt,
      last_activity_at: profile.lastActivityAt,
      is_active: profile.isActive,
      is_verified: profile.isVerified,
      is_banned: profile.isBanned,
    };

    const { error } = await sb.from('users').upsert(row, { onConflict: 'uid' });
    if (error) console.warn('Supabase saveUserProfile error:', error);
  } catch (e) {
    console.warn('Supabase saveUserProfile error:', e);
  }
}

export async function updateUserQuota(uid: string, conversionsIncrement: number, storageBytes: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { data } = await sb.from('users').select('conversions_used_this_month, storage_used').eq('uid', uid).single();
    if (data) {
      await sb.from('users').update({
        conversions_used_this_month: data.conversions_used_this_month + conversionsIncrement,
        storage_used: data.storage_used + storageBytes,
        last_activity_at: new Date().toISOString(),
      }).eq('uid', uid);
    }
  } catch (e) {
    console.warn('Supabase updateUserQuota error:', e);
  }
}

// ============================================================
// SUPABASE STORAGE (for premium users only)
// ============================================================

export async function uploadToStorage(userId: string, fileName: string, blob: Blob): Promise<string> {
  const sb = getSupabase();
  if (!sb) return '';

  try {
    const path = `${userId}/outputs/${Date.now()}_${fileName}`;
    const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, blob, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (error) throw error;
    return path;
  } catch (e) {
    console.warn('Supabase uploadToStorage error:', e);
    return '';
  }
}

export async function getSignedUrl(path: string): Promise<string> {
  const sb = getSupabase();
  if (!sb || !path) return '';

  try {
    const { data, error } = await sb.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  } catch (e) {
    console.warn('Supabase getSignedUrl error:', e);
    return '';
  }
}

export async function deleteFromStorage(path: string): Promise<void> {
  const sb = getSupabase();
  if (!sb || !path) return;

  try {
    await sb.storage.from(STORAGE_BUCKET).remove([path]);
  } catch (e) {
    console.warn('Supabase deleteFromStorage error:', e);
  }
}

export async function getStorageUsage(userId: string): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;

  try {
    const { data } = await sb.storage.from(STORAGE_BUCKET).list(`${userId}/outputs/`);
    if (!data) return 0;
    return data.reduce((sum: number, file: any) => sum + (file.metadata?.size || 0), 0);
  } catch (e) {
    console.warn('Supabase getStorageUsage error:', e);
    return 0;
  }
}

// ============================================================
// CONVERSION HISTORY
// ============================================================

export async function saveConversionRecord(record: ConversionHistoryItem): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const row = {
      id: record.id,
      user_id: record.userId,
      user_plan: record.userPlan,
      original_file_name: record.originalFileName,
      original_format: record.originalFormat,
      original_size: record.originalSize,
      from_format: record.fromFormat,
      to_format: record.toFormat,
      output_format: record.outputFormat,
      output_file_name: record.outputFileName,
      output_size: record.outputSize,
      page_count: record.pageCount,
      storage_path_input: record.storagePathInput || null,
      storage_path_output: record.storagePathOutput || null,
      storage_url_input: record.storageUrlInput || null,
      storage_url_output: record.storageUrlOutput || null,
      download_url: record.downloadUrl || null,
      download_url_expiry: record.downloadUrlExpiry || null,
      expires_at: record.expiresAt,
      is_permanent: record.isPermanent,
      is_deleted: record.isDeleted,
      status: record.status,
      error_message: record.errorMessage || null,
      created_at: new Date(record.createdAt).toISOString(),
      completed_at: record.completedAt ? new Date(record.completedAt).toISOString() : null,
      conversion_time_ms: record.conversionTimeMs,
      downloaded_count: record.downloadedCount,
      searchable_file_name: record.searchableFileName,
      tags: record.tags,
      settings: record.settings || {},
    };

    const { error } = await sb.from('conversions').upsert(row, { onConflict: 'id' });
    if (error) console.warn('Supabase saveConversionRecord error:', error);
  } catch (e) {
    console.warn('Supabase saveConversionRecord error:', e);
  }
}

export async function fetchConversionHistory(
  userId: string,
  pageSize: number = 20,
): Promise<{ items: ConversionHistoryItem[] }> {
  const sb = getSupabase();
  if (!sb) return { items: [] };

  try {
    const { data, error } = await sb
      .from('conversions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (error || !data) return { items: [] };

    return {
      items: data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userPlan: row.user_plan,
        originalFileName: row.original_file_name,
        originalFormat: row.original_format,
        originalSize: row.original_size,
        fromFormat: row.from_format,
        toFormat: row.to_format,
        outputFormat: row.output_format,
        outputFileName: row.output_file_name,
        outputSize: row.output_size,
        pageCount: row.page_count,
        storagePathInput: row.storage_path_input,
        storagePathOutput: row.storage_path_output,
        storageUrlInput: row.storage_url_input,
        storageUrlOutput: row.storage_url_output,
        downloadUrl: row.download_url,
        downloadUrlExpiry: row.download_url_expiry,
        expiresAt: row.expires_at,
        isPermanent: row.is_permanent,
        isDeleted: row.is_deleted,
        deletedAt: row.deleted_at,
        status: row.status,
        errorMessage: row.error_message,
        createdAt: new Date(row.created_at).getTime(),
        completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
        conversionTimeMs: row.conversion_time_ms,
        downloadedCount: row.downloaded_count,
        lastDownloadedAt: row.last_downloaded_at,
        searchableFileName: row.searchable_file_name,
        tags: row.tags || [],
        settings: row.settings || {},
      })) as ConversionHistoryItem[],
    };
  } catch (e) {
    console.warn('Supabase fetchConversionHistory error:', e);
    return { items: [] };
  }
}

export async function deleteConversionRecord(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    await sb.from('conversions').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', id);
  } catch (e) {
    console.warn('Supabase deleteConversionRecord error:', e);
  }
}

export async function clearAllConversionRecords(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    await sb.from('conversions').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('user_id', userId);
  } catch (e) {
    console.warn('Supabase clearAllConversionRecords error:', e);
  }
}

// ============================================================
// SUBSCRIPTIONS
// ============================================================

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      razorpaySubscriptionId: data.razorpay_subscription_id || '',
      razorpayPlanId: data.razorpay_plan_id || '',
      razorpayCustomerId: data.razorpay_customer_id || '',
      plan: data.plan,
      price: data.price,
      currency: data.currency,
      billingCycle: data.billing_cycle,
      status: data.status,
      createdAt: data.created_at,
      currentPeriodStart: data.current_period_start || '',
      currentPeriodEnd: data.current_period_end || '',
      renewalDate: data.renewal_date || '',
      cancelledAt: data.cancelled_at,
      autoRenew: data.auto_renew,
      cancelAtPeriodEnd: data.cancel_at_period_end,
      notificationsSent: 0,
      notes: data.notes,
    } as Subscription;
  } catch (e) {
    console.warn('Supabase getActiveSubscription error:', e);
    return null;
  }
}

export async function saveSubscription(sub: Subscription): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const row = {
      id: sub.id,
      user_id: sub.userId,
      razorpay_subscription_id: sub.razorpaySubscriptionId,
      razorpay_plan_id: sub.razorpayPlanId,
      razorpay_customer_id: sub.razorpayCustomerId,
      plan: sub.plan,
      price: sub.price,
      currency: sub.currency,
      billing_cycle: sub.billingCycle,
      status: sub.status,
      current_period_start: sub.currentPeriodStart,
      current_period_end: sub.currentPeriodEnd,
      renewal_date: sub.renewalDate,
      cancelled_at: sub.cancelledAt,
      auto_renew: sub.autoRenew,
      cancel_at_period_end: sub.cancelAtPeriodEnd,
      notes: sub.notes,
    };

    const { error } = await sb.from('subscriptions').upsert(row, { onConflict: 'id' });
    if (error) console.warn('Supabase saveSubscription error:', error);
  } catch (e) {
    console.warn('Supabase saveSubscription error:', e);
  }
}

// ============================================================
// INVOICES
// ============================================================

export async function fetchInvoices(userId: string): Promise<Invoice[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      razorpayInvoiceId: row.razorpay_invoice_id || '',
      razorpaySubscriptionId: row.razorpay_subscription_id,
      razorpayPaymentId: row.razorpay_payment_id,
      amount: row.amount,
      amountPaid: row.amount_paid,
      amountDue: row.amount_due,
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
      invoiceDate: row.invoice_date,
      dueDate: row.due_date,
      paidAt: row.paid_at,
      description: row.description,
      itemName: row.item_name,
      itemQuantity: row.item_quantity,
      itemUnitPrice: row.item_unit_price,
      customerEmail: row.customer_email,
      customerName: row.customer_name,
      customerPhone: '',
      billingAddress: row.billing_address || { street: '', city: '', state: '', country: '', zipcode: '' },
      gstAmount: row.gst_amount,
      subtotal: row.subtotal,
      total: row.total,
      invoicePdfUrl: row.invoice_pdf_url,
      viewCount: 0,
    })) as Invoice[];
  } catch (e) {
    console.warn('Supabase fetchInvoices error:', e);
    return [];
  }
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const row = {
      id: invoice.id,
      user_id: invoice.userId,
      razorpay_invoice_id: invoice.razorpayInvoiceId,
      razorpay_subscription_id: invoice.razorpaySubscriptionId,
      razorpay_payment_id: invoice.razorpayPaymentId,
      amount: invoice.amount,
      amount_paid: invoice.amountPaid,
      amount_due: invoice.amountDue,
      currency: invoice.currency,
      status: invoice.status,
      invoice_date: invoice.invoiceDate,
      due_date: invoice.dueDate,
      paid_at: invoice.paidAt,
      description: invoice.description,
      item_name: invoice.itemName,
      item_quantity: invoice.itemQuantity,
      item_unit_price: invoice.itemUnitPrice,
      customer_email: invoice.customerEmail,
      customer_name: invoice.customerName,
      gst_amount: invoice.gstAmount || 0,
      subtotal: invoice.subtotal,
      total: invoice.total,
      invoice_pdf_url: invoice.invoicePdfUrl,
    };

    const { error } = await sb.from('invoices').upsert(row, { onConflict: 'id' });
    if (error) console.warn('Supabase saveInvoice error:', error);
  } catch (e) {
    console.warn('Supabase saveInvoice error:', e);
  }
}

// ============================================================
// PAYMENTS
// ============================================================

export async function fetchPayments(userId: string): Promise<Payment[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      razorpayPaymentId: row.razorpay_payment_id || '',
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      method: row.method,
      cardLast4: row.card_last4,
      cardBrand: row.card_brand,
      upiId: row.upi_id,
      email: row.email,
      contact: row.contact,
      createdAt: row.created_at,
      capturedAt: row.captured_at,
      description: row.description,
      invoiceId: row.invoice_id,
      subscriptionId: row.subscription_id,
      webhookReceived: false,
    })) as Payment[];
  } catch (e) {
    console.warn('Supabase fetchPayments error:', e);
    return [];
  }
}

export async function savePayment(payment: Payment): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const row = {
      id: payment.id,
      user_id: payment.userId,
      razorpay_payment_id: payment.razorpayPaymentId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      card_last4: payment.cardLast4,
      card_brand: payment.cardBrand,
      upi_id: payment.upiId,
      email: payment.email,
      contact: payment.contact,
      captured_at: payment.capturedAt,
      description: payment.description,
      invoice_id: payment.invoiceId,
      subscription_id: payment.subscriptionId,
    };

    const { error } = await sb.from('payments').upsert(row, { onConflict: 'id' });
    if (error) console.warn('Supabase savePayment error:', error);
  } catch (e) {
    console.warn('Supabase savePayment error:', e);
  }
}
