import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  ActivePage,
  ConversionHistoryItem,
  ConversionSettings,
  FileItem,
  PlanTier,
  ToastMessage,
  UserProfile,
  PLAN_DEFAULTS,
} from '../types';
import {
  auth,
  isFirebaseConfigured,
  DEFAULT_DEMO_USER,
  loginWithEmail,
  signUpWithEmail,
  loginWithGoogle,
  logoutFirebase,
  resetFirebasePassword,
  resendVerificationEmail,
  checkEmailVerified,
  uploadToStorage,
  fetchConversionHistory,
  saveConversionRecord,
  deleteConversionRecord,
  clearAllConversionRecords,
  saveUserProfile,
  updateUserQuota,
  sendMagicLink,
  completeMagicLinkSignIn,
  isMagicLinkUrl,
} from '../services/firebase';
import { convertFile } from '../services/converter';
import { detectFormat } from '../utils/formatters';
import { PRICING_PLANS } from '../data/plans';

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  dashboard: ConversionHistoryItem[];
  isLoadingDashboard: boolean;
  activeFiles: FileItem[];
  selectedFile: FileItem | null;
  setSelectedFile: (file: FileItem | null) => void;
  isBatchMode: boolean;
  setIsBatchMode: (val: boolean) => void;
  settings: ConversionSettings;
  updateSettings: (newSettings: Partial<ConversionSettings>) => void;
  isConverting: boolean;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Modals
  upgradeModalOpen: boolean;
  setUpgradeModalOpen: (open: boolean) => void;
  previewModalFile: FileItem | null;
  setPreviewModalFile: (file: FileItem | null) => void;
  deleteConfirmItem: ConversionHistoryItem | null;
  setDeleteConfirmItem: (item: ConversionHistoryItem | null) => void;
  clearDashboardConfirmOpen: boolean;
  setClearDashboardConfirmOpen: (open: boolean) => void;
  logoutConfirmOpen: boolean;
  setLogoutConfirmOpen: (open: boolean) => void;

  // Actions
  addFilesToQueue: (files: File[]) => void;
  removeFileFromQueue: (id: string) => void;
  clearQueue: () => void;
  convertSingleFile: (fileItem: FileItem) => Promise<void>;
  convertAllActiveFiles: () => Promise<void>;
  handleLogin: (email: string, pass: string) => Promise<boolean>;
  handleSignUp: (email: string, pass: string, name?: string) => Promise<boolean>;
  handleGoogleLogin: () => Promise<boolean>;
  handleLogout: () => Promise<void>;
  handleResetPassword: (email: string) => Promise<boolean>;
  handleSendMagicLink: (email: string) => Promise<boolean>;
  handleVerifyMagicLink: () => Promise<boolean>;
  handleUpgradePlan: (plan: PlanTier) => void;
  handleDeleteDashboardItem: (id: string) => Promise<void>;
  handleClearDashboard: () => Promise<void>;
  handleGenerateApiKey: () => void;
  handleResendVerification: () => Promise<void>;
  handleCheckVerification: () => Promise<void>;
}

const defaultSettings: ConversionSettings = {
  outputFormat: 'pdf',
  pageSize: 'a4',
  orientation: 'portrait',
  margin: 'normal',
  quality: 'high',
  watermarkText: '',
  imageFit: 'contain',
  addPageNumbers: true,
  theme: 'clean',
  outputFileName: '',
  jsonMode: 'report',
  mdPreserveHeadings: true,
  mdCodeBlocks: true,
  mdTables: true,
  mdLinks: true,
  htmlPreserveStyles: true,
  htmlIncludeImages: true,
  htmlBackgroundGraphics: false,
  preserveLayout: true,
};

const pageToPath: Record<string, string> = {
  landing: '/',
  convert: '/convert',
  dashboard: '/dashboard',
  pricing: '/pricing',
  account: '/account',
  auth: '/auth',
  tools: '/tools',
  'tools-pdf-compress': '/tools/compress',
  'tools-pdf-split': '/tools/split',
  'tools-pdf-merge': '/tools/merge',
  'tools-pdf-rotate': '/tools/rotate',
  'tools-pdf-protect': '/tools/protect',
  'tools-json': '/tools/json',
};

