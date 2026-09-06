"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Menu, X, ChevronDown, LogOut, User as UserIcon, Sparkles, Layers } from "lucide-react"
import { useApp } from "../../context/AppContext"
import { ActivePage } from "../../types"

export const Navbar1: React.FC = () => {
  const { activePage, setActivePage, user, setLogoutConfirmOpen } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems: { id: ActivePage; label: string }[] = [
    { id: "convert", label: "Convert" },
    { id: "tools", label: "Tools" },
    { id: "dashboard", label: "Dashboard" },
    { id: "pricing", label: "Pricing" },
  ]

  const handleNav = (page: ActivePage) => {
    setActivePage(page)
    setIsOpen(false)
    setProfileOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'px-3 pt-3' : 'px-4 pt-4'}`}>
      <nav className={`mx-auto max-w-7xl flex items-center justify-between px-5 py-2.5 rounded-full transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-xl border border-[#E2E8F0] shadow-[0_2px_20px_rgba(0,0,0,0.08)]' 
          : 'bg-white/60 backdrop-blur-md border border-white/40'
      }`}>
        <button onClick={() => handleNav("landing")} className="flex items-center gap-2.5 group focus:outline-none cursor-pointer">
          <img src="/images/logo.png" alt="File2Flow" className="h-9 w-9 rounded-full object-cover" />
          <div className="flex items-baseline gap-0.5">
            <span className="text-[15px] font-bold tracking-tight" style={{ color: '#0F172A' }}>File</span>
            <span className="text-[15px] font-extrabold" style={{ color: '#EF4444' }}>2</span>
            <span className="text-[15px] font-bold" style={{ color: '#2563EB' }}>Flow</span>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activePage === item.id
            return (
              <button key={item.id} onClick={() => handleNav(item.id)}
                className={`relative px-4 py-2 text-[13px] font-semibold rounded-full transition-all ${isActive ? "text-[#2563EB]" : "text-[#64748B] hover:text-[#0F172A]"}`}>
                {item.label}
                {isActive && (
                  <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-full -z-10"
                    style={{ background: '#DBEAFE' }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }} />
                )}
              </button>
            )
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-[#F1F5F9] transition-colors">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-white flex items-center justify-center text-[11px] font-bold">
                    {user.displayName?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <span className="text-[13px] font-medium max-w-[100px] truncate" style={{ color: '#334155' }}>{user.displayName}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${profileOpen ? "rotate-180" : ""}`} style={{ color: '#94A3B8' }} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setProfileOpen(false)} />
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E2E8F0] shadow-xl p-1.5 z-30">
                      <div className="px-3 py-2.5 border-b border-[#F1F5F9] mb-1">
                        <p className="text-[13px] font-semibold truncate" style={{ color: '#0F172A' }}>{user.displayName}</p>
                        <p className="text-[11px] truncate" style={{ color: '#94A3B8' }}>{user.email}</p>
                      </div>
                      <button onClick={() => handleNav("account")}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[#F8FAFC] rounded-xl transition-colors text-left" style={{ color: '#334155' }}>
                        <UserIcon className="w-4 h-4" style={{ color: '#94A3B8' }} /> Account
                      </button>
                      <button onClick={() => { setProfileOpen(false); setActivePage('pricing') }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[#F8FAFC] rounded-xl transition-colors text-left" style={{ color: '#2563EB' }}>
                        <Sparkles className="w-4 h-4" /> Upgrade Plan
                      </button>
                      <div className="border-t border-[#F1F5F9] mt-1 pt-1">
                        <button onClick={() => { setProfileOpen(false); setLogoutConfirmOpen(true) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[#FEF2F2] rounded-xl transition-colors text-left" style={{ color: '#94A3B8' }}>
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => handleNav("auth")}
                className="px-4 py-2 text-[13px] font-medium rounded-full transition-colors" style={{ color: '#64748B' }}>
                Sign In
              </button>
              <button onClick={() => handleNav("convert")}
                className="px-5 py-2 text-[13px] font-semibold text-white rounded-full transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
                Get Started
              </button>
            </div>
          )}
        </div>

        <button className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F1F5F9]"
          onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
          {isOpen ? <X className="w-5 h-5" style={{ color: '#64748B' }} /> : <Menu className="w-5 h-5" style={{ color: '#64748B' }} />}
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mx-auto max-w-7xl mt-2 bg-white/95 backdrop-blur-xl border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 space-y-1">
              {navItems.map((item) => (
                <button key={item.id} onClick={() => handleNav(item.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${activePage === item.id ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                  {item.label}
                </button>
              ))}
              <div className="border-t border-[#F1F5F9] pt-3 mt-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-white flex items-center justify-center text-xs font-bold">
                          {user.displayName?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>{user.displayName}</p>
                        <p className="text-[11px]" style={{ color: '#94A3B8' }}>{user.email}</p>
                      </div>
                    </div>
                    <button onClick={() => handleNav("account")}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-medium hover:bg-[#F8FAFC]" style={{ color: '#334155' }}>Account</button>
                    <button onClick={() => { setIsOpen(false); setLogoutConfirmOpen(true) }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-medium hover:bg-[#FEF2F2]" style={{ color: '#94A3B8' }}>Sign out</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleNav("auth")}
                      className="w-full py-2.5 rounded-full text-[14px] font-medium transition-colors mb-2" style={{ color: '#334155', border: '1px solid #E2E8F0' }}>Sign In</button>
                    <button onClick={() => handleNav("convert")}
                      className="w-full py-2.5 rounded-full text-[14px] font-semibold text-white transition-all hover:brightness-110"
                      style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>Get Started</button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Navbar1
