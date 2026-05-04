import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Cpu, ArrowLeft, Loader2, Github, Linkedin, ExternalLink, CheckCircle2 } from 'lucide-react';
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

      // 0. Check for existing social links
      const lUrl = formData.linkedinUrl.trim();
      const gUrl = formData.githubUrl.trim();

      if (lUrl) {
        const q = query(collection(db, 'users'), where('linkedinUrl', '==', lUrl));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          throw new Error('IDENTITY CONFLICT: This LinkedIn profile is already associated with another brain node.');
        }
      }

      if (gUrl) {
        const q = query(collection(db, 'users'), where('githubUrl', '==', gUrl));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          throw new Error('IDENTITY CONFLICT: This GitHub profile is already associated with another brain node.');
        }
      }

      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Update Profile
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      // 3. Create Firestore Profile
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-cyan-500 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Back to Home Button */}
      {!analyzing && (
        <button 
          onClick={() => navigate('/')}
          className="fixed top-8 left-8 z-50 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-cyan-600 transition-all group italic font-serif"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:border-cyan-200 transition-all">
            <ArrowLeft size={14} />
          </div>
          Return to Portal
        </button>
      )}

      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Progress Bar */}
        <div className="mb-12 space-y-4">
          <div className="flex justify-between items-end px-2">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600/70 italic font-serif">Protocol Step</span>
              <h2 className="text-2xl font-black text-slate-900 italic font-serif">0{step} / 03</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic font-serif">Module Status</span>
              <p className="text-xs font-bold text-slate-600 uppercase italic font-serif">
                {step === 1 ? 'Bio-Data Link' : step === 2 ? 'Academic Mesh' : 'Node Integration'}
              </p>
            </div>
          </div>
          <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(step / 3) * 100}%` }}
              className="h-full bg-gradient-to-r from-cyan-600 to-blue-600"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 p-10 md:p-14 rounded-[3rem] shadow-2xl shadow-slate-200/50 relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2 italic font-serif">First Name</label>
                    <input required name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-300" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2 italic font-serif">Last Name</label>
                    <input required name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-300" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2 italic font-serif">Date of Birth</label>
                  <input required type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-medium text-slate-900" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2 italic font-serif">Neural Access (Email)</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@domain.ai" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-300" />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2 italic font-serif">Phone</label>
                    <input required name="phone" value={formData.phone} onChange={handleChange} placeholder="+880..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-300" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2 italic font-serif">Encryption Key</label>
                    <input required type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-300" />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-cyan-600/10 rounded-2xl flex items-center justify-center text-cyan-600 mb-4 shadow-lg shadow-cyan-600/5">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic font-serif tracking-tight text-slate-900 uppercase">Academic Mesh Selection</h3>
                    <p className="text-slate-500 text-sm mt-2 font-medium">Select your primary sector within the DIU Research Singularity.</p>
                  </div>
                  <div className="space-y-3 pt-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2 italic font-serif">Department</label>
                    <select 
                      name="department" 
                      value={formData.department} 
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-medium text-slate-900"
                    >
                      {departments.map(dept => (
                        <option key={dept} value={dept} className="bg-white text-slate-900">{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-2">
                    <Linkedin size={14} className="text-cyan-600" />
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic font-serif">LinkedIn Profile (Mandatory)</label>
                  </div>
                  <input required name="linkedinUrl" value={formData.linkedinUrl} onChange={handleChange} placeholder="https://linkedin.com/in/..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-300" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-2">
                    {isTechDept ? <Github size={14} className="text-slate-900" /> : <ExternalLink size={14} className="text-blue-600" />}
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic font-serif">
                      {isTechDept ? 'GitHub Profile' : 'Portfolio Link'}
                    </label>
                  </div>
                  <input 
                    name={isTechDept ? 'githubUrl' : 'portfolioUrl'} 
                    value={isTechDept ? formData.githubUrl : formData.portfolioUrl} 
                    onChange={handleChange} 
                    placeholder="https://..." 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-300" 
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-2 text-slate-400">
                    <ExternalLink size={14} />
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] italic font-serif">Extra Node Link</label>
                  </div>
                  <input name="portfolioUrl" value={formData.portfolioUrl} onChange={handleChange} placeholder="Optional secondary link..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-medium text-slate-900 placeholder:text-slate-300" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-8">
              <NetworkAlert message={error} />
            </div>
          )}

          <div className="mt-12 flex gap-4">
            {step > 1 && (
              <button 
                type="button" 
                onClick={prevStep}
                className="px-8 py-5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-3 italic font-serif"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading}
              className="flex-grow bg-slate-950 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] shadow-xl hover:bg-cyan-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 italic font-serif"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : step === 3 ? (
                'Finalize Protocol'
              ) : (
                <>Next Step <CheckCircle2 size={14} /></>
              )}
            </button>
          </div>

          <div className="mt-8 text-center">
            <button type="button" onClick={() => navigate('/login')} className="text-slate-400 text-[9px] uppercase tracking-widest font-black hover:text-cyan-600 transition-colors italic font-serif">Abort & Login</button>
          </div>
        </form>
      </div>
    </div>
  );
}
