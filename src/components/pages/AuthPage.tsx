import React, { useState } from 'react';
import { 
  Lock as LockIcon, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuthPage: React.FC = () => {
  const { 
    handleLogin, 
    handleSignUp, 
    handleGoogleLogin, 
    handleSendMagicLink,
    handleResetPassword, 
    setActivePage 
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (mode === 'forgot') {
      setLoading(true);
      const ok = await handleResetPassword(email);
      setLoading(false);
      if (ok) setResetSuccess(true);
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    let success = false;
    if (mode === 'login') {
      success = await handleLogin(email, password);
    } else {
      success = await handleSignUp(email, password);
    }
    setLoading(false);
    if (success) setActivePage('convert');
  };

  const handleGoogleClick = async () => {
    setFormError(null);
    setLoading(true);
    try {
      const success = await handleGoogleLogin();
      if (success) {
        setActivePage('convert');
      } else {
        setFormError('Google Sign-In failed. Please try again.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSend = async () => {
    setFormError(null);
    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    const success = await handleSendMagicLink(email);
    setLoading(false);
    if (success) setOtpSent(true);
  };

  const switchMode = (newMode: typeof mode) => {
    setMode(newMode);
    setFormError(null);
    setResetSuccess(false);
    setOtpSent(false);
    setEmail('');
    setPassword('');
  };

  const inputClass = 'w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';

  return (
    <div className="min-h-[78vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border p-8 sm:p-9 space-y-6" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1D4ED8, #2563EB)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'otp' && 'Sign in with email'}
          </h2>
          <p className="text-sm" style={{ color: '#64748B' }}>
            {mode === 'login' && 'Enter your credentials to continue'}
            {mode === 'signup' && 'Start converting files in seconds'}
            {mode === 'forgot' && 'We\'ll send you a reset link'}
            {mode === 'otp' && !otpSent && 'No password needed — we\'ll email you a verification link'}
            {mode === 'otp' && otpSent && 'Check your inbox and click the link'}
          </p>
        </div>

        {/* Error */}
        {formError && (
          <div className="p-3 rounded-xl text-sm flex items-start gap-2" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' }}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Reset Success */}
        {resetSuccess && (
          <div className="p-3 rounded-xl text-sm flex items-start gap-2" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', color: '#059669' }}>
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Reset link sent! Check your inbox.</span>
          </div>
        )}

        {/* OTP Sent Screen */}
        {mode === 'otp' && otpSent && (
          <div className="p-5 rounded-xl text-center space-y-3" style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.12)' }}>
            <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: '#2563EB' }} />
              <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>Verification link sent to {email}</p>
            <p className="text-xs" style={{ color: '#64748B' }}>Open your inbox and click the verification link to continue.</p>
          </div>
        )}

        {/* Social + Email Link Buttons (login/signup only) */}
        {mode !== 'forgot' && mode !== 'otp' && (
          <div className="space-y-3">
            <button type="button" disabled={loading} onClick={handleGoogleClick}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all hover:bg-[#F8FAFC]"
              style={{ border: '1px solid #E2E8F0', color: '#334155' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>

            <div className="relative flex items-center">
              <div className="flex-grow" style={{ borderTop: '1px solid #E2E8F0' }} />
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold" style={{ color: '#94A3B8' }}>or</span>
              <div className="flex-grow" style={{ borderTop: '1px solid #E2E8F0' }} />
            </div>

            <button type="button" disabled={loading} onClick={() => switchMode('otp')}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all hover:bg-[#F8FAFC]"
              style={{ border: '1px solid #E2E8F0', color: '#334155' }}>
              <Mail className="w-4 h-4" />
              Sign in with email
            </button>
          </div>
        )}

        {/* OTP Email Input */}
        {mode === 'otp' && !otpSent && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748B' }}>Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5" style={{ color: '#94A3B8' }} />
                <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputClass} style={{ background: '#FAFBFC', borderColor: '#E2E8F0' }} />
              </div>
            </div>
            <button type="button" disabled={loading} onClick={handleOtpSend}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(0deg, #1D4ED8, #2563EB)', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                    <>
                      Send verification link
                      <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Forgot Password */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748B' }}>Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5" style={{ color: '#94A3B8' }} />
                <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputClass} style={{ background: '#FAFBFC', borderColor: '#E2E8F0' }} />
              </div>
            </div>
            <button type="button" disabled={loading} onClick={handleSubmit}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(0deg, #1D4ED8, #2563EB)', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Send reset link
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Email + Password Form (login/signup) */}
        {mode !== 'forgot' && mode !== 'otp' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748B' }}>Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5" style={{ color: '#94A3B8' }} />
                <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputClass} style={{ background: '#FAFBFC', borderColor: '#E2E8F0' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold" style={{ color: '#64748B' }}>Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => switchMode('forgot')}
                    className="text-xs hover:underline" style={{ color: '#2563EB' }}>
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <LockIcon className="w-4 h-4 absolute left-3.5 top-3.5" style={{ color: '#94A3B8' }} />
                <input type="password" required placeholder="6+ characters" value={password} onChange={(e) => setPassword(e.target.value)}
                  className={inputClass} style={{ background: '#FAFBFC', borderColor: '#E2E8F0' }} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(0deg, #1D4ED8, #2563EB)', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Links */}
        <div className="text-center pt-1">
          {mode === 'login' && (
            <p className="text-sm" style={{ color: '#64748B' }}>
              Don't have an account?{' '}
              <button onClick={() => switchMode('signup')} className="font-semibold hover:underline" style={{ color: '#2563EB' }}>
                Sign up
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p className="text-sm" style={{ color: '#64748B' }}>
              Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="font-semibold hover:underline" style={{ color: '#2563EB' }}>
                Sign in
              </button>
            </p>
          )}
          {(mode === 'forgot' || mode === 'otp') && (
            <button type="button" onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline" style={{ color: '#2563EB' }}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
