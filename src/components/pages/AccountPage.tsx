import React, { useState } from 'react';
import { 
 motion, 
 AnimatePresence 
} from 'motion/react';
import { 
 User, 
 Mail, 
 Calendar, 
 HardDrive, 
 FileText, 
 Sparkles, 
 Key, 
 Copy, 
 Check, 
 RefreshCw, 
 LogOut, 
 ShieldCheck, 
 Sliders, 
 Code,
 Terminal,
 Download,
 AlertTriangle,
 Zap,
 Eye,
 EyeOff,
 Activity,
 Cpu,
 Flame,
 CheckCircle2,
 Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PRICING_PLANS } from '../../data/plans';
import { formatBytes, formatDate } from '../../utils/formatters';

export const AccountPage: React.FC = () => {
 const { 
 user, 
 dashboard, 
 setLogoutConfirmOpen, 
 setUpgradeModalOpen, 
 handleGenerateApiKey,
 addToast,
 settings,
 updateSettings,
 setActivePage,
 setClearDashboardConfirmOpen
 } = useApp();

 const [copiedKey, setCopiedKey] = useState(false);
 const [copiedCurl, setCopiedCurl] = useState(false);
 const [revealKey, setRevealKey] = useState(false);
 const [activeSnippetTab, setActiveSnippetTab] = useState<'curl' | 'node' | 'python'>('curl');

 if (!user) {
 return (
 <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
 <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
 <User className="w-7 h-7" style={{ color: '#2563EB' }} />
 </div>
 <h2 className="text-xl font-bold font-display" style={{ color: '#0F172A' }}>
 Sign In Required
 </h2>
 <p className="text-xs" style={{ color: '#64748B' }}>
 Sign in to access your account, API key, and conversion history.
 </p>
 <button
 onClick={() => setActivePage('auth')}
 className="px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all"
 style={{ background: '#2563EB' }}
 >
 Sign In
 </button>
 </div>
 );
 }

 const currentPlan = PRICING_PLANS.find((p) => p.id === user.plan) || PRICING_PLANS[0];
 const maxStorageBytes = currentPlan.storageGB * 1024 * 1024 * 1024;
 const storagePercent = Math.min(Math.round((user.storageUsed / maxStorageBytes) * 100), 100);

 const conversionsMax = typeof currentPlan.monthlyConversions === 'number' ? currentPlan.monthlyConversions : 1000;
 const convPercent = Math.min(Math.round((user.conversionsUsedThisMonth / conversionsMax) * 100), 100);

 const handleCopyKey = () => {
 if (user.apiKey) {
 navigator.clipboard.writeText(user.apiKey);
 setCopiedKey(true);
 addToast({
 type: 'success',
 title: 'API Key Copied',
 message: 'Your API key has been copied to your clipboard.',
 });
 setTimeout(() => setCopiedKey(false), 2000);
 }
 };

 const getSnippet = () => {
 const key = user.apiKey || 'ff_live_sec_99182371928371';
 switch (activeSnippetTab) {
 case 'curl':
 return `curl -X POST https://api.file2flow.app/v1/convert \\
 -H "Authorization: Bearer ${key}" \\
 -F "file=@document.docx" \\
 -F "outputFormat=pdf" \\
 -F "pageSize=a4" \\
 -F "margin=narrow" \\
 --output document.pdf`;
 case 'node':
 return `import { File2FlowClient } from '@file2flow/node';

const client = new File2FlowClient({ apiKey: '${key}' });
const result = await client.convert({
 file: './Financial_Report.xlsx',
 options: { outputFormat: 'pdf', pageSize: 'a4', orientation: 'landscape' }
});`;
 case 'python':
 return `import file2flow

client = file2flow.Client(api_key="${key}")
result = client.convert(
 file_path="Contract_Draft.docx",
 output_format="pdf",
 page_size="a4",
 watermark="CONFIDENTIAL"
)`;
 }
 };

 const handleCopySnippet = () => {
 navigator.clipboard.writeText(getSnippet());
 setCopiedCurl(true);
 addToast({
 type: 'info',
 title: 'Code Copied',
 message: `${activeSnippetTab.toUpperCase()} snippet copied to clipboard.`,
 });
 setTimeout(() => setCopiedCurl(false), 2000);
 };

 const activityDays = [
 { day: 'Mon', count: 4 },
 { day: 'Tue', count: 12 },
 { day: 'Wed', count: 8 },
 { day: 'Thu', count: 19 },
 { day: 'Fri', count: 15 },
 { day: 'Sat', count: 3 },
 { day: 'Sun', count: 6 }
 ];
 const maxDayCount = Math.max(...activityDays.map(d => d.count));

 return (
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
 
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: '#E2E8F0' }}>
 <div>
 <div className="flex items-center gap-3">
 <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight" style={{ color: '#0F172A' }}>
 Account Settings
 </h1>
 <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
 {user.plan} Plan
 </span>
 </div>
 <p className="text-xs sm:text-sm mt-1" style={{ color: '#64748B' }}>
 Manage your account, API key, and default conversion settings.
 </p>
 </div>

 <button
 onClick={() => setLogoutConfirmOpen(true)}
 className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-colors self-start sm:self-auto"
 style={{ borderColor: '#E2E8F0', color: '#64748B' }}
 >
 <LogOut className="w-4 h-4" />
 Sign Out
 </button>
 </div>

 {/* User Profile Card */}
 <div className="p-6 sm:p-7 rounded-2xl border" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
 
 <div className="flex items-center gap-4">
 {user.photoURL ? (
 <img
 src={user.photoURL}
 alt={user.displayName}
 className="w-16 h-16 rounded-2xl object-cover"
 />
 ) : (
 <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
 style={{ background: '#EFF6FF', color: '#2563EB' }}>
 {user.displayName?.charAt(0).toUpperCase() || 'U'}
 </div>
 )}

 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <h2 className="text-lg font-bold font-display" style={{ color: '#0F172A' }}>
 {user.displayName}
 </h2>
 </div>
 <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: '#64748B' }}>
 <span className="flex items-center gap-1">
 <Mail className="w-3.5 h-3.5" style={{ color: '#2563EB' }} /> {user.email}
 </span>
 <span>·</span>
 <span className="flex items-center gap-1">
 <Calendar className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} /> Member since {new Date(user.createdAt).toLocaleDateString()}
 </span>
 </div>
 </div>
 </div>

 <button
 onClick={() => setActivePage('pricing')}
 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
 style={{ background: '#2563EB' }}
 >
 <Sparkles className="w-4 h-4 text-orange-400" />
 Upgrade Plan
 </button>
 </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 
 {/* Storage */}
 <div className="p-6 rounded-2xl border space-y-4" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider" style={{ color: '#0F172A' }}>
 <HardDrive className="w-4 h-4" style={{ color: '#2563EB' }} />
 Storage Used
 </h3>
 <span className="text-xs font-bold" style={{ color: '#2563EB' }}>
 {storagePercent}%
 </span>
 </div>

 <div className="space-y-2">
 <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
 <div
 className="h-full rounded-full transition-all duration-300"
 style={{ width: `${Math.max(storagePercent, 6)}%`, background: 'linear-gradient(90deg, #1D4ED8, #2563EB)' }}
 />
 </div>
 <div className="flex justify-between text-xs" style={{ color: '#64748B' }}>
 <span>{formatBytes(user.storageUsed)}</span>
 <span>Limit: {currentPlan.storageGB >= 1 ? `${currentPlan.storageGB} GB` : `${currentPlan.storageGB * 1000} MB`}</span>
 </div>
 </div>

 <p className="text-[11px] leading-relaxed" style={{ color: '#94A3B8' }}>
 File storage used across your conversions.
 </p>
 </div>

 {/* Monthly Conversions */}
 <div className="p-6 rounded-2xl border space-y-4" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider" style={{ color: '#0F172A' }}>
 <FileText className="w-4 h-4" style={{ color: '#D97706' }} />
 Monthly Conversions
 </h3>
 <span className="text-xs font-bold" style={{ color: '#D97706' }}>
 {user.conversionsUsedThisMonth} / {currentPlan.monthlyConversions}
 </span>
 </div>

 <div className="space-y-2">
 <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
 <div
 className="h-full rounded-full transition-all duration-300"
 style={{ width: `${Math.max(convPercent, 8)}%`, background: '#F59E0B' }}
 />
 </div>
 <div className="flex justify-between text-xs" style={{ color: '#64748B' }}>
 <span>{user.conversionsUsedThisMonth} used</span>
 <span>Resets on 1st of month</span>
 </div>
 </div>

 <p className="text-[11px] leading-relaxed" style={{ color: '#94A3B8' }}>
 Files converted this month across all formats.
 </p>
 </div>

 {/* Activity */}
 <div className="p-6 rounded-2xl border space-y-4" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider" style={{ color: '#0F172A' }}>
 <Activity className="w-4 h-4" style={{ color: '#2563EB' }} />
 This Week
 </h3>
 </div>

 <div className="flex items-end justify-between gap-2 h-16 pt-2">
 {activityDays.map((item) => {
 const heightPercent = Math.round((item.count / maxDayCount) * 100);
 return (
 <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5">
 <div className="w-full rounded-md h-12 flex items-end p-0.5" style={{ background: '#F1F5F9' }}>
 <div
 className="w-full rounded-sm transition-all duration-500"
 style={{ height: `${heightPercent}%`, background: '#2563EB' }}
 title={`${item.count} conversions on ${item.day}`}
 />
 </div>
 <span className="text-[10px]" style={{ color: '#94A3B8' }}>{item.day}</span>
 </div>
 );
 })}
 </div>

 <p className="text-[11px]" style={{ color: '#94A3B8' }}>
 Your conversion activity over the past 7 days.
 </p>
 </div>

 </div>

 {/* API Key */}
 <div className="p-6 sm:p-7 rounded-2xl border space-y-5" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div>
 <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
 <Key className="w-4 h-4" style={{ color: '#D97706' }} />
 API Key
 </h3>
 <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
 Use this key to convert files programmatically via the API.
 </p>
 </div>

 <button
 onClick={handleGenerateApiKey}
 className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-colors self-start sm:self-auto"
 style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
 >
 <RefreshCw className="w-3.5 h-3.5" />
 Rotate Key
 </button>
 </div>

 <div className="flex items-center gap-2">
 <div className="relative flex-1">
 <input
 type={revealKey ? "text" : "password"}
 readOnly
 value={user.apiKey || 'ff_live_sec_981928371928371928'}
 className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs"
 style={{ borderColor: '#E2E8F0', background: '#FAFBFC', color: '#0F172A' }}
 />
 <button
 onClick={() => setRevealKey(prev => !prev)}
 className="absolute right-3 top-2.5"
 style={{ color: '#94A3B8' }}
 >
 {revealKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>

 <button
 onClick={handleCopyKey}
 className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-colors shrink-0"
 style={{ background: '#0F172A' }}
 >
 {copiedKey ? <Check className="w-4 h-4" style={{ color: '#34D399' }} /> : <Copy className="w-4 h-4" />}
 {copiedKey ? 'Copied' : 'Copy Key'}
 </button>
 </div>

 {/* Code Snippets */}
 <div className="pt-2 border-t" style={{ borderColor: '#F1F5F9' }}>
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2 text-xs">
 {(['curl', 'node', 'python'] as const).map((tab) => (
 <button
 key={tab}
 onClick={() => setActiveSnippetTab(tab)}
 className="px-3 py-1 rounded-lg text-[11px] font-bold"
 style={activeSnippetTab === tab
 ? { background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }
 : { color: '#94A3B8' }}
 >
 {tab === 'curl' ? 'cURL' : tab === 'node' ? 'Node.js' : 'Python'}
 </button>
 ))}
 </div>

 <button
 onClick={handleCopySnippet}
 className="text-xs font-bold hover:underline flex items-center gap-1"
 style={{ color: '#2563EB' }}
 >
 {copiedCurl ? 'Copied!' : 'Copy snippet'}
 </button>
 </div>

 <div className="p-4 rounded-xl text-[11px] overflow-x-auto"
 style={{ background: '#F8FAFC', color: '#2563EB', border: '1px solid #E2E8F0' }}>
 <pre>{getSnippet()}</pre>
 </div>
 </div>
 </div>

 {/* Default Settings */}
 <div className="p-6 sm:p-7 rounded-2xl border space-y-4" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
 <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
 <Sliders className="w-4 h-4" style={{ color: '#2563EB' }} />
 Default Settings
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label className="block text-xs font-bold mb-1.5" style={{ color: '#334155' }}>
 Page Size
 </label>
 <select
 value={settings.pageSize}
 onChange={(e) => {
 updateSettings({ pageSize: e.target.value as any });
 addToast({ type: 'info', title: 'Saved', message: `Page size set to ${e.target.value.toUpperCase()}` });
 }}
 className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none"
 style={{ borderColor: '#E2E8F0', background: '#FAFBFC', color: '#0F172A' }}
 >
 <option value="a4">A4</option>
 <option value="letter">US Letter</option>
 <option value="legal">US Legal</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-bold mb-1.5" style={{ color: '#334155' }}>
 Orientation
 </label>
 <select
 value={settings.orientation}
 onChange={(e) => {
 updateSettings({ orientation: e.target.value as any });
 addToast({ type: 'info', title: 'Saved', message: `Orientation set to ${e.target.value}` });
 }}
 className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none"
 style={{ borderColor: '#E2E8F0', background: '#FAFBFC', color: '#0F172A' }}
 >
 <option value="portrait">Portrait</option>
 <option value="landscape">Landscape</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-bold mb-1.5" style={{ color: '#334155' }}>
 Margins
 </label>
 <select
 value={settings.margin}
 onChange={(e) => {
 updateSettings({ margin: e.target.value as any });
 addToast({ type: 'info', title: 'Saved', message: `Margins set to ${e.target.value}` });
 }}
 className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none"
 style={{ borderColor: '#E2E8F0', background: '#FAFBFC', color: '#0F172A' }}
 >
 <option value="normal">Normal</option>
 <option value="narrow">Narrow</option>
 <option value="wide">Wide</option>
 <option value="none">None</option>
 </select>
 </div>
 </div>
 </div>

 {/* Danger Zone */}
 <div className="p-6 rounded-2xl border space-y-3" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
 <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: '#DC2626' }}>
 <AlertTriangle className="w-4 h-4" />
 Clear All Data
 </h4>
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <p className="text-xs" style={{ color: '#334155' }}>
 Clear all your conversion history and cached files from the dashboard.
 </p>
 <button
 onClick={() => setClearDashboardConfirmOpen(true)}
 className="px-4 py-2 rounded-xl border text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
 style={{ borderColor: 'rgba(220,38,38,0.3)', color: '#DC2626' }}
 >
 <Trash2 className="w-3.5 h-3.5" />
 Clear All Data
 </button>
 </div>
 </div>

 </div>
 );
};