const pathToPage: Record<string, ActivePage> = Object.fromEntries(
  Object.entries(pageToPath).map(([page, path]) => [path, page as ActivePage])
) as Record<string, ActivePage>;

function getPageFromUrl(): ActivePage {
  const path = window.location.pathname;
  if (pathToPage[path]) return pathToPage[path];
  if (path.startsWith('/tools/convert/')) return `tools-convert${path.slice('/tools/convert'.length)}` as ActivePage;
  if (path === '/') return 'landing';
  return 'landing';
}

function getPathForPage(page: ActivePage): string {
  if (page.startsWith('tools-convert')) {
    const suffix = page.slice('tools-convert'.length);
    return `/tools/convert${suffix}`;
  }
  return pageToPath[page] || '/';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('ff_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('ff_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const [activePage, setActivePage] = useState<ActivePage>(getPageFromUrl);

  useEffect(() => {
    const handlePopState = () => {
      setActivePage(getPageFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const path = getPathForPage(activePage);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    window.scrollTo(0, 0);
  }, [activePage]);

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('ff_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.uid) return parsed;
      } catch {}
    }
    return null;
  });

  const [dashboard, setDashboard] = useState<ConversionHistoryItem[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  const [activeFiles, setActiveFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [settings, setSettings] = useState<ConversionSettings>(defaultSettings);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [previewModalFile, setPreviewModalFile] = useState<FileItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ConversionHistoryItem | null>(null);
  const [clearDashboardConfirmOpen, setClearDashboardConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = { ...toast, id, duration: toast.duration || 4000 };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<ConversionSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Fetch Dashboard (premium only)
  useEffect(() => {
    if (!user || user.plan === 'free') {
      setDashboard([]);
      return;
    }
    setIsLoadingDashboard(true);
    fetchConversionHistory(user.uid)
      .then((result) => setDashboard(result.items))
      .catch((err) => console.error('Failed to load dashboard', err))
      .finally(() => setIsLoadingDashboard(false));
  }, [user?.uid, user?.plan]);

  // Gate dashboard navigation for free users
  const handleSetActivePage = useCallback((page: ActivePage) => {
    if (page === 'dashboard' && user?.plan === 'free') {
      setUpgradeModalOpen(true);
      return;
    }
    setActivePage(page);
  }, [user?.plan]);

  const addFilesToQueue = useCallback((files: File[]) => {
    if (files.length === 0) return;

    const currentPlanTier = user?.plan || 'free';
    const planConfig = PRICING_PLANS.find((p) => p.id === currentPlanTier) || PRICING_PLANS[0];

    const newItems: FileItem[] = [];
    let sizeRejectedCount = 0;

    for (const f of files) {
      const sizeMB = f.size / (1024 * 1024);
      if (sizeMB > planConfig.maxFileSizeMB) {
        sizeRejectedCount++;
        continue;
      }
      const format = detectFormat(f.name, f.type);
      const item: FileItem = {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file: f, name: f.name, size: f.size, type: f.type, format,
        outputFormat: settings.outputFormat, progress: 0, status: 'idle',
        createdAt: Date.now(),
      };
      newItems.push(item);
    }

    if (sizeRejectedCount > 0) {
      addToast({
        type: 'warning', title: 'File size limit exceeded',
        message: `${sizeRejectedCount} file(s) exceeded the ${planConfig.maxFileSizeMB} MB limit for your ${planConfig.name} plan.`,
      });
    }

    if (newItems.length === 0) return;

    setActiveFiles((prev) => {
      const combined = [...prev, ...newItems];
      if (combined.length > 1) setIsBatchMode(true);
      return combined;
    });

    if (!selectedFile && newItems.length > 0) {
      setSelectedFile(newItems[0]);
    }

    addToast({
      type: 'info', title: 'Files ready',
      message: `Added ${newItems.length} file(s) to the conversion workspace.`,
    });
  }, [user?.plan, selectedFile, addToast, settings.outputFormat]);

  const removeFileFromQueue = useCallback((id: string) => {
    setActiveFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (filtered.length <= 1) setIsBatchMode(false);
      return filtered;
    });
    setSelectedFile((prev) => (prev?.id === id ? null : prev));
  }, []);

  const clearQueue = useCallback(() => {
    setActiveFiles([]);
    setSelectedFile(null);
    setIsBatchMode(false);
  }, []);

  const convertSingleFile = useCallback(
    async (fileItem: FileItem) => {
      setIsConverting(true);

      setActiveFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'converting', progress: 10 } : f))
      );
      if (selectedFile?.id === fileItem.id) {
        setSelectedFile((prev) => (prev ? { ...prev, status: 'converting', progress: 10 } : null));
      }

      try {
        const outputFmt = settings.outputFormat;
        const ext = outputFmt === 'pdf' ? 'pdf' : outputFmt === 'docx' ? 'docx' : outputFmt === 'html' ? 'html' : outputFmt === 'md' ? 'md' : 'txt';

        const result = await convertFile(fileItem, settings, (prog) => {
          setActiveFiles((prev) =>
            prev.map((f) => (f.id === fileItem.id ? { ...f, progress: prog } : f))
          );
          if (selectedFile?.id === fileItem.id) {
            setSelectedFile((prev) => (prev ? { ...prev, progress: prog } : null));
          }
        });

        const completedItem: FileItem = {
          ...fileItem, status: 'completed', progress: 100,
          outputBlob: result.blob, outputBlobUrl: result.blobUrl,
          outputSize: result.size, pageCount: result.pageCount,
          conversionTimeMs: result.conversionTimeMs,
        };

        setActiveFiles((prev) => prev.map((f) => (f.id === fileItem.id ? completedItem : f)));
        if (selectedFile?.id === fileItem.id) setSelectedFile(completedItem);

        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#00AEEF', '#0090CC', '#06b6d4', '#10b981'] });
        } catch {}

        addToast({
          type: 'success', title: 'Conversion Complete!',
          message: `${fileItem.name} → ${ext.toUpperCase()} (${result.pageCount} page${result.pageCount > 1 ? 's' : ''}) in ${(result.conversionTimeMs / 1000).toFixed(1)}s.`,
        });

        const outputName = settings.outputFileName?.trim()
          ? (settings.outputFileName.trim().includes('.') ? settings.outputFileName.trim() : `${settings.outputFileName.trim()}.${ext}`)
          : `${fileItem.name.replace(/\.[^/.]+$/, '')}.${ext}`;

        let permanentUrl = result.blobUrl;
        if (user && user.plan !== 'free' && result.blob) {
          try {
            permanentUrl = await uploadToStorage(user.uid, outputName, result.blob);
          } catch (e) {
            console.warn('Storage upload failed:', e);
          }
        }

        const planTier = (user?.plan || 'free') as PlanTier;
        const expiryData = (() => {
          if (planTier === 'free') return { expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), isPermanent: false };
          if (planTier === 'starter') return { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), isPermanent: false };
          if (planTier === 'professional') return { expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), isPermanent: false };
          return { expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), isPermanent: true };
        })();

        const DashboardEntry: ConversionHistoryItem = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          userId: user?.uid || 'guest-user',
          userPlan: planTier,
          originalFileName: fileItem.name,
          originalFormat: fileItem.format,
          originalSize: fileItem.size,
          fromFormat: fileItem.format,
          toFormat: outputFmt,
          outputFormat: outputFmt,
          outputFileName: outputName,
          outputSize: result.size,
          pageCount: result.pageCount,
          downloadUrl: permanentUrl,
          expiresAt: expiryData.expiresAt,
          isPermanent: expiryData.isPermanent,
          isDeleted: false,
          status: 'completed',
          createdAt: Date.now(),
          completedAt: Date.now(),
          conversionTimeMs: result.conversionTimeMs,
          downloadedCount: 0,
          metadata: { outputFormat: outputFmt, pageCount: result.pageCount, compression: 'standard', quality: settings.quality },
          searchableFileName: fileItem.name.toLowerCase(),
          tags: [],
          settings: { ...settings },
        };

        await saveConversionRecord(DashboardEntry);
        setDashboard((prev) => [DashboardEntry, ...prev]);

        if (user) {
          const updatedUser: UserProfile = {
            ...user,
            storageUsed: user.storageUsed + result.size,
            conversionsUsedThisMonth: user.conversionsUsedThisMonth + 1,
            lastActivityAt: new Date().toISOString(),
          };
          setUser(updatedUser);
          localStorage.setItem('ff_user', JSON.stringify(updatedUser));
          if (isFirebaseConfigured) {
            updateUserQuota(user.uid, 1, result.size).catch(() => {});
          }
        }
      } catch (err: any) {
        console.error('Conversion error:', err);
        const errorMsg = err?.message || 'Failed to convert file.';
        setActiveFiles((prev) =>
          prev.map((f) => f.id === fileItem.id ? { ...f, status: 'error', error: errorMsg, progress: 0 } : f)
        );
        if (selectedFile?.id === fileItem.id) {
          setSelectedFile((prev) => (prev ? { ...prev, status: 'error', error: errorMsg, progress: 0 } : null));
        }
        addToast({ type: 'error', title: 'Conversion Failed', message: errorMsg });
      } finally {
        setIsConverting(false);
      }
    },
    [settings, selectedFile, user, addToast]
  );

  const convertAllActiveFiles = useCallback(async () => {
    if (activeFiles.length === 0) return;
    setIsConverting(true);
    let successCount = 0;
    for (const item of activeFiles) {
      if (item.status === 'completed') continue;
      try {
        await convertSingleFile(item);
        successCount++;
      } catch (e) {
        console.error(`Error converting ${item.name}`, e);
      }
    }
    setIsConverting(false);
    if (successCount > 0) {
      addToast({ type: 'success', title: 'Batch Complete', message: `Successfully processed ${successCount} file(s).` });
    }
  }, [activeFiles, convertSingleFile, addToast]);

  const handleLogin = async (email: string, pass: string): Promise<boolean> => {
    try {
      const loggedUser = await loginWithEmail(email, pass);
      setUser(loggedUser);
      addToast({ type: 'success', title: 'Welcome Back!', message: `Signed in as ${loggedUser.displayName || loggedUser.email}` });
      setActivePage('convert');
      return true;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Authentication Failed', message: err?.message || 'Invalid email or password.' });
      return false;
    }
  };

  const handleSignUp = async (email: string, pass: string, name?: string): Promise<boolean> => {
    try {
      const newUser = await signUpWithEmail(email, pass, name);
      setUser(newUser);
      addToast({ type: 'success', title: 'Account Created', message: `Welcome to File2Flow, ${newUser.displayName}! Verification email sent to ${email}.` });
      setActivePage('convert');
      return true;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Sign Up Failed', message: err?.message || 'Unable to register account.' });
      return false;
    }
  };

  const handleGoogleLogin = async (): Promise<boolean> => {
    try {
      const googleUser = await loginWithGoogle();
      setUser(googleUser);
      addToast({ type: 'success', title: 'Google Sign In Successful', message: `Welcome ${googleUser.displayName}!` });
      setActivePage('convert');
      return true;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Google Sign In Failed', message: err?.message || 'Failed to authenticate with Google.' });
      return false;
    }
  };

  const handleSendMagicLink = async (email: string): Promise<boolean> => {
    try {
      await sendMagicLink(email);
      addToast({ type: 'success', title: 'Verification Link Sent!', message: `Check your inbox at ${email} and click the link to sign in.` });
      return true;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Send Link', message: err?.message || 'Could not send verification link.' });
      return false;
    }
  };

  const handleVerifyMagicLink = async (): Promise<boolean> => {
    try {
      const profile = await completeMagicLinkSignIn();
      if (profile) {
        setUser(profile);
        addToast({ type: 'success', title: 'Sign In Successful', message: `Welcome ${profile.displayName}!` });
        setActivePage('convert');
        return true;
      }
      return false;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Sign In Failed', message: err?.message || 'Invalid or expired verification link.' });
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await logoutFirebase();
      setUser(null);
      addToast({ type: 'info', title: 'Signed Out', message: 'You have been successfully logged out.' });
      setActivePage('landing');
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPassword = async (email: string): Promise<boolean> => {
    try {
      await resetFirebasePassword(email);
      addToast({ type: 'success', title: 'Password Reset Link Sent', message: `Check your inbox at ${email} for reset instructions.` });
      return true;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reset Failed', message: err?.message || 'Could not send reset email.' });
      return false;
    }
  };

  const handleUpgradePlan = (plan: PlanTier) => {
    if (!user) {
      setActivePage('auth');
      addToast({ type: 'info', title: 'Sign in required', message: 'Please create an account to choose a subscription plan.' });
      return;
    }

    const defaults = PLAN_DEFAULTS[plan];
    const updated: UserProfile = {
      ...user,
      plan,
      conversionsLimitPerMonth: defaults.conversionsLimitPerMonth,
      storageLimit: defaults.storageLimit,
      historyRetentionDays: defaults.historyRetentionDays,
      isPermanentStorage: defaults.isPermanentStorage,
      subscription: {
        status: plan === 'free' ? 'none' : 'active',
        plan: plan === 'free' ? null : plan,
        cancelAtPeriodEnd: false,
      },
    };
    setUser(updated);
    localStorage.setItem('ff_user', JSON.stringify(updated));
    if (isFirebaseConfigured) {
      saveUserProfile(updated).catch(() => {});
    }

    try {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    } catch {}

    addToast({ type: 'success', title: 'Plan Upgraded!', message: `Your account is now on the ${plan.toUpperCase()} tier.` });
    setUpgradeModalOpen(false);
  };

  const handleDeleteDashboardItem = async (id: string) => {
    try {
      await deleteConversionRecord(id);
      setDashboard((prev) => prev.filter((item) => item.id !== id));
      addToast({ type: 'info', title: 'Record Deleted', message: 'The conversion record was removed.' });
      setDeleteConfirmItem(null);
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to delete record.' });
    }
  };

  const handleClearDashboard = async () => {
    if (!user) return;
    try {
      await clearAllConversionRecords(user.uid);
      setDashboard([]);
      addToast({ type: 'info', title: 'Dashboard Cleared', message: 'All conversion records have been cleared.' });
      setClearDashboardConfirmOpen(false);
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to clear dashboard.' });
    }
  };

  const handleGenerateApiKey = () => {
    if (!user) return;
    const newKey = `ff_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const updated = { ...user, apiKey: newKey };
    setUser(updated);
    localStorage.setItem('ff_user', JSON.stringify(updated));
    addToast({ type: 'success', title: 'New API Key Generated', message: 'Your new REST API key is active. Keep it private!' });
  };

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      addToast({ type: 'info', title: 'Verification Email Sent', message: 'Check your inbox and click the verification link.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Send', message: err?.message || 'Could not resend verification email.' });
    }
  };

  const handleCheckVerification = async () => {
    try {
      const verified = await checkEmailVerified();
      if (verified && user) {
        const updated = { ...user, emailVerified: true };
        setUser(updated);
        localStorage.setItem('ff_user', JSON.stringify(updated));
        addToast({ type: 'success', title: 'Email Verified', message: 'Your email has been verified successfully!' });
      } else {
        addToast({ type: 'warning', title: 'Not Yet Verified', message: 'Please check your inbox and click the verification link.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Check Failed', message: err?.message || 'Could not verify email status.' });
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme, toggleTheme,
        activePage, setActivePage: handleSetActivePage,
        user, setUser,
        dashboard, isLoadingDashboard,
        activeFiles, selectedFile, setSelectedFile,
        isBatchMode, setIsBatchMode,
        settings, updateSettings,
        isConverting,
        toasts, addToast, removeToast,
        upgradeModalOpen, setUpgradeModalOpen,
        previewModalFile, setPreviewModalFile,
        deleteConfirmItem, setDeleteConfirmItem,
        clearDashboardConfirmOpen, setClearDashboardConfirmOpen,
        logoutConfirmOpen, setLogoutConfirmOpen,
        addFilesToQueue, removeFileFromQueue, clearQueue,
        convertSingleFile, convertAllActiveFiles,
        handleLogin, handleSignUp, handleGoogleLogin,
        handleSendMagicLink, handleVerifyMagicLink,
        handleLogout, handleResetPassword,
        handleUpgradePlan,
        handleDeleteDashboardItem, handleClearDashboard,
        handleGenerateApiKey,
        handleResendVerification, handleCheckVerification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};