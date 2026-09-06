import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Search,
  Download,
  Trash2,
  FileText,
  CheckCircle2,
  Layers,
  HardDrive,
  UploadCloud,
  Calendar,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Sparkles,
  Crown,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Archive,
  Server,
  Lock as LockIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate, formatBytes, formatDuration, formatTimeAgo, getFormatBadgeColor } from '../../utils/formatters';
import { ConversionHistoryItem, SupportedFormat, OutputFormat } from '../../types';
import { PRICING_PLANS } from '../../data/plans';

const ITEMS_PER_PAGE = 20;

type SortOption = 'date-desc' | 'date-asc' | 'name-az' | 'name-za' | 'size-desc' | 'size-asc';

function getFormatIcon(format: SupportedFormat) {
  switch (format) {
    case 'docx': return FileText;
    case 'xlsx':
    case 'csv': return FileSpreadsheet;
    case 'markdown':
    case 'html':
    case 'json': return FileCode;
    case 'image': return ImageIcon;
    default: return FileText;
  }
}

function getOutputBadgeColor(format: OutputFormat) {
  switch (format) {
    case 'pdf': return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
    case 'docx': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
    case 'html': return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
    case 'md': return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' };
    case 'txt': return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
    default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
  }
}

// Skeleton loader
function StatCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl border animate-pulse" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded" style={{ background: '#E2E8F0' }} />
          <div className="h-7 w-16 rounded" style={{ background: '#E2E8F0' }} />
        </div>
        <div className="w-10 h-10 rounded-xl" style={{ background: '#E2E8F0' }} />
      </div>
    </div>
  );
}

function ConversionCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl border animate-pulse" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl" style={{ background: '#E2E8F0' }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded" style={{ background: '#E2E8F0' }} />
          <div className="h-3 w-1/2 rounded" style={{ background: '#E2E8F0' }} />
        </div>
      </div>
      <div className="h-3 w-full rounded mt-3" style={{ background: '#E2E8F0' }} />
    </div>
  );
}

