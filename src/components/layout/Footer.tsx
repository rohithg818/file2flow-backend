import React from 'react';
import { Layers, Linkedin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActivePage } from '../../types';

export const Footer: React.FC = () => {
 const { setActivePage } = useApp();

 return (
 <footer className="relative w-full" style={{ background: 'var(--color-body)', borderTop: '1px solid var(--color-border)' }}>
 {/* Top gradient line */}
 <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2563EB]/20 to-transparent" />

 <div className="max-w-7xl mx-auto px-8 py-20">
 <div className="flex flex-col md:flex-row justify-between items-start gap-12">
 
  <div className="space-y-4">
  <div className="flex items-center gap-2">
  <img src="/images/logo.png" alt="File2Flow" className="h-10 w-auto" />
  <div className="flex items-baseline gap-0.5">
  <span className="text-lg font-bold text-[#0F172A] tracking-tight">File</span>
  <span className="text-lg font-extrabold" style={{ color: '#DC2626' }}>2</span>
  <span className="text-lg font-bold" style={{ color: '#2563EB' }}>Flow</span>
  </div>
  </div>
  <p className="text-sm max-w-xs leading-relaxed" style={{ color: '#64748B' }}>
  A lightweight browser-first tool for turning your documents, spreadsheets, data, and images into neat output files.
  </p>
  </div>

 <div className="flex flex-wrap gap-12">
 <div className="space-y-3">
 <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#334155' }}>Product</h4>
 <ul className="space-y-2.5 text-sm" style={{ color: '#64748B' }}>
 <li>
 <button onClick={() => setActivePage('convert')} className="hover:text-[#0F172A] transition-colors">
 Converter
 </button>
 </li>
 <li>
 <button onClick={() => setActivePage('pricing')} className="hover:text-[#0F172A] transition-colors">
 Pricing
 </button>
 </li>
 <li>
 <button onClick={() => setActivePage('convert')} className="hover:text-[#0F172A] transition-colors">
 Batch Mode
 </button>
 </li>
 </ul>
 </div>

 <div className="space-y-3">
 <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#334155' }}>Resources</h4>
 <ul className="space-y-2.5 text-sm" style={{ color: '#64748B' }}>
 <li>
 <button onClick={() => setActivePage('convert')} className="hover:text-[#0F172A] transition-colors">
 Supported Formats
 </button>
 </li>
 <li>
 <button onClick={() => setActivePage('pricing')} className="hover:text-[#0F172A] transition-colors">
 Plan Limits
 </button>
 </li>
  <li>
  <button onClick={() => setActivePage('convert')} className="hover:text-[#0F172A] transition-colors">
  Output Options
  </button>
  </li>
 </ul>
 </div>

 <div className="space-y-3">
 <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#334155' }}>Legal</h4>
 <ul className="space-y-2.5 text-sm" style={{ color: '#64748B' }}>
 <li><a href="#" className="hover:text-[#0F172A] transition-colors">Privacy Policy</a></li>
 <li><a href="#" className="hover:text-[#0F172A] transition-colors">Terms of Service</a></li>
 </ul>
 </div>
 </div>
 </div>

 <div className="mt-14 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderTop: '1px solid var(--color-border)' }}>
 <p className="text-sm" style={{ color: '#64748B' }}>
 © {new Date().getFullYear()} File2Flow. All rights reserved.
 </p>
 <div className="flex items-center gap-4">
 <a href="https://www.linkedin.com/company/143682926" target="_blank" rel="noopener noreferrer"
   className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity" style={{ color: '#64748B' }}>
   <Linkedin className="w-4 h-4" /> LinkedIn
 </a>
 <p className="text-sm" style={{ color: '#64748B' }}>
   Built for clean, lightweight document conversion.
 </p>
 </div>
 </div>
 </div>
 </footer>
 );
};
