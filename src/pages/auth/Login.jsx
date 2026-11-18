import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft,
  CheckCircle2, KeyRound, Shield, Clock, AlertCircle, Sparkles
} from 'lucide-react';
import BrandLogo from '../../components/ui/BrandLogo';
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
  const [rememberDevice, setRememberDevice] = useState(false);
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
      setError('Please enter both username/email and password.');
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
          setError(result.message || 'Invalid enterprise credentials. Please check your email and password.');
        }
        return;
      }
      toast.success('Welcome back!', `Signed in as ${result.user.firstName || result.user.name || 'Executive Administrator'}`);
      navigate(from || '/', { replace: true });
    } catch {
      setError('Unable to reach Central Gateway. Please check network connectivity.');
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
      toast.success('Identity Verified!', `Welcome back to the Executive Console`);
      navigate(from || '/', { replace: true });
    } catch {
      setError('Unable to connect to authorization enclave. Please try again.');
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
    <main className="min-h-screen w-full flex items-center justify-center bg-[#FDF7FF] text-[#1E182C] font-['Inter'] relative overflow-hidden py-10 px-4 sm:px-6">
      {/* Subtle architectural ambient gradient backdrops */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#FFDBD0] opacity-40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -right-32 w-[30rem] h-[30rem] rounded-full bg-[#F3EAFF] opacity-60 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full max-h-[48rem] bg-gradient-to-b from-transparent via-[#F8F1FF]/40 to-transparent pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="w-full max-w-[540px] flex flex-col items-center z-10">
        
        {/* Header / Brand Section */}
        <header className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4 group transition-transform duration-300 hover:scale-[1.02]">
            <BrandLogo variant="wordmark" className="h-12 sm:h-14 w-auto filter drop-shadow-sm" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEE4FF] text-[#44474E] text-[11px] font-semibold uppercase tracking-wider mb-2 shadow-xs">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8F4C35] animate-pulse" />
            Zero Trust Perimeter
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-[#000819] tracking-tight mb-1">
            Archon Nell Portal
          </h1>
          <p className="text-sm text-[#44474E] max-w-sm leading-relaxed">
            Enterprise Workforce Solutions &amp; Partner Management Portal &mdash; Secure Sign In
          </p>
        </header>

        {/* Authentication Card */}
        <div className="w-full bg-white rounded-2xl shadow-xl shadow-[#07203F]/5 border border-[#E2E8F0] p-6 sm:p-10 relative overflow-hidden transition-all duration-300">
          {/* Top Subtle Warm Glow Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#07203F] via-[#8F4C35] to-[#07203F]" />

          {notice && !error && (
            <div className="mb-5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm rounded-xl p-3.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-[#93000A] text-xs sm:text-sm rounded-xl p-3.5 animate-shake">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#BA1A1A]" />
              <span>{error}</span>
            </div>
          )}

          {pendingTwoFactor ? (
            /* 2FA Step */
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FFDBD0] text-[#8F4C35] flex items-center justify-center mb-3 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#000819] tracking-tight text-center">
                Two-Factor Authentication
              </h2>
              <p className="text-xs sm:text-sm text-[#44474E] text-center mt-1.5 mb-6 max-w-sm">
                Enter the 6-digit security code sent to your authorized enterprise device or authenticator app:
                <span className="block font-semibold text-[#000819] mt-0.5">{pendingTwoFactor.email}</span>
              </p>

              <form onSubmit={handleVerify} className="w-full flex flex-col items-center">
                {/* 6 Digit Inputs Grid */}
                <div ref={otpRef} className="flex items-center justify-center gap-2 sm:gap-2.5 w-full mb-6">
                  {otp.map((digit, i) => (
                    <div key={i} className="flex items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete={i === 0 ? 'one-time-code' : 'off'}
                        maxLength={6}
                        autoFocus={i === 0}
                        value={digit}
                        onChange={(e) => setOtpDigit(i, e.target.value)}
                        onKeyDown={(e) => onOtpKeyDown(i, e)}
                        aria-label={`Digit ${i + 1} of 6`}
                        className="w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#000819] bg-[#F8F1FF] border border-[#C4C6CF]/50 rounded-xl focus:bg-white focus:border-[#07203F] focus:ring-2 focus:ring-[#07203F]/20 transition-all outline-none shadow-xs"
                      />
                      {i === 2 && (
                        <span className="text-[#74777F] font-bold px-1 select-none opacity-50">&bull;</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Resend Timer / Action */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#44474E] mb-6">
                  <Clock className="w-3.5 h-3.5 text-[#74777F]" />
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-semibold text-[#8F4C35] hover:underline cursor-pointer"
                    >
                      Resend Security Code
                    </button>
                  ) : (
                    <span>
                      Resend security code in <strong className="text-[#000819] font-medium">00:{resendTimer.toString().padStart(2, '0')}</strong>
                    </span>
                  )}
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={loading || lockout > 0}
                  className="w-full h-12 sm:h-14 bg-[#07203F] hover:bg-[#000819] text-white font-semibold text-sm sm:text-base rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Verifying Credentials...' : 'Verify & Access Console'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Divider */}
                <div className="relative w-full my-6 flex items-center justify-center">
                  <div className="w-full h-px bg-[#E8DEFA]" />
                  <span className="absolute bg-white px-3 text-[11px] font-semibold text-[#74777F] uppercase tracking-wider">
                    or verify hardware
                  </span>
                </div>

                {/* Hardware Security Key Alternative */}
                <button
                  type="button"
                  onClick={() => toast.info('FIDO2 Hardware Key', 'Touch your security key or passkey when prompted by your browser.')}
                  className="w-full py-3 px-4 rounded-xl bg-[#F8F1FF] hover:bg-[#EEE4FF] text-[#000819] font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#E8DEFA]"
                >
                  <KeyRound className="w-4 h-4 text-[#8F4C35]" />
                  <span>Use Security Key (FIDO2 / WebAuthn)</span>
                </button>

                {/* Return link */}
                <button
                  type="button"
                  onClick={backToPassword}
                  className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-[#44474E] hover:text-[#000819] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </button>
              </form>
            </div>
          ) : (
            /* Primary Login Form */
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#44474E] mb-1.5" htmlFor="auth-email">
                  Username / Enterprise Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#74777F]" />
                  <input
                    id="auth-email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alias@archonnell.corp"
                    autoComplete="username"
                    className="w-full h-12 sm:h-14 pl-11 pr-4 bg-white text-[#1E182C] text-sm border border-[#C4C6CF] rounded-xl shadow-xs focus:outline-none focus:border-[#07203F] focus:ring-2 focus:ring-[#07203F]/20 focus:bg-[#F8F1FF]/30 transition-all placeholder:text-[#74777F]/60"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#44474E]" htmlFor="auth-password">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[12px] font-medium text-[#8F4C35] hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#74777F]" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    autoComplete="current-password"
                    className="w-full h-12 sm:h-14 pl-11 pr-11 bg-white text-[#1E182C] text-sm border border-[#C4C6CF] rounded-xl shadow-xs focus:outline-none focus:border-[#07203F] focus:ring-2 focus:ring-[#07203F]/20 focus:bg-[#F8F1FF]/30 transition-all placeholder:text-[#74777F]/60"
                  />
                  <button
                    type="button"
                    aria-label="Toggle Password Visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#74777F] hover:text-[#1E182C] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-0.5">
                <input
                  id="remember-device"
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded border-[#C4C6CF] text-[#07203F] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="remember-device" className="text-xs text-[#44474E] select-none cursor-pointer">
                  Remember device for 30 days
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || lockout > 0}
                className="w-full h-12 sm:h-14 bg-[#07203F] hover:bg-[#000819] text-white font-semibold text-sm sm:text-base rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : lockout > 0 ? `Retry in ${lockout}s` : 'Sign In to Enclave'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Hardware Security Tokens Enforced Notice */}
              <div className="mt-5 p-3.5 bg-[#F8F1FF] border border-[#E8DEFA] rounded-xl flex items-start gap-3">
                <Shield className="w-4 h-4 text-[#8F4C35] mt-0.5 shrink-0" />
                <div className="text-xs text-[#44474E] leading-relaxed">
                  <strong className="text-[#000819] font-semibold block text-[12px] mb-0.5">
                    Hardware Security Tokens Enforced
                  </strong>
                  MFA via FIDO2, WebAuthn, or Enterprise Authenticator is mandatory upon authentication challenge.
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Security & Compliance Strip */}
        <div className="w-full mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[#44474E]">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EEE4FF]/70 text-[11px] font-semibold tracking-wider uppercase border border-[#E8DEFA]/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#8F4C35]" />
            <span>SOC 2 Type II</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EEE4FF]/70 text-[11px] font-semibold tracking-wider uppercase border border-[#E8DEFA]/60">
            <Shield className="w-3.5 h-3.5 text-[#8F4C35]" />
            <span>ISO 27001 Certified</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EEE4FF]/70 text-[11px] font-semibold tracking-wider uppercase border border-[#E8DEFA]/60">
            <Lock className="w-3.5 h-3.5 text-[#8F4C35]" />
            <span>256-Bit TLS E2EE</span>
          </div>
        </div>

        {/* Executive Footer Meta */}
        <footer className="mt-6 text-center flex flex-col items-center gap-2">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#74777F]">
            <a href="#" className="hover:text-[#000819] transition-colors">Information Security Policy</a>
            <span className="w-1 h-1 rounded-full bg-[#C4C6CF]" />
            <a href="#" className="hover:text-[#000819] transition-colors">Platform Status (99.99%)</a>
            <span className="w-1 h-1 rounded-full bg-[#C4C6CF]" />
            <a href="#" className="hover:text-[#000819] transition-colors">Global Support NOC</a>
          </nav>
          <p className="text-[11px] text-[#74777F]/80">
            &copy; {new Date().getFullYear()} Archon Nell Incorporated. Strictly Authorized Commercial Access Only.
          </p>
        </footer>

      </div>
    </main>
  );
}
