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
 <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4 font-mono-code">
 <div className="w-14 h-14 mx-auto rounded-2xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
 <User className="w-7 h-7" />
 </div>
 <h2 className="text-xl font-bold font-display" style={{ color: '#0F172A' }}>
 Authentication Required
 </h2>
 <p className="text-xs" style={{ color: '#64748B' }}>
 Sign in or create a developer session to inspect API credentials, quotas, and preferences.
 </p>
 <button
 onClick={() => setActivePage('auth')}
 className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-sm transition-all"
 >
 Proceed to Sign In
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
 title: 'Secret Key Copied',
 message: 'Your API authorization key has been copied to your clipboard.',
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

 // Mock 7-day activity bars for visual personality
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
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6" style={{ borderBottomColor: '#E2E8F0' }}>
 <div>
 <div className="flex items-center gap-3">
 <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight" style={{ color: '#0F172A' }}>
 Developer Settings & Quota
 </h1>
 <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#2563EB]/10 text-[#2563EB] font-mono-code border border-[#2563EB]/30 uppercase">
 {user.plan} Tier
 </span>
 </div>
 <p className="text-xs sm:text-sm mt-1" style={{ color: '#334155' }}>
 Configure default vector presets, rotate API access tokens, and monitor compilation limits.
 </p>
 </div>

 <button
 onClick={() => setLogoutConfirmOpen(true)}
 className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold font-mono-code transition-colors self-start sm:self-auto" style={{ borderColor: 'rgba(220,38,38,0.3)', color: '#DC2626' }}
 >
 <LogOut className="w-4 h-4" />
 End Session
 </button>
 </div>

 {/* User Profile Card */}
 <div className="p-6 sm:p-7 rounded-3xl border shadow-xs" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
 
 <div className="flex items-center gap-4">
 {user.photoURL ? (
 <img
 src={user.photoURL}
 alt={user.displayName}
 className="w-16 h-16 rounded-2xl object-cover border-2 border-[#2563EB]/30 shadow-md"
 />
 ) : (
 <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#2563EB] via-teal-500 to-[#FFFFFF] text-[#2563EB] flex items-center justify-center text-xl font-black font-display shadow-md border border-[#2563EB]/30">
 {user.displayName?.charAt(0).toUpperCase() || 'U'}
 </div>
 )}

 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <h2 className="text-lg font-black font-display" style={{ color: '#0F172A' }}>
 {user.displayName}
 </h2>
 <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30 font-mono-code">
 UID: {user.uid.slice(0, 10)}...
 </span>
 </div>
 <div className="flex flex-wrap items-center gap-3 text-xs font-mono-code" style={{ color: '#64748B' }}>
 <span className="flex items-center gap-1">
 <Mail className="w-3.5 h-3.5 text-[#2563EB]" /> {user.email}
 </span>
 <span>•</span>
 <span className="flex items-center gap-1">
 <Calendar className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} /> Active since {new Date(user.createdAt).toLocaleDateString()}
 </span>
 </div>
 </div>
 </div>

 <button
 onClick={() => setUpgradeModalOpen(true)}
 className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-md shadow-[#2563EB]/20 transition-all self-start sm:self-auto font-mono-code"
 >
 <Sparkles className="w-4 h-4 text-orange-400" />
 Switch Subscription Plan
 </button>
 </div>
 </div>

 {/* METRICS & USAGE VISUALIZATION */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 
 {/* Storage Usage Card */}
 <div className="p-6 rounded-3xl border shadow-xs space-y-4 font-mono-code" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider" style={{ color: '#0F172A' }}>
 <HardDrive className="w-4 h-4 text-[#2563EB]" />
 Memory Allocation
 </h3>
 <span className="text-xs font-bold text-[#2563EB]">
 {storagePercent}%
 </span>
 </div>

 <div className="space-y-2">
 <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
 <div
 className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] h-full rounded-full transition-all duration-300"
 style={{ width: `${Math.max(storagePercent, 6)}%` }}
 />
 </div>
 <div className="flex justify-between text-xs" style={{ color: '#64748B' }}>
 <span>{formatBytes(user.storageUsed)}</span>
 <span>Limit: {currentPlan.storageGB >= 1 ? `${currentPlan.storageGB} GB` : `${currentPlan.storageGB * 1000} MB`}</span>
 </div>
 </div>

 <p className="text-[11px] leading-relaxed font-sans" style={{ color: '#94A3B8' }}>
 Ephemeral buffer allocated to your active tab conversions and recent vector caches.
 </p>
 </div>

 {/* Monthly Conversions Meter */}
 <div className="p-6 rounded-3xl border shadow-xs space-y-4 font-mono-code" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider" style={{ color: '#0F172A' }}>
 <FileText className="w-4 h-4 text-orange-500" />
 Monthly Conversions
 </h3>
 <span className="text-xs font-bold text-orange-500">
 {user.conversionsUsedThisMonth} / {currentPlan.monthlyConversions}
 </span>
 </div>

 <div className="space-y-2">
 <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
 <div
 className="bg-orange-500 h-full rounded-full transition-all duration-300"
 style={{ width: `${Math.max(convPercent, 8)}%` }}
 />
 </div>
 <div className="flex justify-between text-xs" style={{ color: '#64748B' }}>
 <span>{user.conversionsUsedThisMonth} completed</span>
 <span>Resets on 1st of month</span>
 </div>
 </div>

 <p className="text-[11px] leading-relaxed font-sans" style={{ color: '#94A3B8' }}>
 Conversion output files tracked across web and REST endpoints.
 </p>
 </div>

 {/* 7-Day Activity Sparkline */}
 <div className="p-6 rounded-3xl border shadow-xs space-y-4 font-mono-code" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider" style={{ color: '#0F172A' }}>
 <Activity className="w-4 h-4 text-[#2563EB]" />
 Weekly Velocity
 </h3>
 <span className="text-xs font-bold text-emerald-500">+18% vs avg</span>
 </div>

 <div className="flex items-end justify-between gap-2 h-16 pt-2">
 {activityDays.map((item) => {
 const heightPercent = Math.round((item.count / maxDayCount) * 100);
 return (
 <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5">
 <div className="w-full rounded-md h-12 flex items-end p-0.5" style={{ background: '#F1F5F9' }}>
 <div
 className="w-full bg-[#2563EB]/10[#2563EB]/100 rounded-sm transition-all duration-500 hover:bg-orange-500"
 style={{ height: `${heightPercent}%` }}
 title={`${item.count} conversions on ${item.day}`}
 />
 </div>
 <span className="text-[10px] font-mono-code" style={{ color: '#94A3B8' }}>{item.day}</span>
 </div>
 );
 })}
 </div>

 <p className="text-[11px] font-sans" style={{ color: '#94A3B8' }}>
 Compilation frequency across active client sessions.
 </p>
 </div>

 </div>

 {/* DEVELOPER API KEY MANAGEMENT */}
 <div className="p-6 sm:p-7 rounded-3xl border shadow-xs space-y-5 font-mono-code" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div>
 <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
 <Key className="w-4 h-4 text-orange-500" />
 Developer API Key & Automation
 </h3>
 <p className="text-xs mt-0.5 font-sans" style={{ color: '#64748B' }}>
 Authenticate programmatic HTTP conversions from GitHub Actions, microservices, or headless jobs.
 </p>
 </div>

 <button
 onClick={handleGenerateApiKey}
 className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-colors self-start sm:self-auto" style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
 >
 <RefreshCw className="w-3.5 h-3.5" />
 Rotate Key
 </button>
 </div>

 {/* API Key Input display */}
 <div className="flex items-center gap-2">
 <div className="relative flex-1">
 <input
 type={revealKey ? "text" : "password"}
 readOnly
 value={user.apiKey || 'ff_live_sec_981928371928371928'}
 className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs" style={{ borderColor: '#E2E8F0', background: '#FAFBFC', color: '#0F172A' }}
 />
 <button
 onClick={() => setRevealKey(prev => !prev)}
 className="absolute right-3 top-2.5" style={{ color: '#94A3B8' }}
 title={revealKey ? "Hide key" : "Show key"}
 >
 {revealKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>

 <button
 onClick={handleCopyKey}
 className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors shrink-0"
 >
 {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
 {copiedKey ? 'Copied' : 'Copy Key'}
 </button>
 </div>

 {/* Code Snippets Accordion / Tab Selector */}
 <div className="pt-2 border-t" style={{ borderTopColor: '#E2E8F0' }}>
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2 text-xs">
 {(['curl', 'node', 'python'] as const).map((tab) => (
 <button
 key={tab}
 onClick={() => setActiveSnippetTab(tab)}
 className={`px-3 py-1 rounded-lg uppercase text-[11px] font-bold ${
 activeSnippetTab === tab
 ? 'bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30'
 : ''
 }`}
 style={activeSnippetTab === tab ? undefined : { color: '#94A3B8' }}
 >
 {tab === 'curl' ? 'cURL' : tab === 'node' ? 'Node.js' : 'Python'}
 </button>
 ))}
 </div>

 <button
 onClick={handleCopySnippet}
 className="text-[#2563EB] text-xs font-bold hover:underline flex items-center gap-1"
 >
 {copiedCurl ? 'Copied code!' : 'Copy snippet'}
 </button>
 </div>

 <div className="p-4 rounded-2xl bg-slate-50 text-[#2563EB] text-[11px] overflow-x-auto border border-slate-200 shadow-inner">
 <pre>{getSnippet()}</pre>
 </div>
 </div>
 </div>

 {/* DEFAULT CONVERSION PREFERENCES */}
 <div className="p-6 sm:p-7 rounded-3xl border shadow-xs space-y-4 font-mono-code" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
 <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
 <Sliders className="w-4 h-4 text-[#2563EB]" />
 Default Rendering Presets
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label className="block text-xs font-bold mb-1.5" style={{ color: '#0F172A' }}>
 Default Page Size
 </label>
 <select
 value={settings.pageSize}
 onChange={(e) => {
 updateSettings({ pageSize: e.target.value as any });
 addToast({ type: 'info', title: 'Preset Saved', message: `Page size default set to ${e.target.value.toUpperCase()}` });
 }}
 className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none" style={{ borderColor: '#E2E8F0', background: '#FAFBFC', color: '#0F172A' }}
 >
 <option value="a4">A4 (ISO 210 × 297 mm)</option>
 <option value="letter">US Letter (8.5 × 11 in)</option>
 <option value="legal">US Legal (8.5 × 14 in)</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-bold mb-1.5" style={{ color: '#0F172A' }}>
 Default Orientation
 </label>
 <select
 value={settings.orientation}
 onChange={(e) => {
 updateSettings({ orientation: e.target.value as any });
 addToast({ type: 'info', title: 'Preset Saved', message: `Default orientation set to ${e.target.value}` });
 }}
 className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none" style={{ borderColor: '#E2E8F0', background: '#FAFBFC', color: '#0F172A' }}
 >
 <option value="portrait">Portrait (Vertical)</option>
 <option value="landscape">Landscape (Horizontal)</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-bold mb-1.5" style={{ color: '#0F172A' }}>
 Default Margin Padding
 </label>
 <select
 value={settings.margin}
 onChange={(e) => {
 updateSettings({ margin: e.target.value as any });
 addToast({ type: 'info', title: 'Preset Saved', message: `Default margins set to ${e.target.value}` });
 }}
 className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none" style={{ borderColor: '#E2E8F0', background: '#FAFBFC', color: '#0F172A' }}
 >
 <option value="normal">Normal (15 mm padding)</option>
 <option value="narrow">Narrow (8 mm compact)</option>
 <option value="wide">Wide (25 mm presentation)</option>
 <option value="none">Zero Margins (Edge-to-edge)</option>
 </select>
 </div>
 </div>
 </div>

 {/* DANGER ZONE */}
 <div className="p-6 rounded-3xl border space-y-3 font-mono-code" style={{ background: 'rgba(220,38,38,0.05)', borderColor: 'rgba(220,38,38,0.2)' }}>
 <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: '#DC2626' }}>
 <AlertTriangle className="w-4 h-4" style={{ color: '#DC2626' }} />
 Maintenance & Storage Reset
 </h4>
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <p className="text-xs font-sans" style={{ color: '#334155' }}>
 Wipe all local conversion blobs, timeline indices, and temporary caches from memory.
 </p>
 <button
 onClick={() => setClearDashboardConfirmOpen(true)}
 className="px-4 py-2 rounded-xl border text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5" style={{ borderColor: 'rgba(220,38,38,0.3)', color: '#DC2626' }}
 >
 <Trash2 className="w-3.5 h-3.5" />
 Purge Local Caches
 </button>
 </div>
 </div>

 </div>
 );
};
