import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Cpu, ArrowLeft, Loader2, Mail, Lock } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { NetworkAlert } from '../components/NetworkAlert';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore, if not create basic profile
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
        setError('OFFLINE: Your device is not connected to the internet.');
        setLoading(false);
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      navigate('/news-feed');
    } catch (err: any) {
      setLoading(false);
      console.error('Login Error Code:', err.code);
      if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        const isBlocked = !window.navigator.onLine;
        setError(`NETWORK ERROR: Firebase identity services are unreachable. ${isBlocked ? 'Your device appears to be offline.' : 'This usually means a VPN, Firewall, or Ad-blocker is blocking Google services. Please try disabling them or using a different network.'}`);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. This account has been temporarily disabled. Try again later.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-cyan-500 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Back to Home Button */}
      <button 
        onClick={() => navigate('/')}
        className="fixed top-8 left-8 z-50 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-cyan-600 transition-all group italic font-serif"
      >
        <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:border-cyan-200 transition-all">
          <ArrowLeft size={14} />
        </div>
        Return to Portal
      </button>

      {/* Background Mesh/Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-100 p-12 rounded-[4rem] shadow-2xl shadow-slate-200/50 relative z-10"
      >
        <div className="flex flex-col items-center mb-12">
          <motion.div 
            animate={{ 
              boxShadow: ["0 0 0px #22d3ee00", "0 0 20px #22d3ee33", "0 0 0px #22d3ee00"] 
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-20 h-20 bg-cyan-600/10 rounded-[2rem] flex items-center justify-center mb-6 border border-cyan-600/20 shadow-lg shadow-cyan-600/5"
          >
            <Cpu className="w-10 h-10 text-cyan-600" />
          </motion.div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-slate-900 uppercase italic font-serif">Initialize</h1>
          <p className="text-cyan-600 text-xs font-mono tracking-[0.2em] uppercase font-black italic font-serif">Neural Identity Linkage</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && <NetworkAlert message={error} />}

          <div className="space-y-3">
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
              <input 
                required 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Access Identifier (Email)" 
                className="w-full bg-slate-50 border border-slate-100 rounded-3xl pl-14 pr-6 py-5 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-sm font-medium" 
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
              <input 
                required 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Secure Token (Password)" 
                className="w-full bg-slate-50 border border-slate-100 rounded-3xl pl-14 pr-6 py-5 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-sm font-medium" 
              />
            </div>
            <div className="flex justify-end p-1">
              <button type="button" className="text-[10px] uppercase tracking-widest font-black text-slate-400 hover:text-cyan-600 transition-colors italic font-serif">Emergency Reset?</button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full group relative overflow-hidden bg-slate-950 text-white h-16 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all hover:scale-[0.98] active:scale-[0.95] italic font-serif"
          >
            <div className="absolute inset-0 bg-cyan-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10 flex items-center justify-center gap-3">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Access System <ArrowLeft className="w-4 h-4 rotate-180" /></>}
            </span>
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[8px] uppercase tracking-widest font-black text-slate-300 bg-white px-4">Direct Linkage</div>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full h-14 rounded-2xl border border-slate-200 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all font-black text-[10px] tracking-widest uppercase italic font-serif"
          >
            {googleLoading ? <Loader2 size={16} className="animate-spin text-cyan-600" /> : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sync with Google
              </>
            )}
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center gap-4">
          <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold italic font-serif">New Entity Detected?</p>
          <button 
            type="button" 
            onClick={() => navigate('/signup')} 
            className="text-cyan-600 text-sm font-black hover:text-slate-900 transition-colors border-b-2 border-cyan-600/30 pb-1 uppercase italic font-serif"
          >
            Forge New Identity
          </button>
        </div>
      </motion.div>

      <div className="absolute bottom-10 left-10 flex flex-col gap-1 opacity-20 pointer-events-none font-mono text-[8px] tracking-tight">
        <div>SYS_REVISION: BEYOND_IMAGINATION_v4</div>
        <div>INST_STATUS: SINGULARITY_REACHED</div>
      </div>
    </div>
  );
}
