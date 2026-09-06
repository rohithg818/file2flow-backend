import { SupportedFormat } from '../types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return formatDate(timestamp);
}

export function detectFormat(fileName: string, mimeType?: string): SupportedFormat {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (['docx', 'doc'].includes(ext)) return 'docx';
  if (['pptx', 'ppt'].includes(ext)) return 'pptx';
  if (['xlsx', 'xls'].includes(ext)) return 'xlsx';
  if (ext === 'json') return 'json';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext) || mimeType?.startsWith('image/')) return 'image';
  if (['md', 'markdown'].includes(ext)) return 'markdown';
  if (['html', 'htm'].includes(ext)) return 'html';
  if (ext === 'csv') return 'csv';
  if (ext === 'txt') return 'txt';
  if (ext === 'pdf') return 'pdf';

  return 'txt';
}

export function getFormatBadgeColor(format: SupportedFormat): { bg: string; text: string; border: string } {
  switch (format) {
    case 'docx':
      return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
    case 'pptx':
      return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
    case 'xlsx':
    case 'csv':
      return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
    case 'image':
      return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' };
    case 'json':
      return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
    case 'markdown':
      return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' };
    case 'html':
      return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
  }
}
