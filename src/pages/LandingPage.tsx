import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Cpu, Share2, Search, ArrowRight, UserCheck, Calendar, Link2, Loader2, Hash, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchName, setSearchName] = useState('');
  const [searchDob, setSearchDob] = useState('');
  const [searchLink, setSearchLink] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResultModal, setShowResultModal] = useState<'no_match' | 'match' | null>(null);
  const [matchedUser, setMatchedUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = async () => {
    if (!searchName || !searchDob || !searchLink) return;
    setIsSearching(true);
    setMatchedUser(null);

    try {
      const searchFullName = searchName.trim().toLowerCase();
      const usersRef = collection(db, 'users');
      
      // Multi-factor check: DOB + Name + Social Link
      const q = query(usersRef, where('dob', '==', searchDob));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setShowResultModal('no_match');
      } else {
        let matched = false;
        querySnapshot.forEach(doc => {
          const data = doc.data();
          const dbFullName = `${data.firstName} ${data.lastName}`.trim().toLowerCase();
          
          const normalizedDbName = dbFullName.replace(/\s+/g, ' ');
          const normalizedSearchName = searchFullName.replace(/\s+/g, ' ');

          if (normalizedDbName === normalizedSearchName) {
            const links = [data.linkedinUrl, data.githubUrl, data.portfolioUrl];
            const searchL = searchLink.toLowerCase();
            if (links.some(l => l && (l.toLowerCase().includes(searchL) || searchL.includes(l.toLowerCase())))) {
              setMatchedUser({ ...data, id: doc.id });
              matched = true;
              setShowResultModal('match');
            }
          }
        });

        if (!matched) {
          setShowResultModal('no_match');
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 font-sans selection:bg-cyan-500 overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-100/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/30 blur-[120px] rounded-full" />
      </div>

      {/* 1. Navbar */}
      <nav className="flex justify-between items-center px-6 md:px-10 py-6 border-b border-slate-100 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2"
        >
          <Cpu className="text-cyan-400 w-8 h-8" />
          iskill
        </motion.div>
        
        <div className="space-x-8 hidden md:flex text-slate-500 font-medium">
          <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How it Works</a>
          <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
          <a href="#search" className="hover:text-cyan-400 transition-colors">Secure Search</a>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-slate-600 hover:text-slate-900 transition-colors font-medium px-4 py-2"
            >
              Login
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-cyan-200/50 hover:scale-105 active:scale-95"
            >
              Join Now
            </button>
          </div>
          
          {/* Mobile Menu Trigger */}
          <button 
            className="md:hidden p-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Hash size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-20 bg-white border-b border-slate-100 p-6 z-[49] md:hidden shadow-2xl"
          >
            <div className="flex flex-col gap-6">
              <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-slate-600">How it Works</a>
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-slate-600">Features</a>
              <a href="#search" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-slate-600">Secure Search</a>
              <div className="h-px bg-slate-100 my-2" />
              <button onClick={() => navigate('/login')} className="text-left text-lg font-bold text-cyan-600">Login</button>
              <button onClick={() => navigate('/signup')} className="w-full bg-cyan-600 text-white py-4 rounded-2xl font-bold">Join Now</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Hero Section */}
      <header className="relative pt-32 pb-40 text-center max-w-7xl mx-auto z-10 overflow-hidden px-6">
        {/* Intelligent Neural Background for Hero */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Central Gravity Pulse */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-[radial-gradient(circle,rgba(34,211,238,0.15)_0%,transparent_70%)] blur-[100px]"
          />

          {/* Floating Knowledge Nodes */}
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={`h-node-${i}`}
              initial={{ 
                x: Math.random() * 100 + "%", 
                y: Math.random() * 100 + "%",
                scale: Math.random() * 0.5 + 0.2
              }}
              animate={{ 
                x: [null, (Math.random() * 100) + "%"],
                y: [null, (Math.random() * 100) + "%"],
                opacity: [0.1, 0.6, 0.1]
              }}
              transition={{ 
                duration: 20 + Math.random() * 30, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_12px_#22d3ee]"
            >
               {i % 8 === 0 && (
                <motion.div 
                  animate={{ scale: [1, 4], opacity: [0.3, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute inset-0 bg-cyan-500 rounded-full"
                />
               )}
            </motion.div>
          ))}

          {/* Kinetic Connectivity Lines (Flickering) */}
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={`h-line-${i}`}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.1, 0],
                width: ["0%", "100%", "0%"]
              }}
              transition={{ 
                duration: 5 + Math.random() * 5, 
                repeat: Infinity, 
                delay: i * 2 
              }}
              className="absolute h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
              style={{ 
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                transform: `rotate(${Math.random() * 360}deg)`,
                width: `${Math.random() * 300 + 100}px`
              }}
            />
          ))}

          {/* Data Fragment Streams */}
          <div className="absolute inset-0 opacity-[0.05] flex justify-between px-20">
             {[...Array(6)].map((_, i) => (
               <motion.div
                key={`stream-${i}`}
                animate={{ y: ["-100%", "100%"] }}
                transition={{ duration: 15 + Math.random() * 10, repeat: Infinity, ease: "linear" }}
                className="text-[10px] font-mono leading-none whitespace-pre"
               >
                 {Array(50).fill(0).map(() => Math.round(Math.random())).join('\n')}
               </motion.div>
             ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 cursor-default"
        >
          <motion.div 
            whileHover={{ scale: 1.1, backgroundColor: "rgba(34, 211, 238, 0.2)" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-8 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Next-Gen Skill Profiling
          </motion.div>
          
          <motion.h1 
            whileHover={{ scale: 1.05 }}
            className="text-6xl md:text-8xl font-black mb-8 leading-[1.1] tracking-tight transition-transform duration-300 text-slate-900"
          >
            Bridging Professional <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700">
              Identity with AI
            </span>
          </motion.h1>
          
          <motion.p 
            whileHover={{ scale: 1.05, color: "#000" }}
            className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed transition-all duration-300"
          >
            A unified intelligence platform that aggregates your GitHub, LinkedIn, and portfolios into a single, AI-verified professional profile using deep semantic analysis.
          </motion.p>

          {/* Search Bar Teaser */}
          <div className="relative max-w-4xl mx-auto z-20">
            <div className="bg-white/80 p-6 rounded-[2.5rem] border border-slate-200/50 backdrop-blur-xl shadow-2xl flex flex-col gap-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center bg-slate-50/50 rounded-2xl px-5 py-5 border border-slate-200 focus-within:border-cyan-500 transition-colors">
                  <Search className="w-5 h-5 text-slate-400 mr-3" />
                  <input 
                    type="text" 
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Full Name" 
                    className="bg-transparent w-full outline-none text-slate-800 placeholder:text-slate-400 font-medium text-sm"
                  />
                </div>
                <div className="flex items-center bg-slate-50/50 rounded-2xl px-5 py-5 border border-slate-200 focus-within:border-cyan-500 transition-colors">
                  <Calendar className="w-5 h-5 text-slate-400 mr-3" />
                  <input 
                    type="date" 
                    value={searchDob}
                    onChange={(e) => setSearchDob(e.target.value)}
                    className="bg-transparent w-full outline-none text-slate-800 placeholder:text-slate-400 font-medium text-sm"
                  />
                </div>
                <div className="flex items-center bg-slate-50/50 rounded-2xl px-5 py-5 border border-slate-200 focus-within:border-cyan-500 transition-colors">
                  <Link2 className="w-5 h-5 text-slate-400 mr-3" />
                  <input 
                    type="text" 
                    value={searchLink}
                    onChange={(e) => setSearchLink(e.target.value)}
                    placeholder="LinkedIn/GitHub URL" 
                    className="bg-transparent w-full outline-none text-slate-800 placeholder:text-slate-400 font-medium text-sm"
                  />
                </div>
              </div>
              <button 
                onClick={handleSearch}
                disabled={isSearching}
                className="w-full bg-slate-950 text-white py-6 rounded-[1.5rem] font-black text-xs tracking-[0.4em] uppercase shadow-2xl shadow-slate-200 hover:bg-cyan-600 transition-all flex items-center justify-center gap-4 disabled:opacity-50 italic font-serif"
              >
                {isSearching ? <Loader2 className="animate-spin w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                {isSearching ? 'Analyzing Node...' : 'Verify & Search'}
              </button>
            </div>

            {/* Modal Components */}
            <AnimatePresence>
              {showResultModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
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
                      <div className={`w-28 h-28 rounded-[2.5rem] mb-10 flex items-center justify-center border-2 border-dashed ${showResultModal === 'match' ? 'bg-cyan-50 border-cyan-200 text-cyan-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                        {showResultModal === 'match' ? <UserCheck size={48} className="animate-bounce" /> : <Shield className="size-12 animate-pulse" />}
                      </div>

                      <h2 className="text-4xl font-display font-black tracking-tight italic font-serif uppercase text-slate-900 mb-6 leading-none">
                        {showResultModal === 'match' ? 'Identity Found' : 'Identity Not Found'}
                      </h2>
                      
                      <p className="text-slate-500 text-lg font-medium italic font-serif mb-12 max-w-md">
                        {showResultModal === 'match' 
                          ? `We found a verified node for this identity! To view their full professional profile and connect, you must be a member of the portal. Please log in or join us.`
                          : 'No professional node matches these credentials in our neural network. Be the first to forge this identity by creating your own account.'}
                      </p>

                      <div className="flex flex-col sm:flex-row gap-4 w-full">
                        {showResultModal === 'match' ? (
                          <>
                            <button 
                              onClick={() => navigate('/login')}
                              className="flex-1 py-6 rounded-[2rem] bg-slate-950 text-white font-black text-xs tracking-[0.3em] uppercase hover:bg-cyan-600 transition-all shadow-xl italic font-serif"
                            >
                              Log In to Access
                            </button>
                            <button 
                              onClick={() => navigate('/signup')}
                              className="flex-1 py-6 rounded-[1.5rem] border border-slate-200 text-slate-400 font-black text-xs tracking-widest uppercase hover:bg-slate-50 transition-all italic font-serif"
                            >
                              Join Portal
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => navigate('/signup')}
                              className="flex-1 py-6 rounded-[2rem] bg-cyan-600 text-white font-black text-xs tracking-[0.3em] uppercase hover:bg-slate-950 transition-all shadow-xl shadow-cyan-500/20 italic font-serif"
                            >
                              Create Your Account
                            </button>
                            <button 
                              onClick={() => setShowResultModal(null)}
                              className="flex-1 py-6 rounded-[1.5rem] border border-slate-200 text-slate-400 font-black text-xs tracking-widest uppercase hover:bg-slate-50 transition-all italic font-serif"
                            >
                              Back to Search
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </header>

      {/* 3. Research/Features Section */}
      <section id="features" className="relative py-40 px-6 md:px-10 overflow-hidden bg-slate-50/30">
        {/* Section Decorative Elements */}
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-blue-50/50 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-cyan-50/50 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/5 border border-slate-950/10 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6 font-mono"
            >
              Academic Foundation
            </motion.div>
            <h2 className="text-5xl md:text-7xl font-serif mb-8 text-slate-950 tracking-tight leading-[1.05] italic">
              Powered by Advanced <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700">Research Models</span>
            </h2>
            <p className="text-slate-600 max-w-3xl mx-auto text-xl font-academic leading-relaxed italic">
              Our platform implements the methodology verified in our recent thesis study at Daffodil International University, bridging academic theory with professional practice.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Share2 className="w-8 h-8 text-cyan-600" />,
                title: "Multi-Platform Fusion",
                desc: "Aggregates behavioral data from GitHub, LinkedIn, and more for a 360-degree professional view.",
                accent: "cyan"
              },
              {
                icon: <Cpu className="w-8 h-8 text-blue-600" />,
                title: "BERT Semantic Engine",
                desc: "Fine-tuned BERT models understand the context of your projects with 93% classification accuracy.",
                accent: "blue"
              },
              {
                icon: <Zap className="w-8 h-8 text-amber-600" />,
                title: "CELBE Framework",
                desc: "Cross-domain Expertise Latency & Behavioral Entropy model to measure professional stability and maturity.",
                accent: "amber"
              },
              {
                icon: <Shield className="w-8 h-8 text-indigo-600" />,
                title: "Identity Verification",
                desc: "Prevent impersonation with a triple-key verification system (Name + DOB + Social Link).",
                accent: "indigo"
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -12, scale: 1.02 }}
                className="group relative p-10 rounded-[3rem] bg-white/70 backdrop-blur-xl border border-slate-200/60 hover:border-cyan-500/30 transition-all duration-500 shadow-xl shadow-slate-200/20"
              >
                {/* Decorative Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-cyan-50/30 opacity-0 group-hover:opacity-100 rounded-[3rem] transition-opacity duration-700" />
                
                <div className="relative z-10">
                  <div className={`w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-10 border border-slate-100 group-hover:bg-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner group-hover:shadow-lg group-hover:shadow-${feature.accent}-500/10`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-display font-bold mb-4 text-slate-900 group-hover:text-cyan-600 transition-colors duration-300 tracking-tight">
                    {feature.title}
                  </h3>
                  <div className="w-12 h-1 bg-slate-100 group-hover:w-20 group-hover:bg-cyan-500 transition-all duration-500 mb-6" />
                  <p className="text-slate-500 leading-relaxed font-medium transition-colors duration-300 group-hover:text-slate-700">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Stats Section */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-[3rem] p-12 md:p-20 border border-cyan-500/20 relative overflow-hidden">
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                Proven Performance <br /> 
                Through Research.
              </h2>
              <p className="text-slate-700 text-lg mb-8 font-medium">
                Evaluated against traditional SVM and Naive Bayes models to deliver superior profiling precision.
              </p>
              <button 
                onClick={() => navigate('/signup')}
                className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-cyan-50 hover:scale-105 transition-all"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: "BERT Accuracy", val: "93%" },
                { label: "Processing Time", val: "1.8s" },
                { label: "Data Quality", val: "High" },
                { label: "Security", val: "AES-256" }
              ].map((stat, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.05)" }}
                  className="bg-slate-950/40 backdrop-blur-sm p-6 rounded-3xl border border-white/5 cursor-default transition-colors"
                >
                  <div className="text-3xl font-black text-white mb-1">{stat.val}</div>
                  <div className="text-cyan-400/70 text-sm font-bold uppercase tracking-wider">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="py-20 px-6 text-center text-slate-400 border-t border-slate-100">
        <div className="flex justify-center gap-8 mb-8 text-slate-500">
          <a href="#" className="hover:text-cyan-600 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-cyan-600 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-cyan-600 transition-colors">Research Paper</a>
        </div>
        <motion.p 
          whileHover={{ scale: 1.05 }}
          className="text-sm font-medium cursor-default transition-transform text-slate-500"
        >
          © 2025 Daffodil International University. <br />
          <span className="text-slate-400">Developed by Md. Rubel Hosain • Thesis Supervision Project</span>
        </motion.p>
      </footer>
    </div>
  );
}
