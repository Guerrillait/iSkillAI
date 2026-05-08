import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Cpu, ArrowLeft, Loader2, Github, Linkedin, ExternalLink, CheckCircle2, 
  User, Phone, Calendar, Mail, Lock, Sparkles, BookOpen, ChevronRight, UserPlus 
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, query, where, getDocs, collection } from 'firebase/firestore';
import { NetworkAlert } from '../components/NetworkAlert';

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    email: '',
    phone: '',
    department: 'CSE',
    password: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      nextStep();
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (!window.navigator.onLine) {
        throw new Error('OFFLINE: Your device is not connected to the internet.');
      }

      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Update Profile
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      // 3. Check for existing social links (now signed in, so we have permission!)
      const lUrl = formData.linkedinUrl.trim();
      const gUrl = formData.githubUrl.trim();

      if (lUrl) {
        const q = query(collection(db, 'users'), where('linkedinUrl', '==', lUrl));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          try {
            await user.delete();
          } catch (deleteError) {
            console.error('Failed to clean up authentication node:', deleteError);
          }
          throw new Error('IDENTITY CONFLICT: This LinkedIn profile is already associated with another brain node.');
        }
      }

      if (gUrl) {
        const q = query(collection(db, 'users'), where('githubUrl', '==', gUrl));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          try {
            await user.delete();
          } catch (deleteError) {
            console.error('Failed to clean up authentication node:', deleteError);
          }
          throw new Error('IDENTITY CONFLICT: This GitHub profile is already associated with another brain node.');
        }
      }

      // 4. Create Firestore Profile
      const userDocRef = doc(db, 'users', user.uid);
      const profileData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dob: formData.dob,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        department: formData.department,
        linkedinUrl: formData.linkedinUrl.trim(),
        githubUrl: formData.githubUrl.trim(),
        portfolioUrl: formData.portfolioUrl.trim(),
        isAnalyzed: false,
        skillScore: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(userDocRef, profileData);
      } catch (err: any) {
        if (err.code === 'permission-denied' || err.message?.includes('insufficient permissions')) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
        throw err;
      }
      
      // Start "AI Analysis" Simulation
      setLoading(false);
      setAnalyzing(true);
      
      setTimeout(() => {
        setAnalyzing(false);
        navigate('/dashboard');
      }, 3000);

    } catch (err: any) {
      setLoading(false);
      console.error('Signup Error:', err);
      if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        const isBlocked = !window.navigator.onLine;
        setError(`NETWORK ERROR: Firebase identity services are unreachable. ${isBlocked ? 'Your device appears to be offline.' : 'This usually means a VPN, Firewall, or Ad-blocker is blocking Google services.'}`);
      } else if (err.code === 'auth/email-already-in-use') {
        setError('IDENTITY CONFLICT: This email is already registered. Please proceed to login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('ENCRYPTION FAILURE: Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('SYNTAX ERROR: The email address format is invalid.');
      } else {
        setError(err.message || 'REGISTRATION FAILED: Sequence interrupted. Please re-verify data.');
      }
    }
  };

  if (analyzing) {
    return (
      <div className="min-min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          <div className="relative">
            <div className="w-24 h-24 border-4 border-slate-200 border-t-cyan-600 rounded-full animate-spin mx-auto" />
            <Cpu className="absolute inset-0 m-auto text-cyan-600 w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-black uppercase tracking-widest text-cyan-600 italic font-serif">Analysis Protocol Active</h2>
            <p className="text-slate-500 font-medium italic font-serif animate-pulse">AI is analyzing your professional identity...</p>
          </div>
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const departments = ['CSE', 'EEE', 'BBA', 'SWE', 'Pharmacy', 'Architecture', 'Law', 'English'];
  const isTechDept = formData.department === 'CSE' || formData.department === 'SWE' || formData.department === 'EEE';

  return (
    <div className="min-h-screen font-sans selection:bg-cyan-500 selection:text-white flex flex-col md:flex-row bg-white overflow-x-hidden relative">
      
      {/* LEFT COLUMN: Clean Brand Showcase with Fluid Glows mirroring Login.tsx */}
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={12} /> HOME
          </button>
        </div>

        {/* Clean Showcase Area */}
        <div className="relative z-10 my-12 md:my-auto space-y-6 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest shadow-sm">
            <Sparkles size={11} className="text-cyan-400 animate-pulse" />
            <span>AI-Driven Profiling</span>
          </div>
          
          <h1 className="text-3xl lg:text-4.5xl font-black text-white tracking-tight leading-tight uppercase font-sans">
            CREATE YOUR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Professional Node
            </span>
          </h1>
          
          <p className="text-slate-400 text-sm font-light leading-relaxed">
            Join the verified singular iskill network and map your portfolio, skill points, and collaborations today.
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

      {/* RIGHT COLUMN: Pristine, Simplified Form Section replicating Login.tsx */}
      <div className="w-full md:w-[55%] flex items-center justify-center p-6 md:p-14 lg:p-16 relative bg-slate-55/50 overflow-y-auto">
        
        {/* Ambient Glow behind the sign-up container */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-cyan-100/20 rounded-full blur-[100px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg bg-white border border-slate-200/60 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 relative z-10 my-8"
        >
          {/* Header */}
          <div className="mb-6 text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Create an account
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Configure your verified academic node in 3 simple phases.
            </p>
          </div>

          {/* Progress Bar & Indicators */}
          <div className="mb-8 space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-600 italic font-serif">Protocol Step</span>
                <h3 className="text-sm font-black text-slate-800 italic font-serif">0{step} / 03</h3>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic font-serif">Module Status</span>
                <p className="text-[10px] font-black text-slate-600 uppercase italic font-serif">
                  {step === 1 ? 'Bio-Data Link' : step === 2 ? 'Academic Mesh' : 'Node Integration'}
                </p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(step / 3) * 100}%` }}
                className="h-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-500"
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">First Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                        <input 
                          required 
                          name="firstName" 
                          value={formData.firstName} 
                          onChange={handleChange} 
                          placeholder="John" 
                          className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-xs font-semibold shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Last Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                        <input 
                          required 
                          name="lastName" 
                          value={formData.lastName} 
                          onChange={handleChange} 
                          placeholder="Doe" 
                          className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-xs font-semibold shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Date of Birth</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                      <input 
                        required 
                        type="date" 
                        name="dob" 
                        value={formData.dob} 
                        onChange={handleChange} 
                        className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 text-xs font-semibold shadow-sm text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Neural Access (Email)</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                      <input 
                        required 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleChange} 
                        placeholder="name@domain.com" 
                        className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-xs font-semibold shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Phone</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                        <input 
                          required 
                          name="phone" 
                          value={formData.phone} 
                          onChange={handleChange} 
                          placeholder="+880..." 
                          className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-xs font-semibold shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Encryption Key (Password)</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                        <input 
                          required 
                          type="password" 
                          name="password" 
                          value={formData.password} 
                          onChange={handleChange} 
                          placeholder="••••••••" 
                          className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-xs font-semibold shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="w-12 h-12 bg-cyan-600/10 rounded-2xl flex items-center justify-center text-cyan-600 mb-2 shadow-lg shadow-cyan-600/5">
                    <BookOpen size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-slate-900">Academic Mesh Selection</h3>
                    <p className="text-slate-400 text-xs">Select your school department within the DIU Research Singularity.</p>
                  </div>
                  
                  <div className="space-y-1 pt-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-0.5 font-sans">Department</label>
                    <select 
                      name="department" 
                      value={formData.department} 
                      onChange={handleChange}
                      className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 text-xs font-semibold shadow-sm"
                    >
                      {departments.map(dept => (
                        <option key={dept} value={dept} className="bg-white text-slate-900 font-semibold">{dept}</option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 ml-0.5">
                      <Linkedin size={14} className="text-cyan-600 shrink-0" />
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">LinkedIn Profile (Mandatory)</label>
                    </div>
                    <input 
                      required 
                      name="linkedinUrl" 
                      value={formData.linkedinUrl} 
                      onChange={handleChange} 
                      placeholder="https://linkedin.com/in/username" 
                      className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-xs font-semibold shadow-sm" 
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 ml-0.5">
                      {isTechDept ? <Github size={14} className="text-slate-900 shrink-0" /> : <ExternalLink size={14} className="text-cyan-600 shrink-0" />}
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {isTechDept ? 'GitHub Profile' : 'Portfolio Link'}
                      </label>
                    </div>
                    <input 
                      name={isTechDept ? 'githubUrl' : 'portfolioUrl'} 
                      value={isTechDept ? formData.githubUrl : formData.portfolioUrl} 
                      onChange={handleChange} 
                      placeholder="https://github.com/username" 
                      className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-xs font-semibold shadow-sm" 
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 ml-0.5 text-slate-400">
                      <ExternalLink size={14} className="text-cyan-600 shrink-0" />
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Extra Node Link (Optional)</label>
                    </div>
                    <input 
                      name="portfolioUrl" 
                      value={formData.portfolioUrl} 
                      onChange={handleChange} 
                      placeholder="Optional secondary link..." 
                      className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300 text-xs font-semibold shadow-sm" 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="mt-6 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 shadow-sm">
                <Mail className="text-amber-600 mt-0.5 shrink-0" size={15} />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">Connection Trouble</span>
                  <p className="text-slate-600 text-xs leading-normal font-medium">{error}</p>
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-3">
              {step > 1 && (
                <button 
                  type="button" 
                  onClick={prevStep}
                  className="px-5 h-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-950 font-bold text-[10px] uppercase tracking-wider hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ArrowLeft size={12} /> BACK
                </button>
              )}
              <button 
                type="submit" 
                disabled={loading}
                className="flex-grow bg-slate-900 hover:bg-slate-800 text-white h-11 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:scale-[0.99] active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : step === 3 ? (
                  <span className="flex items-center gap-1.5">Finalize Setup <CheckCircle2 size={13} className="text-cyan-400" /></span>
                ) : (
                  <span className="flex items-center gap-1.5">Next Step <ChevronRight size={13} className="text-cyan-400 animate-pulse" /></span>
                )}
              </button>
            </div>
          </form>

          {/* Switch to Login */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col items-center gap-1">
            <span className="text-slate-400 text-[10px] font-medium">Already have a verified brain node?</span>
            <button 
              id="login-redirect-btn"
              type="button" 
              onClick={() => navigate('/login')} 
              className="text-cyan-600 text-[11px] font-bold hover:text-cyan-700 transition-colors border-b border-cyan-600/20 pb-0.5 uppercase tracking-wider cursor-pointer"
            >
              Sign In Instead
            </button>
          </div>

        </motion.div>
      </div>

    </div>
  );
}
