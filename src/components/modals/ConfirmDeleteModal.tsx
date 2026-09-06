import React from 'react';
import { Trash2, AlertTriangle, LogOut, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ConfirmDeleteModal: React.FC = () => {
  const {
    deleteConfirmItem,
    setDeleteConfirmItem,
    clearDashboardConfirmOpen,
    setClearDashboardConfirmOpen,
    logoutConfirmOpen,
    setLogoutConfirmOpen,
    handleDeleteDashboardItem,
    handleClearDashboard,
    handleLogout,
  } = useApp();

  if (deleteConfirmItem) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <button onClick={() => setDeleteConfirmItem(null)} className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]/5">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Delete Conversion Record?</h3>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              Remove <span className="font-semibold text-[#334155]">"{deleteConfirmItem.originalFileName}"</span> from your dashboard?
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setDeleteConfirmItem(null)} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9]/5 transition-colors">
              Cancel
            </button>
            <button onClick={() => handleDeleteDashboardItem(deleteConfirmItem.id)} className="flex-1 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#DC2626]/80 text-[#0F172A] text-xs font-bold transition-all">
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (clearDashboardConfirmOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <button onClick={() => setClearDashboardConfirmOpen(false)} className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]/5">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Clear All Records?</h3>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              This will permanently delete all your conversion records. This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setClearDashboardConfirmOpen(false)} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9]/5 transition-colors">
              Cancel
            </button>
            <button onClick={handleClearDashboard} className="flex-1 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#DC2626]/80 text-[#0F172A] text-xs font-bold transition-all">
              Clear Everything
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (logoutConfirmOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#D97706]/10 text-[#D97706] flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <button onClick={() => setLogoutConfirmOpen(false)} className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]/5">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Sign Out?</h3>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              You will need to sign in again to access your account and dashboard.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setLogoutConfirmOpen(false)} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9]/5 transition-colors">
              Cancel
            </button>
            <button onClick={() => { setLogoutConfirmOpen(false); handleLogout(); }} className="flex-1 py-2.5 rounded-xl bg-white text-[#0F172A] text-xs font-bold transition-all">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
