import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { query, collection, where, getDocs, addDoc, serverTimestamp, onSnapshot, doc } from 'firebase/firestore';
import { 
  Search as SearchIcon, ArrowLeft, Loader2, 
  ShieldCheck, AlertCircle, Cpu, User, Calendar, Link as LinkIcon,
  Award, TrendingUp, Zap, Github, Linkedin, ExternalLink, MessageSquare, Newspaper, UserPlus, Check, Bell, LogOut, ShieldAlert
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useLayout } from '../context/LayoutContext';

export default function Search() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [connection, setConnection] = useState<any>(null);
  const [connecting, setConnecting] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isSidebarCollapsed, toggleSidebar } = useLayout();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) navigate('/login');
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) setProfile(snapshot.data());
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !result) return;

    // Check for existing connection
    const q1 = query(collection(db, 'connections'), where('userIds', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q1, (snapshot) => {
      const conn = snapshot.docs.find(d => d.data().userIds.includes(result.id));
      if (conn) {
        setConnection({ id: conn.id, ...conn.data() });
      } else {
        setConnection(null);
      }
    });

    return () => unsubscribe();
  }, [user, result]);

  const handleConnect = async () => {
    if (!user || !result || connecting) return;
    setConnecting(true);
    try {
      const connRef = await addDoc(collection(db, 'connections'), {
        userIds: [user.uid, result.id],
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create Notification
      await addDoc(collection(db, 'notifications'), {
        userId: result.id,
        type: 'connection_request',
        title: 'New Connection Request',
        content: `Professional ${profile?.firstName || 'User'} wants to establish a link with your identity.`,
        data: { connectionId: connRef.id },
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'connections');
    } finally {
      setConnecting(false);
    }
  };

  const [searchData, setSearchData] = useState({
    fullName: '',
    dob: '',
    professionalId: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchData({ ...searchData, [e.target.name]: e.target.value });
  };

  const [showResultModal, setShowResultModal] = useState<'no_match' | 'match' | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const searchFullName = searchData.fullName.trim().toLowerCase();
      const usersRef = collection(db, 'users');
      
      const q = query(
        usersRef, 
        where('dob', '==', searchData.dob)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setShowResultModal('no_match');
      } else {
        let matched = false;
        snapshot.forEach(doc => {
          const data = doc.data();
          const firstName = data.firstName || '';
          const lastName = data.lastName || '';
          const dbFullName = `${firstName} ${lastName}`.trim().toLowerCase();
          
          const normalizedDbName = dbFullName.replace(/\s+/g, ' ');
          const normalizedSearchName = searchFullName.replace(/\s+/g, ' ');

          if (normalizedDbName === normalizedSearchName) {
            const links = [data.linkedinUrl, data.githubUrl, data.extraLink].map(l => l?.toLowerCase());
            const searchLink = searchData.professionalId.toLowerCase().trim();
            
            if (links.some(l => l && (l.includes(searchLink) || searchLink.includes(l)))) {
              setResult({ ...data, id: doc.id });
              matched = true;
              setShowResultModal('match');
            }
          }
        });

        if (!matched) {
          setShowResultModal('no_match');
        }
      }
    } catch (err: any) {
      console.error("Search Error:", err);
      handleFirestoreError(err, OperationType.LIST, 'users');
      setError('System verification error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-cyan-500 flex flex-col md:flex-row relative overflow-hidden">
      {/* Background Mesh/Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] left-[15%] w-[30%] h-[30%] bg-indigo-600/5 rounded-full blur-[80px]" />
      </div>

      <Sidebar 
        activePage="search" 
        profile={profile} 
        isCollapsed={isSidebarCollapsed} 
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <main className={`flex-grow p-4 md:p-14 overflow-y-auto max-h-screen relative z-10 custom-scrollbar transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-14' : ''}`}>
        
        <Header 
          profile={profile}
          user={user}
          activePage="search"
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
        />

        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="w-8 h-[2px] bg-cyan-600 rounded-full" />
                <h1 className="text-3xl md:text-4xl font-display font-black bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 bg-clip-text text-transparent italic font-serif tracking-tight uppercase leading-none">
                  Intelligent Search
                </h1>
              </div>
              <p className="text-slate-400 text-[10px] md:text-xs font-medium italic font-serif tracking-wider uppercase">Secure access to professional skill profiles requires multi-factor verification.</p>
            </motion.div>
            
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
              <div className="w-8 h-8 rounded-lg bg-slate-50" />
            </div>
          </div>
        </section>

        {!result ? (
          <div className="max-w-5xl mx-auto grid md:grid-cols-5 gap-8 items-start">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-3 bg-white border border-slate-100 p-8 md:p-14 rounded-[3rem] md:rounded-[4rem] shadow-2xl shadow-slate-200/60 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-12 opacity-[0.02] font-serif font-black text-9xl uppercase pointer-events-none select-none italic text-slate-900 rotate-12 transition-transform duration-1000 group-hover:rotate-6 group-hover:scale-110">FIND</div>
              
              <div className="flex items-center gap-6 mb-14 text-cyan-600 relative z-10">
                 <div className="w-20 h-20 rounded-[2.5rem] bg-cyan-600/5 flex items-center justify-center border border-cyan-600/10 shadow-inner shadow-cyan-600/5">
                    <ShieldCheck size={36} className="animate-pulse" />
                 </div>
                 <div>
                    <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight italic font-serif uppercase text-slate-900 leading-none mb-2">Identity Verification</h2>
                    <div className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase italic font-serif">Cross-Platform Nexus Protocol</div>
                 </div>
              </div>

              <form onSubmit={handleSearch} className="space-y-12 relative z-10">
                 <div className="grid md:grid-cols-2 gap-10">
                   <div className="group relative">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-1 flex items-center gap-3 italic font-serif group-focus-within:text-cyan-600 transition-colors">
                        <User size={14} className="text-cyan-600/50" /> Target Name
                      </label>
                      <div className="relative">
                        <input 
                          required 
                          name="fullName" 
                          value={searchData.fullName} 
                          onChange={handleChange}
                          placeholder="e.g. Robin Hosain" 
                          className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-6 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 italic font-serif tracking-tight text-lg"
                        />
                        <div className="absolute bottom-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-600 to-transparent opacity-0 group-focus-within:opacity-100 transition-all duration-700" />
                      </div>
                   </div>
                   <div className="group relative">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-1 flex items-center gap-3 italic font-serif group-focus-within:text-cyan-600 transition-colors">
                        <Calendar size={14} className="text-cyan-600/50" /> Birth Sequence
                      </label>
                      <div className="relative">
                        <input 
                          required 
                          type="date" 
                          name="dob" 
                          value={searchData.dob} 
                          onChange={handleChange}
                          className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-6 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-bold text-slate-900 italic font-serif tracking-tight block text-lg"
                        />
                        <div className="absolute bottom-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-600 to-transparent opacity-0 group-focus-within:opacity-100 transition-all duration-700" />
                      </div>
                   </div>
                 </div>

                 <div className="group relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-1 flex items-center gap-3 italic font-serif group-focus-within:text-cyan-600 transition-colors">
                      <LinkIcon size={14} className="text-cyan-600/50" /> Professional Vector
                    </label>
                    <div className="relative">
                      <input 
                        required 
                        name="professionalId" 
                        value={searchData.professionalId} 
                        onChange={handleChange}
                        placeholder="LinkedIn, GitHub, or Portfolio URL" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-6 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 italic font-serif tracking-tight text-lg"
                      />
                      <div className="absolute bottom-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-600 to-transparent opacity-0 group-focus-within:opacity-100 transition-all duration-700" />
                    </div>
                    <div className="flex items-start gap-3 mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 italic font-serif">
                      <Zap size={14} className="text-cyan-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                        Verification requires exact token matching of name, date sequence, and linked professional asset to bypass privacy filters.
                      </p>
                    </div>
                 </div>

                 {error && (
                   <motion.div 
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="p-6 rounded-[2rem] bg-red-50 border border-red-100 text-red-600 text-xs font-black flex items-center gap-4 italic font-serif uppercase tracking-wider shadow-sm"
                   >
                     <AlertCircle size={20} className="text-red-500" />
                     {error}
                   </motion.div>
                 )}

                 <button 
                  disabled={loading}
                  className="w-full bg-slate-950 text-white py-7 rounded-[2.5rem] font-black text-xs md:text-sm tracking-[0.4em] uppercase shadow-2xl shadow-slate-200 hover:bg-cyan-600 transition-all flex items-center justify-center gap-4 disabled:opacity-50 italic font-serif group relative overflow-hidden"
                 >
                   <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   {loading ? <Loader2 className="animate-spin text-white" size={24} /> : <ShieldCheck className="group-hover:scale-125 transition-transform duration-500" size={24} />}
                   {loading ? 'SYNCHRONIZING PATHS...' : 'EXECUTE RETRIEVAL'}
                 </button>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 space-y-8"
            >
              <div className="bg-white border border-slate-100 p-8 rounded-[3.5rem] shadow-xl shadow-slate-200/40 relative overflow-hidden group h-full">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic font-serif flex items-center gap-3">
                  <Cpu size={16} className="text-cyan-600" /> System Metrics
                </h3>
                
                <div className="space-y-10">
                  <div className="relative">
                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic font-serif">
                      <span>Encryption Depth</span>
                      <span className="text-cyan-600">v4.0.2</span>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-[85%] bg-cyan-600 rounded-full" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic font-serif">Identity Mesh Active</div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse" />
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic font-serif">Neural Handshake Ready</div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50">
                    <p className="text-[10px] text-slate-400 font-medium italic font-serif leading-relaxed uppercase tracking-widest">
                      Our proprietary protocol ensures that only verified professional identities are accessible. Data integrity is maintained through our blockchain-inspired expertise Ledger.
                    </p>
                  </div>
                </div>

                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-600/5 rounded-full blur-3xl" />
              </div>
            </motion.div>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-16"
            >
              <div className="flex flex-col lg:flex-row items-center justify-between gap-12 bg-white border border-slate-100 p-8 md:p-12 rounded-[4rem] shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-600" />
                
                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-[3.5rem] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-[3.5px] shadow-2xl shadow-cyan-600/30 rotate-[-3deg] transition-transform duration-500 group-hover:rotate-0">
                      <div className="w-full h-full rounded-[3.3rem] bg-white flex items-center justify-center text-4xl font-display font-black text-slate-950 italic font-serif">
                        {result.firstName[0]}{result.lastName[0]}
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 border-4 border-white rounded-2xl flex items-center justify-center shadow-lg">
                      <ShieldCheck size={18} className="text-white" />
                    </div>
                  </div>
                  
                  <div className="text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                      <h2 className="text-5xl md:text-6xl font-display font-black italic font-serif tracking-tighter text-slate-950 leading-none">{result.firstName} {result.lastName}</h2>
                      <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-full text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2 italic font-serif shadow-sm shadow-emerald-500/5">
                        <Check size={14} />
                        VERIFIED NODE
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest italic font-serif flex items-center gap-2">
                        <Cpu size={14} className="text-cyan-600" /> {result.primarySector}
                      </div>
                      <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest italic font-serif flex items-center gap-2">
                        <Zap size={14} className="text-blue-600" /> TIER 1 ACCESS
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
                  {result.id !== user?.uid && (
                    <button 
                      onClick={handleConnect}
                      disabled={!!connection || connecting}
                      className={`flex-grow md:flex-none px-12 py-6 rounded-[2.5rem] font-black text-[11px] tracking-[0.25em] uppercase transition-all flex items-center justify-center gap-3 italic font-serif shadow-2xl ${
                        connection?.status === 'accepted'
                        ? 'bg-emerald-50 shadow-emerald-500/5 text-emerald-600 border border-emerald-100'
                        : connection?.status === 'pending'
                        ? 'bg-amber-50 shadow-amber-500/5 text-amber-600 border border-amber-100'
                        : 'bg-slate-950 text-white shadow-slate-200 hover:bg-cyan-600 border-transparent hover:scale-105 active:scale-95'
                      }`}
                    >
                      {connecting ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : connection?.status === 'accepted' ? (
                        <>
                          <Check size={18} />
                          CONNECTION ACTIVE
                        </>
                      ) : connection?.status === 'pending' ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          AWAITING PULSE
                        </>
                      ) : (
                        <>
                          <UserPlus size={18} />
                          ESTABLISH LINK
                        </>
                      )}
                    </button>
                  )}
                   <button 
                    onClick={() => setResult(null)}
                    className="flex-grow md:flex-none px-8 py-6 rounded-[2.5rem] bg-white border border-slate-200 text-slate-400 hover:text-slate-950 font-black text-[11px] tracking-widest uppercase italic font-serif transition-all hover:bg-slate-50 hover:border-slate-300"
                  >
                    RESET
                  </button>
                </div>

                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-cyan-600/5 rounded-full blur-[100px] pointer-events-none" />
              </div>

              <div className="grid lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3">
                  <div className="bg-white border border-slate-100 p-8 md:p-14 rounded-[4rem] overflow-hidden relative min-h-[650px] shadow-2xl shadow-slate-200/50 group hover:border-cyan-600/20 transition-all duration-1000 flex flex-col">
                    <div className="absolute top-14 left-14 z-20">
                       <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3 italic font-serif flex items-center gap-3">
                         <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-pulse" />
                         Expertise Topology
                       </h3>
                       <div className="text-[10px] text-cyan-600 font-mono tracking-[0.3em] uppercase italic font-serif opacity-60">PULSE_RENDERER_v9.12_STABLE</div>
                    </div>

                    <div className="absolute bottom-14 right-14 z-20 text-right">
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 italic font-serif">Scan Confidence</div>
                       <div className="text-3xl font-display font-black text-cyan-600 italic font-serif">99.84%</div>
                    </div>
                    
                    <div className="flex-grow flex items-center justify-center relative mt-12">
                      {/* Neural Radar Background */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[500px] h-[500px] rounded-full border border-slate-100 opacity-20" />
                        <div className="w-[400px] h-[400px] rounded-full border border-slate-100 opacity-40" />
                        <div className="w-[300px] h-[300px] rounded-full border border-slate-100 opacity-60" />
                        <div className="w-[200px] h-[200px] rounded-full border border-slate-100 opacity-80" />
                        
                        {/* Radar Sweep Effect */}
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          className="absolute w-[500px] h-[500px] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(8,145,178,0.05)_90deg,transparent_90deg)] z-10"
                        />
                      </div>

                      <div className="relative w-[300px] h-[300px] md:w-[450px] md:h-[450px] flex items-center justify-center">
                        {/* Core Node */}
                        <motion.div 
                          animate={{ 
                            boxShadow: ["0 0 20px rgba(34,211,238,0.1)", "0 0 50px rgba(34,211,238,0.3)", "0 0 20px rgba(34,211,238,0.1)"],
                            scale: [1, 1.05, 1]
                          }}
                          transition={{ duration: 4, repeat: Infinity }}
                          className="absolute w-24 h-24 md:w-28 md:h-28 bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-center z-30 shadow-2xl"
                        >
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-slate-100 shadow-inner">
                            <Cpu className="text-cyan-600 w-8 h-8 md:w-10 md:h-10 animate-pulse" />
                          </div>
                        </motion.div>

                        {[
                          { subject: 'Depth', A: result.technicalDepth, color: 'text-cyan-600', icon: <TrendingUp size={14} /> },
                          { subject: 'Velocity', A: result.activity, color: 'text-blue-600', icon: <Zap size={14} /> },
                          { subject: 'Stability', A: result.consistency, color: 'text-indigo-600', icon: <ShieldCheck size={14} /> },
                          { subject: 'Impact', A: result.network, color: 'text-emerald-600', icon: <User size={14} /> },
                          { subject: 'Breadth', A: result.diversity, color: 'text-amber-500', icon: <Award size={14} /> },
                        ].map((skill, index) => {
                          const angle = (index / 5) * (2 * Math.PI) - (Math.PI / 2);
                          const radius = window.innerWidth < 768 ? 130 : 200;
                          const x = Math.cos(angle) * radius;
                          const y = Math.sin(angle) * radius;
                          
                          return (
                            <React.Fragment key={skill.subject}>
                              {/* Connection Path */}
                              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                                <motion.line
                                  initial={{ pathLength: 0, opacity: 0 }}
                                  animate={{ pathLength: 1, opacity: 0.2 }}
                                  x1="50%" y1="50%"
                                  x2={`calc(50% + ${x}px)`}
                                  y2={`calc(50% + ${y}px)`}
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  className="text-slate-300"
                                  strokeDasharray="4 4"
                                />
                              </svg>

                              {/* Skill Node */}
                              <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="absolute flex flex-col items-center group/skill cursor-help z-30"
                                style={{
                                  left: `calc(50% + ${x}px)`,
                                  top: `calc(50% + ${y}px)`,
                                  transform: 'translate(-50%, -50%)'
                                }}
                              >
                                <motion.div 
                                  animate={{ y: [0, -10, 0] }}
                                  transition={{ duration: 4 + index, repeat: Infinity, ease: "easeInOut" }}
                                  className="relative"
                                >
                                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white border border-slate-100 rounded-2xl md:rounded-[1.8rem] flex flex-col items-center justify-center text-slate-900 shadow-xl group-hover/skill:border-cyan-600/40 group-hover/skill:scale-110 transition-all duration-500 relative z-10 overflow-hidden">
                                     <div className={`text-base md:text-xl font-display font-black tracking-tighter leading-none italic font-serif ${skill.color}`}>{skill.A}%</div>
                                     <div className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase mt-1 tracking-[0.2em] italic font-serif">POWER</div>
                                     
                                     {/* Background Icon Watermark */}
                                     <div className={`absolute -bottom-1 -right-1 opacity-[0.08] ${skill.color}`}>
                                       {React.cloneElement(skill.icon as React.ReactElement, { size: 40 })}
                                     </div>
                                  </div>

                                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                                    <div className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover/skill:text-slate-900 transition-colors duration-300 italic font-serif leading-none mb-1">
                                      {skill.subject}
                                    </div>
                                    <div className="h-[2px] w-4 mx-auto bg-slate-100 group-hover/skill:w-full group-hover/skill:bg-cyan-600 transition-all duration-500 rounded-full" />
                                  </div>
                                </motion.div>
                              </motion.div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-12">
                  <div className="bg-white border border-slate-100 p-10 rounded-[4rem] shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.015] font-serif font-black text-[12rem] uppercase pointer-events-none select-none italic text-slate-900 rotate-[-15deg]">NODE</div>
                    
                    <div className="relative z-10 text-center mb-12">
                      <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 italic font-serif border-b border-slate-50 pb-6">Core Index Summary</h3>
                      <div className="flex items-baseline justify-center gap-4 italic font-serif mb-2 relative">
                        <motion.div
                          animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }}
                          transition={{ duration: 4, repeat: Infinity }}
                          className="absolute inset-0 bg-cyan-600 blur-3xl rounded-full"
                        />
                        <div className="text-8xl font-display font-black text-slate-950 tracking-tighter leading-none relative z-10">{Math.round(result.skillScore)}</div>
                        <div className="text-xl font-black text-cyan-600 uppercase tracking-tighter relative z-10 mb-2">PNT</div>
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic font-serif">Top 1.5% Global Ranking</div>
                    </div>

                    <div className="space-y-4 relative z-10">
                       <SocialCardSearch icon={<Linkedin size={18} className="text-cyan-600" />} label="LinkedIn Core" value={result.linkedinUrl || 'NOT_LINKED'} />
                       <SocialCardSearch icon={<Github size={18} className="text-slate-950" />} label="Source Mesh" value={result.githubUrl || 'NOT_LINKED'} />
                       <SocialCardSearch icon={<ExternalLink size={18} className="text-blue-600" />} label={result.extraLinkType || 'Vector'} value={result.extraLink || 'NOT_LINKED'} />
                    </div>
                  </div>

                  <div className="bg-slate-950 p-10 rounded-[4rem] relative overflow-hidden shadow-2xl group border border-slate-900">
                     <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.1),transparent)]" />
                     <div className="relative z-10">
                       <div className="flex items-center gap-5 mb-8">
                          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 shadow-inner">
                             <TrendingUp size={28} />
                          </div>
                          <h3 className="text-xl font-display font-black italic font-serif tracking-tight text-white uppercase">Intelligence Insights</h3>
                       </div>
                       <div className="space-y-6">
                         <p className="text-slate-400 text-sm leading-relaxed font-medium italic font-serif">
                           "Cross-factor authentication confirmed. Skill patterns indicate high-velocity adaptation in {result.primarySector}. Trajectory analysis suggests consistent professional evolution."
                         </p>
                         <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic font-serif">Identity Sync Status: 100%</span>
                            <div className="flex gap-1">
                               {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-500" />)}
                            </div>
                         </div>
                       </div>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Result Modals */}
        <AnimatePresence>
          {showResultModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowResultModal(null)}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white border border-slate-200 rounded-[3rem] p-10 md:p-16 w-full max-w-2xl shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] font-serif font-black text-9xl uppercase pointer-events-none select-none italic text-slate-900 rotate-12">
                  {showResultModal === 'match' ? 'FOUND' : 'VOID'}
                </div>

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className={`w-28 h-28 rounded-[2.5rem] mb-10 flex items-center justify-center border-2 border-dashed ${showResultModal === 'match' ? 'bg-cyan-50 border-cyan-200 text-cyan-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    {showResultModal === 'match' ? <Check size={48} className="animate-bounce" /> : <ShieldAlert size={48} className="animate-pulse" />}
                  </div>

                  <h2 className="text-4xl font-display font-black tracking-tight italic font-serif uppercase text-slate-900 mb-6 leading-none">
                    {showResultModal === 'match' ? 'Identity Verified' : 'Neural Node Missing'}
                  </h2>
                  
                  <p className="text-slate-500 text-lg font-medium italic font-serif mb-12 max-w-md">
                    {showResultModal === 'match' 
                      ? `We have located the professional node for ${result?.firstName || 'this individual'}. Establish a secure connection to begin collaboration.`
                      : 'The credentials provided do not exist within our secure neural network. This identity has not yet been forged.'}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    {showResultModal === 'match' ? (
                      <>
                        <button 
                          onClick={() => {
                            if (user) {
                              setShowResultModal(null);
                            } else {
                              navigate('/login');
                            }
                          }}
                          className="flex-1 py-6 rounded-[2rem] bg-slate-950 text-white font-black text-xs tracking-[0.3em] uppercase hover:bg-cyan-600 transition-all shadow-xl shadow-slate-200 italic font-serif"
                        >
                          {user ? 'View Full Identity' : 'Log In to System (Access)'}
                        </button>
                        <button 
                          onClick={() => setShowResultModal(null)}
                          className="flex-1 py-6 rounded-[1.5rem] border border-slate-200 text-slate-400 font-black text-xs tracking-widest uppercase hover:bg-slate-50 transition-all italic font-serif"
                        >
                          Dismiss Analysis
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => navigate('/signup')}
                          className="flex-1 py-6 rounded-[2rem] bg-cyan-600 text-white font-black text-xs tracking-[0.3em] uppercase hover:bg-slate-950 transition-all shadow-xl shadow-cyan-500/20 italic font-serif"
                        >
                          Forge New Identity (Sign Up)
                        </button>
                        <button 
                          onClick={() => setShowResultModal(null)}
                          className="flex-1 py-6 rounded-[1.5rem] border border-slate-200 text-slate-400 font-black text-xs tracking-widest uppercase hover:bg-slate-50 transition-all italic font-serif"
                        >
                          Recalibrate Search
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.2);
        }
      `}</style>
    </div>
  );
}



function SocialCardSearch({ icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between p-5 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-cyan-600/30 hover:bg-white transition-all cursor-pointer group shadow-sm">
       <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-slate-100 group-hover:border-cyan-600/20 shadow-sm transition-all group-hover:scale-110">
            {icon}
          </div>
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5 group-hover:text-cyan-600 transition-colors italic font-serif">{label}</div>
            <div className="text-[11px] font-bold text-slate-900 truncate max-w-[150px] tracking-tight">{value}</div>
          </div>
       </div>
       <div className="w-2 h-2 rounded-full bg-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.4)] opacity-40 group-hover:opacity-100 group-hover:animate-pulse transition-all" />
    </div>
  );
}

function SocialCardSmall({ icon, label }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
       <div className="flex items-center gap-3">
          <div className="text-slate-400">{icon}</div>
          <span className="text-xs font-bold text-slate-500">{label}</span>
       </div>
       <div className="w-2 h-2 rounded-full bg-cyan-600 shadow-[0_0_8px_rgba(6,182,212,0.3)]" />
    </div>
  );
}
