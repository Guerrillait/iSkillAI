import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Cpu, ArrowLeft, Loader2, Mail, Lock, Check, Copy, 
  AlertTriangle, AppWindow, ChevronRight, Sparkles, UserCheck
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // App preview isolation detection
  const [isIframe, setIsIframe] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const insideIframe = window.self !== window.top;
    setIsIframe(insideIframe);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchNewTab = () => {
    window.open(window.location.origin, '_blank');
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const [firstName, ...rest] = (user.displayName || "Verified User").split(' ');
        const lastName = rest.join(' ') || "Professional";
        await setDoc(userRef, {
          firstName,
          lastName,
          email: user.email,
          photoURL: user.photoURL || '',
          isAnalyzed: false,
          skillScore: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      navigate('/news-feed');
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Please try again.');
      } else {
        setError(err.message || 'Google login failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (!window.navigator.onLine) {
        setError('Your device is currently offline. Please check your internet connection.');
        setLoading(false);
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      navigate('/news-feed');
    } catch (err: any) {
      setLoading(false);
      console.error('Login error:', err);
      if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        const isBlocked = !window.navigator.onLine;
        setError(
          `Unable to connect to login services. ${
            isBlocked 
              ? 'Your device appears to be offline.' 
              : 'This may be blocked by your browser inside the preview pane. Please try launching in a new tab.'
          }`
        );
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Please enter a valid email address and password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Account temporarily locked. Please try again later.');
      } else {
        setError(err.message || 'Authentication failed. Please verify your credentials.');
      }
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-cyan-500 selection:text-white flex flex-col md:flex-row bg-white overflow-x-hidden relative">
      
      {/* LEFT COLUMN: Clean Brand Showcase with Fluid Glows */}
      <div className="relative w-full md:w-[45%] bg-slate-900 flex flex-col justify-between p-8 md:p-12 lg:p-16 text-white overflow-hidden shrink-0">
        
        {/* Kinetic Grid & Glow Layout matching the Landing Hero */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div id="brand-logo" className="flex items-center gap-2.5">
            <Cpu className="text-cyan-400 w-8 h-8 animate-pulse" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">iskill</span>
          </div>
          
          <button 
            id="back-home-btn"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft size={12} /> HOME
          </button>
        </div>

        {/* Clean Showcase Area */}
        <div className="relative z-10 my-12 md:my-auto space-y-6 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest shadow-sm">
            <Sparkles size={11} className="text-cyan-400" />
            <span>AI-Driven Profiling</span>
          </div>
          
          <h1 className="text-3xl lg:text-4.5xl font-black text-white tracking-tight leading-tight uppercase font-sans">
            Bridge your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Professional Identity
            </span>
          </h1>
          
          <p className="text-slate-400 text-sm font-light leading-relaxed">
            Aggregation of GitHub, LinkedIn, and portfolios into verified nodes using custom semantic scoring.
          </p>

          {/* Simple Academic Endorsement Note */}
          <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
              DIU Research Study
            </p>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/5 pt-4 text-slate-500 font-mono text-[9px] uppercase tracking-wider font-bold">
          <span>CLASSIFY NODE</span>
          <span>DIU • BD</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Pristine, Simplified Form Section */}
      <div className="w-full md:w-[55%] flex items-center justify-center p-8 md:p-14 lg:p-20 relative bg-slate-50/50">
        
        {/* Ambient Glow behind the sign-in container */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-cyan-100/30 rounded-full blur-[100px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white border border-slate-200/60 p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-slate-200/40 relative z-10"
        >
          {/* Header */}
          <div className="mb-8 text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="text-slate-400 text-xs mt-1.5">
              Sign in to manage your verified academic profile.
            </p>
          </div>

          {/* Clean Frame Sandbox Helper if Isolation is detected */}
          {isIframe && (
            <div className="mb-6 bg-cyan-50/60 border border-cyan-200/40 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-start gap-2">
                <AppWindow size={14} className="text-cyan-600 mt-0.5 shrink-0" />
                <p className="text-slate-600 text-[11px] leading-relaxed font-semibold">
                  Chrome/Safari blocks third-party cookie logins inside the iframe. Consider opening the portal in a new browser tab.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  id="launch-tab-btn"
                  type="button"
                  onClick={handleLaunchNewTab}
                  className="flex-1 py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                >
                  Open in New Tab
                </button>
                <button
                  id="copy-link-btn"
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center"
                >
                  {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          )}

          {/* Error Message Layout */}
          {error && (
            <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 shadow-sm">
              <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={15} />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">Connection Trouble</span>
                <p className="text-slate-600 text-xs leading-normal font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Precise & Direct Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                <input 
                  id="login-email-input"
                  required 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com" 
                  className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-xs font-semibold shadow-sm" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between ml-0.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                <button type="button" className="text-[10px] font-bold text-slate-400 hover:text-cyan-600 transition-colors">Forgot?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                <input 
                  id="login-password-input"
                  required 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-xs font-semibold shadow-sm" 
                />
              </div>
            </div>

            <button 
              id="login-submit-btn"
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:scale-[0.99] active:scale-[0.97] flex items-center justify-center cursor-pointer shadow-md"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span className="flex items-center gap-1.5">Sign In <ChevronRight size={13} className="text-cyan-400" /></span>}
            </button>
          </form>

          {/* Social Access Divider / Google login */}
          <div className="mt-6 flex flex-col gap-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-wider font-extrabold text-slate-400 bg-white px-2">or continue with</div>
            </div>

            <button 
              id="google-sso-btn"
              type="button" 
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full h-11 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center gap-2 transition-all font-bold text-[10px] tracking-wider uppercase cursor-pointer text-slate-700 shadow-sm"
            >
              {googleLoading ? <Loader2 size={12} className="animate-spin text-cyan-600" /> : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google SSO
                </>
              )}
            </button>
          </div>

          {/* Switch to Signup */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col items-center gap-1">
            <span className="text-slate-400 text-[10px] font-medium">New academic record?</span>
            <button 
              id="signup-redirect-btn"
              type="button" 
              onClick={() => navigate('/signup')} 
              className="text-cyan-600 text-[11px] font-bold hover:text-cyan-700 transition-colors border-b border-cyan-600/20 pb-0.5 uppercase tracking-wider cursor-pointer"
            >
              Create an account
            </button>
          </div>

        </motion.div>
      </div>

    </div>
  );
}
