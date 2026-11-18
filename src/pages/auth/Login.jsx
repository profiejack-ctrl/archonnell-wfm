import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react';
import wordmark from '../../assets/logo_archonell.webp';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const { login, verifyTwoFactor, cancelTwoFactor, pendingTwoFactor } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockout, setLockout] = useState(0);

  // 6-digit OTP code state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRef = useRef(null);

  // Countdown timer for 2FA resend
  const [resendTimer, setResendTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);

  // Session notification if redirected
  const [notice] = useState(() => {
    try {
      const reason = window.sessionStorage.getItem('workforce_logout_reason');
      window.sessionStorage.removeItem('workforce_logout_reason');
      if (reason === 'idle') return 'You were signed out after inactivity. Please sign in again.';
      if (reason === 'expired') return 'Your session has ended. Please sign in again.';
    } catch { /* ignore */ }
    return '';
  });

  useEffect(() => {
    if (lockout <= 0) return;
    const t = setInterval(() => setLockout((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockout]);

  useEffect(() => {
    if (!pendingTwoFactor || resendTimer <= 0) {
      if (resendTimer <= 0) setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pendingTwoFactor, resendTimer]);

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('The provided credentials are incorrect. Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        if (result.requiresTwoFactor) {
          setResendTimer(45);
          setCanResend(false);
          return;
        }
        if (result.lockout) {
          setLockout(result.retryAfter || 60);
          setError(result.message || 'Too many login attempts. Please try again later.');
        } else {
          setError(result.message || 'The provided credentials are incorrect. 4 attempts left before sign-in is locked.');
        }
        return;
      }
      toast.success('Welcome back!', `Signed in as ${result.user?.firstName || result.user?.name || 'Administrator'}`);
      navigate(from || '/', { replace: true });
    } catch {
      setError('Unable to reach server. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const setOtpDigit = (index, raw) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setOtp((prev) => prev.map((d, i) => (i === index ? '' : d)));
      return;
    }
    setOtp((prev) => {
      const next = [...prev];
      for (let i = 0; i < digits.length && index + i < 6; i += 1) next[index + i] = digits[i];
      return next;
    });
    otpRef.current?.querySelectorAll('input')[Math.min(index + digits.length, 5)]?.focus();
  };

  const onOtpKeyDown = (index, e) => {
    const inputs = otpRef.current?.querySelectorAll('input');
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs?.[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputs?.[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputs?.[index + 1]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of your security token.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyTwoFactor(code);
      if (!result.success) {
        if (result.lockout) {
          setLockout(result.retryAfter || 60);
          setError(result.message || 'Too many attempts. Please try again shortly.');
        } else {
          setError(result.message || 'Verification token rejected. Please enter the latest code.');
          setOtp(['', '', '', '', '', '']);
          otpRef.current?.querySelector('input')?.focus();
        }
        return;
      }
      toast.success('Identity Verified!', 'Welcome to Archon Nell');
      navigate(from || '/', { replace: true });
    } catch {
      setError('Unable to verify security token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(45);
    toast.info('Security Code Dispatched', 'A new verification code was sent to your authorized endpoint.');
  };

  const backToPassword = () => {
    cancelTwoFactor();
    setOtp(['', '', '', '', '', '']);
    setError('');
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#0F172A] font-['Inter',sans-serif] px-4 py-8">
      {/* Centered White Card */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl p-8 sm:p-9">
        
        {/* Brandmark */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={wordmark}
            alt="Archon Nell Incorporated"
            className="h-16 w-auto object-contain mx-auto"
          />
          <p className="text-center text-xs text-slate-500 font-normal mt-3">
            Support, Finance &amp; Administration
          </p>
        </div>

        {/* Error / Alert banner */}
        {(error || notice) && (
          <div className="mb-5 flex items-start gap-2.5 bg-[#FEF2F2] border border-red-200/90 text-[#DC2626] rounded-xl px-4 py-3 text-xs leading-relaxed animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444] mt-0.5" />
            <div className="flex-1 font-normal">
              {error || notice}
            </div>
          </div>
        )}

        {pendingTwoFactor ? (
          /* 2FA Step */
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-[#0F172A] flex items-center justify-center mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight text-center">
              Two-Factor Authentication
            </h2>
            <p className="text-xs text-slate-500 text-center mt-1 mb-5">
              Enter the 6-digit code sent to <strong className="text-slate-800">{pendingTwoFactor.email}</strong>
            </p>

            <form onSubmit={handleVerify} className="w-full flex flex-col items-center">
              <div ref={otpRef} className="flex items-center justify-center gap-2 w-full mb-5">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    autoFocus={i === 0}
                    value={digit}
                    onChange={(e) => setOtpDigit(i, e.target.value)}
                    onKeyDown={(e) => onOtpKeyDown(i, e)}
                    aria-label={`Digit ${i + 1} of 6`}
                    className="w-11 h-12 text-center text-lg font-bold text-slate-900 bg-[#E8F0FE] border border-transparent rounded-xl focus:bg-white focus:border-slate-300 focus:outline-none transition-all"
                  />
                ))}
              </div>

              <div className="text-xs text-slate-500 mb-5">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    Resend Code
                  </button>
                ) : (
                  <span>Resend code in <strong>00:{resendTimer.toString().padStart(2, '0')}</strong></span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || lockout > 0}
                className="w-full h-11 bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Verifying...' : 'Verify & Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={backToPassword}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </button>
            </form>
          </div>
        ) : (
          /* Primary Login Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="auth-email">
                Email
              </label>
              <div className="relative rounded-xl bg-[#E8F0FE] transition-all focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:bg-white border border-transparent focus-within:border-slate-300">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@archonnell.com"
                  autoComplete="username"
                  className="w-full h-11 pl-10 pr-4 bg-transparent text-slate-900 text-sm focus:outline-none placeholder:text-slate-400 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="auth-password">
                Password
              </label>
              <div className="relative rounded-xl bg-[#E8F0FE] transition-all focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:bg-white border border-transparent focus-within:border-slate-300">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-11 pl-10 pr-10 bg-transparent text-slate-900 text-sm focus:outline-none placeholder:text-slate-400 rounded-xl"
                />
                <button
                  type="button"
                  aria-label="Toggle Password Visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || lockout > 0}
              className="w-full h-11 mt-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Signing In...' : lockout > 0 ? `Retry in ${lockout}s` : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Card Footer */}
        <p className="text-center text-xs text-[#6B8BA4] mt-6 select-none">
          &copy; {new Date().getFullYear()} Archon Nell. All rights reserved.
        </p>

      </div>
    </main>
  );
}