export const DashboardPage: React.FC = () => {
  const {
    dashboard,
    user,
    setDeleteConfirmItem,
    setClearDashboardConfirmOpen,
    setActivePage,
    setUpgradeModalOpen,
    isLoadingDashboard,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  const isPaid = user && user.plan !== 'free';
  const planConfig = PRICING_PLANS.find((p) => p.id === (user?.plan || 'free'));

  const filteredItems = useMemo(() => {
    return dashboard
      .filter((item) => {
        const matchesSearch = item.originalFileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.outputFileName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFormat = formatFilter === 'all' || item.originalFormat === formatFilter;
        return matchesSearch && matchesFormat;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date-desc': return b.createdAt - a.createdAt;
          case 'date-asc': return a.createdAt - b.createdAt;
          case 'name-az': return a.originalFileName.localeCompare(b.originalFileName);
          case 'name-za': return b.originalFileName.localeCompare(a.originalFileName);
          case 'size-desc': return b.originalSize - a.originalSize;
          case 'size-asc': return a.originalSize - b.originalSize;
          default: return 0;
        }
      });
  }, [dashboard, searchTerm, formatFilter, sortBy]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const groupedItems = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - 6 * 86400000;

    const groups: { [key: string]: ConversionHistoryItem[] } = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Older': [],
    };

    paginatedItems.forEach((item) => {
      if (item.createdAt >= startOfToday) groups['Today'].push(item);
      else if (item.createdAt >= startOfYesterday) groups['Yesterday'].push(item);
      else if (item.createdAt >= startOfWeek) groups['This Week'].push(item);
      else groups['Older'].push(item);
    });

    return groups;
  }, [paginatedItems]);

  const totalOutputBytes = dashboard.reduce((acc, curr) => acc + (curr.outputSize || 0), 0);
  const totalInputBytes = dashboard.reduce((acc, curr) => acc + (curr.originalSize || 0), 0);
  const storageUsedGB = isPaid ? (user?.storageUsed || 0) / (1024 * 1024 * 1024) : 0;
  const storageLimitGB = planConfig?.storageGB || 0;
  const storagePercent = isPaid && storageLimitGB > 0 ? Math.min(Math.round((storageUsedGB / storageLimitGB) * 100), 100) : 0;
  const storageUsedDisplay = formatBytes(user?.storageUsed || 0);
  const storageLimitDisplay = storageLimitGB >= 1024 ? `${(storageLimitGB / 1024).toFixed(0)} TB` : storageLimitGB >= 1 ? `${storageLimitGB} GB` : storageLimitGB > 0 ? `${storageLimitGB * 1024} MB` : '0 MB';

  const handleDownload = useCallback((item: ConversionHistoryItem) => {
    setDownloadedIds((prev) => new Set(prev).add(item.id));
    setTimeout(() => {
      setDownloadedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 2000);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFormatFilter('all');
    setSortBy('date-desc');
    setCurrentPage(1);
  }, []);

  // Premium gate
  if (!user || user.plan === 'free') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full text-center space-y-8"
        >
          <div className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37, 99, 235, 0.08)' }}>
            <Crown className="w-12 h-12" style={{ color: '#2563EB' }} />
          </div>
          <div>
            <h2 className="text-3xl font-bold font-display text-[#0F172A] mb-4">
              Dashboard is a Premium Feature
            </h2>
            <p className="text-base leading-relaxed" style={{ color: '#64748B' }}>
              Upgrade to Individual or Company to access your full conversion dashboard with history, analytics, and re-download capabilities.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="px-8 py-4 rounded-full font-semibold text-base text-[#0F172A] transition-all hover:brightness-125 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(0deg, #1D4ED8 0%, #2563EB 100%)',
                boxShadow: '0px 0px 20px rgba(0, 144, 204, 0.3)',
              }}
            >
              <Sparkles className="w-5 h-5" />
              Upgrade Now
            </button>
            <button
              onClick={() => setActivePage('convert')}
              className="px-8 py-4 rounded-full font-semibold text-base transition-colors flex items-center justify-center gap-2"
              style={{ color: '#334155', background: 'rgba(241,245,249,0.05)', border: '1px solid #E2E8F0' }}
            >
              Back to Convert
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Loading state
  if (isLoadingDashboard) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded" style={{ background: '#E2E8F0' }} />
          <div className="h-4 w-72 rounded" style={{ background: '#E2E8F0' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="space-y-3">
          <ConversionCardSkeleton />
          <ConversionCardSkeleton />
          <ConversionCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: '#E2E8F0' }}>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[#0F172A]">
              Dashboard
            </h1>
            <span className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
              {dashboard.length} Record{dashboard.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-base mt-1.5" style={{ color: '#64748B' }}>
            Track conversions, re-download outputs, and manage your conversion history.
          </p>
        </div>

        {dashboard.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setClearDashboardConfirmOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors hover:bg-[#DC2626]/10"
              style={{ borderColor: 'rgba(255,83,83,0.3)', color: '#DC2626' }}
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
            <button
              onClick={() => setActivePage('convert')}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[#0F172A] text-sm font-bold transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(0deg, #1D4ED8 0%, #2563EB 100%)' }}
            >
              <UploadCloud className="w-4 h-4" />
              New Conversion
            </button>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Conversions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border flex items-center justify-between transition-all hover:shadow-lg"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Total Conversions</span>
            <p className="text-3xl font-bold font-display text-[#0F172A] mt-1">{dashboard.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(37, 99, 235, 0.1)' }}>
            <Clock className="w-6 h-6" style={{ color: '#2563EB' }} />
          </div>
        </motion.div>

        {/* Total Output Size */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-6 rounded-2xl border flex items-center justify-between transition-all hover:shadow-lg"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Total Output Size</span>
            <p className="text-3xl font-bold font-display mt-1" style={{ color: '#2563EB' }}>{formatBytes(totalOutputBytes)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(217,119,6,0.1)' }}>
            <Archive className="w-6 h-6" style={{ color: '#D97706' }} />
          </div>
        </motion.div>

        {/* Storage Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl border transition-all hover:shadow-lg"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Storage Status</span>
            {isPaid ? (
              <span className="text-sm font-bold" style={{ color: '#2563EB' }}>{storagePercent}%</span>
            ) : (
              <LockIcon className="w-4 h-4" style={{ color: '#64748B' }} />
            )}
          </div>
          {isPaid ? (
            <div className="space-y-2">
              <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${storagePercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #1D4ED8, #2563EB)' }}
                />
              </div>
              <p className="text-sm" style={{ color: '#64748B' }}>
                {storageUsedDisplay} / {storageLimitDisplay}
              </p>
            </div>
          ) : (
            <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#059669' }}>
              <CheckCircle2 className="w-4 h-4" /> 100% Local
            </p>
          )}
        </motion.div>
      </div>

      {/* Controls Row */}
      <div className="p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
          <input
            type="text"
            placeholder="Search by file name..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 transition-all"
            style={{ background: '#FAFBFC', borderColor: '#E2E8F0', '--tw-ring-color': 'rgba(37,99,235,0.2)' } as any}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Format Filter */}
          <div className="relative">
            <select
              value={formatFilter}
              onChange={(e) => { setFormatFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-xs text-[#334155] focus:outline-none cursor-pointer"
              style={{ background: '#FAFBFC', borderColor: '#E2E8F0' }}
            >
              <option value="all">All Formats</option>
              <option value="docx">DOCX</option>
              <option value="pptx">PPTX</option>
              <option value="xlsx">XLSX</option>
              <option value="image">Images</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="csv">CSV</option>
              <option value="txt">TXT</option>
              <option value="pdf">PDF</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#64748B' }} />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-xs text-[#334155] focus:outline-none cursor-pointer"
              style={{ background: '#FAFBFC', borderColor: '#E2E8F0' }}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-az">A-Z</option>
              <option value="name-za">Z-A</option>
              <option value="size-desc">Largest First</option>
              <option value="size-asc">Smallest First</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#64748B' }} />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#FAFBFC' }}>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'timeline' ? 'font-bold text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
              style={viewMode === 'timeline' ? { background: '#2563EB' } : {}}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'table' ? 'font-bold text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
              style={viewMode === 'table' ? { background: '#2563EB' } : {}}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredItems.length > 0 ? (
        <>
          {viewMode === 'timeline' ? (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([groupTitle, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={groupTitle} className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>
                      <Calendar className="w-3.5 h-3.5" style={{ color: '#2563EB' }} />
                      <span>{groupTitle} ({items.length})</span>
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence>
                        {items.map((item) => {
                          const Icon = getFormatIcon(item.originalFormat);
                          const inputBadge = getFormatBadgeColor(item.originalFormat);
                          const outputBadge = getOutputBadgeColor(item.outputFormat);
                          const isDownloaded = downloadedIds.has(item.id);

                          return (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="p-4 sm:p-5 rounded-2xl border transition-all hover:shadow-lg"
                              style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
                            >
                              {/* Row 1: File info + date */}
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.08)' }}>
                                    <Icon className="w-5 h-5" style={{ color: '#2563EB' }} />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-[#0F172A] truncate">
                                      {item.originalFileName}
                                    </h4>
                                    <p className="text-[11px] truncate" style={{ color: '#64748B' }}>
                                      {isPaid ? formatTimeAgo(item.createdAt) : formatDate(item.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Row 2: Format conversion arrow */}
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${inputBadge.bg} ${inputBadge.text} ${inputBadge.border}`}>
                                  {item.originalFormat.toUpperCase()}
                                </span>
                                <ArrowRight className="w-3 h-3" style={{ color: '#64748B' }} />
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${outputBadge.bg} ${outputBadge.text} ${outputBadge.border}`}>
                                  {item.outputFormat.toUpperCase()}
                                </span>
                              </div>

                              {/* Row 3: Stats + actions */}
                              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#E2E8F0' }}>
                                <div className="flex items-center gap-4 text-[11px]" style={{ color: '#64748B' }}>
                                  <span>In: <strong className="text-[#334155]">{formatBytes(item.originalSize)}</strong></span>
                                  <span>Out: <strong className="text-[#334155]">{formatBytes(item.outputSize)}</strong></span>
                                  <span>{formatDuration(item.conversionTimeMs)}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Download */}
                                  {item.downloadUrl && (
                                    <a
                                      href={item.downloadUrl}
                                      download={item.outputFileName}
                                      onClick={() => handleDownload(item)}
                                      className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all hover:brightness-110"
                                      style={{
                                        background: isDownloaded ? 'rgba(5,150,105,0.15)' : 'rgba(37,99,235,0.1)',
                                        color: isDownloaded ? '#059669' : '#2563EB',
                                      }}
                                    >
                                      {isDownloaded ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3" />
                                          Saved
                                        </>
                                      ) : (
                                        <>
                                          <Download className="w-3 h-3" />
                                          Download
                                        </>
                                      )}
                                    </a>
                                  )}

                                  {/* Delete */}
                                  <button
                                    onClick={() => setDeleteConfirmItem(item)}
                                    className="p-1.5 rounded-lg transition-colors hover:bg-[#DC2626]/10"
                                    style={{ color: '#64748B' }}
                                    title="Delete record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border overflow-hidden"
              style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead style={{ background: '#FAFBFC' }}>
                    <tr className="border-b text-[10px] uppercase tracking-wider" style={{ borderColor: '#E2E8F0', color: '#64748B' }}>
                      <th className="py-3.5 px-5">Document</th>
                      <th className="py-3.5 px-4">From</th>
                      <th className="py-3.5 px-4">To</th>
                      <th className="py-3.5 px-4">Size</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => {
                      const inputBadge = getFormatBadgeColor(item.originalFormat);
                      const outputBadge = getOutputBadgeColor(item.outputFormat);
                      const isDownloaded = downloadedIds.has(item.id);

                      return (
                        <tr key={item.id} className="border-b transition-colors hover:bg-[#F8FAFC]/[0.02]" style={{ borderColor: '#E2E8F0' }}>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 shrink-0" style={{ color: '#2563EB' }} />
                              <div className="min-w-0">
                                <p className="font-bold text-[#0F172A] truncate max-w-[200px]">{item.originalFileName}</p>
                                <p className="text-[10px] truncate" style={{ color: '#64748B' }}>{item.outputFileName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${inputBadge.bg} ${inputBadge.text} ${inputBadge.border}`}>
                              {item.originalFormat.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${outputBadge.bg} ${outputBadge.text} ${outputBadge.border}`}>
                              {item.outputFormat.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-[#334155]">{formatBytes(item.outputSize)}</span>
                          </td>
                          <td className="py-4 px-4 text-[#64748B]">
                            {isPaid ? formatTimeAgo(item.createdAt) : formatDate(item.createdAt)}
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold flex items-center gap-1 text-[11px]" style={{ color: '#059669' }}>
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.downloadUrl && (
                                <a
                                  href={item.downloadUrl}
                                  download={item.outputFileName}
                                  onClick={() => handleDownload(item)}
                                  className="p-1.5 rounded-lg transition-colors"
                                  style={{ color: isDownloaded ? '#059669' : '#2563EB' }}
                                  title="Download"
                                >
                                  {isDownloaded ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                                </a>
                              )}
                              <button
                                onClick={() => setDeleteConfirmItem(item)}
                                className="p-1.5 rounded-lg transition-colors hover:bg-[#DC2626]/10"
                                style={{ color: '#64748B' }}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border transition-colors disabled:opacity-30"
                style={{ borderColor: '#E2E8F0', color: '#64748B' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                    style={
                      currentPage === page
                        ? { background: '#2563EB', color: 'white' }
                        : { color: '#64748B' }
                    }
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border transition-colors disabled:opacity-30"
                style={{ borderColor: '#E2E8F0', color: '#64748B' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-20 rounded-2xl border text-center space-y-5"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: '1px', borderStyle: 'dashed' }}
        >
          <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.06)' }}>
            <FileText className="w-10 h-10" style={{ color: '#2563EB', opacity: 0.5 }} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#0F172A] font-display">
              {searchTerm || formatFilter !== 'all' ? 'No matching records' : 'No conversions yet'}
            </h3>
            <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: '#64748B' }}>
              {searchTerm || formatFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Convert your first file to see records here.'}
            </p>
          </div>
          {(!searchTerm && formatFilter === 'all') ? (
            <button
              onClick={() => setActivePage('convert')}
              className="px-8 py-3 rounded-xl text-[#0F172A] text-sm font-bold transition-all hover:brightness-110 inline-flex items-center gap-2"
              style={{ background: 'linear-gradient(0deg, #1D4ED8 0%, #2563EB 100%)' }}
            >
              <UploadCloud className="w-4 h-4" />
              Start Converting
            </button>
          ) : (
            <button
              onClick={resetFilters}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-colors inline-flex items-center gap-2"
              style={{ color: '#2563EB', background: 'rgba(37,99,235,0.08)' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};
