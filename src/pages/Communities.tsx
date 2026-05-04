import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  onSnapshot, collection, query, orderBy, limit, addDoc, 
  serverTimestamp, doc, getDocs, where, deleteDoc 
} from 'firebase/firestore';
import { 
  Users, Cpu, LogOut, Search, MessageSquare, Zap, 
  Award, TrendingUp, Plus, ChevronRight, Hash, Globe, Lock, Newspaper
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useLayout } from '../context/LayoutContext';

export default function Communities() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('General');
  const [creating, setCreating] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isSidebarCollapsed, toggleSidebar } = useLayout();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/login');
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data());
      }
    });

    const q = query(
      collection(db, 'groups'),
      orderBy('memberCount', 'desc'),
      limit(20)
    );

    const unsubGroups = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'groups');
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubGroups();
    };
  }, [user]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;

    setCreating(true);
    try {
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: newGroupName,
        description: newGroupDesc,
        category: newGroupCategory,
        creatorId: user.uid,
        memberCount: 1,
        createdAt: serverTimestamp()
      });

      // Add creator as member
      await addDoc(collection(db, `groups/${groupRef.id}/members`), {
        userId: user.uid,
        joinedAt: serverTimestamp(),
        role: 'admin'
      });

      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'groups');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 gap-8">
        <div className="flex flex-col items-center gap-6">
           <div className="relative">
              <div className="w-16 h-16 border-4 border-cyan-600/10 border-t-cyan-600 rounded-full animate-spin" />
              <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-cyan-600" />
           </div>
           <div className="text-cyan-600 font-bold tracking-widest uppercase text-xs animate-pulse">
             Accessing Hubs...
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-cyan-500 flex flex-col md:flex-row relative">
      {/* Background Mesh/Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] left-[15%] w-[30%] h-[30%] bg-indigo-600/5 rounded-full blur-[80px]" />
      </div>

      <Sidebar 
        activePage="communities" 
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
          activePage="communities"
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          actions={
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 md:px-6 py-2 md:py-3 rounded-xl bg-cyan-600/10 text-cyan-600 border border-cyan-600/20 hover:bg-cyan-600 hover:text-white font-black text-[9px] md:text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 italic font-serif"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">NEW HUB</span>
              <span className="sm:hidden">HUB</span>
            </button>
          }
        />

        <section>
          <div className="mb-10 px-2">
            <h1 className="text-3xl md:text-4xl font-display font-black bg-gradient-to-r from-slate-900 via-slate-800 to-slate-500 bg-clip-text text-transparent italic font-serif tracking-tight mb-2 uppercase leading-none">
              Elite Guilds
            </h1>
            <p className="text-slate-400 text-[10px] md:text-xs font-medium italic font-serif tracking-wider uppercase">Collaborative communities for technical growth</p>
          </div>
        </section>

        {/* Categories / Search */}
        <div className="flex flex-col md:flex-row gap-6 mb-16 items-center">
           <div className="relative flex-grow w-full md:w-auto overflow-hidden group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search technical communities..."
                className="w-full bg-white border border-slate-200 rounded-[2rem] py-6 pl-16 pr-6 text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-600 transition-all placeholder:text-slate-300 italic font-serif tracking-tight"
              />
              <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-cyan-600 group-focus-within:w-full transition-all duration-700" />
           </div>
           <div className="flex gap-3 overflow-x-auto pb-4 md:pb-0 scrollbar-hide w-full md:w-auto">
              {['All', 'AI/ML', 'Blockchain', 'Cybersecurity', 'FinTech', 'DevOps'].map(cat => (
                <button key={cat} className={`px-8 py-5 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap italic font-serif ${cat === 'All' ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-600/20' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-900'}`}>
                  {cat}
                </button>
              ))}
           </div>
        </div>

        {/* Groups Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
           <AnimatePresence>
             {groups.map((group) => (
               <motion.div 
                 key={group.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 whileHover={{ y: -8 }}
                 className="bg-white border border-slate-100 p-10 rounded-[3.5rem] group hover:border-cyan-500/30 transition-all duration-500 flex flex-col relative overflow-hidden shadow-2xl shadow-slate-200/50"
               >
                 <div className="absolute top-0 right-0 p-8 opacity-[0.03] font-display font-black text-6xl uppercase pointer-events-none select-none italic font-serif text-slate-900 group-hover:opacity-[0.05] transition-opacity">{group.category.slice(0, 4)}</div>
                 <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:border-cyan-500/30 transition-colors shadow-inner shadow-slate-100">
                       <Hash className="text-cyan-600 opacity-60 group-hover:opacity-100 group-hover:rotate-12 transition-all duration-500" />
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                       <Globe size={12} className="text-cyan-600 animate-pulse" />
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic font-serif">{group.category}</span>
                    </div>
                 </div>
                 
                 <h3 className="text-2xl font-display font-black text-slate-900 mb-4 group-hover:text-cyan-600 transition-colors italic font-serif tracking-tight relative z-10 leading-tight">{group.name}</h3>
                 <p className="text-slate-500 text-xs leading-relaxed mb-10 flex-grow font-medium italic font-serif relative z-10">
                   {group.description || "A professional community focused on advanced skill acquisition and technical knowledge sharing."}
                 </p>

                 <div className="flex items-center justify-between pt-8 border-t border-slate-100 relative z-10">
                    <div className="flex flex-col">
                       <span className="text-2xl font-display font-black text-slate-900 italic font-serif">{group.memberCount}</span>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic font-serif">Active Nodes</span>
                    </div>
                    <button 
                      className="px-8 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-cyan-600 hover:bg-cyan-600/10 text-slate-900 [text-shadow:none] text-[10px] font-black tracking-widest uppercase italic font-serif transition-all group/btn flex items-center gap-3 shadow-sm hover:shadow-cyan-100"
                    >
                      Connect <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                 </div>
               </motion.div>
             ))}
           </AnimatePresence>
        </div>

        {groups.length === 0 && !loading && (
          <div className="text-center py-24 bg-white rounded-[4rem] border border-dashed border-slate-200 max-w-2xl mx-auto shadow-xl">
             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-100 relative overflow-hidden group">
                <div className="absolute inset-0 bg-cyan-600/5 blur-2xl group-hover:opacity-100 transition-opacity" />
                <Users className="w-12 h-12 text-slate-300 group-hover:text-cyan-600 transition-colors duration-500" />
             </div>
             <h3 className="text-2xl font-display font-black text-slate-900 mb-4 italic font-serif tracking-tight uppercase">No Professional Hubs Detected</h3>
             <p className="text-slate-500 mb-10 max-w-sm mx-auto text-sm font-medium italic font-serif leading-relaxed">Be the first to establish a community in this sector. Pioneer the neural network.</p>
             <button 
              onClick={() => setShowCreateModal(true)}
              className="px-10 py-5 rounded-[2rem] bg-slate-950 text-white font-black text-xs tracking-[0.3em] uppercase hover:bg-cyan-600 transition-colors shadow-xl italic font-serif"
             >
               Initialize Hub
             </button>
          </div>
        )}

        {/* Create Group Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCreateModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-white border border-slate-200 p-12 rounded-[4rem] w-full max-w-xl shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] font-display font-black text-8xl uppercase pointer-events-none select-none italic font-serif text-slate-900 rotate-12">HUB</div>
                
                <h2 className="text-3xl font-display font-black text-slate-900 mb-3 italic font-serif tracking-tight uppercase leading-tight relative z-10">Initialize Hub</h2>
                <p className="text-slate-500 mb-12 text-sm font-medium italic font-serif relative z-10">Deploy a new dedicated environment for technical collaboration.</p>

                <form onSubmit={handleCreateGroup} className="space-y-8 relative z-10">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-1 group-focus-within:text-cyan-600 transition-colors italic font-serif">Hub Name</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="e.g. Quantum Computing Reserach"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all placeholder:text-slate-300 italic tracking-tight"
                        required
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-cyan-600 group-focus-within:w-full transition-all duration-700" />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-1 group-focus-within:text-cyan-600 transition-colors italic font-serif">Professional Sector</label>
                    <div className="relative">
                      <select 
                        value={newGroupCategory}
                        onChange={(e) => setNewGroupCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all appearance-none italic font-serif tracking-tight"
                      >
                        {['General', 'AI/ML', 'Blockchain', 'Cybersecurity', 'FinTech', 'DevOps'].map(cat => (
                          <option key={cat} value={cat} className="bg-white">{cat}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={18} />
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-cyan-600 group-focus-within:w-full transition-all duration-700" />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-1 group-focus-within:text-cyan-600 transition-colors italic font-serif">Strategic Description</label>
                    <div className="relative">
                      <textarea 
                        value={newGroupDesc}
                        onChange={(e) => setNewGroupDesc(e.target.value)}
                        placeholder="Define the scope and objectives for this hub..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all h-32 resize-none italic font-serif tracking-tight"
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-cyan-600 group-focus-within:w-full transition-all duration-700" />
                    </div>
                  </div>

                  <div className="flex gap-6 pt-6">
                    <button 
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-grow py-5 rounded-[2rem] bg-slate-100 border border-slate-200 text-slate-500 font-black text-[10px] tracking-widest uppercase hover:text-slate-900 hover:bg-slate-200 transition-all italic"
                    >
                      Abort
                    </button>
                    <button 
                      type="submit"
                      disabled={creating}
                      className="flex-grow py-5 rounded-[2rem] bg-slate-950 text-white font-black text-[10px] tracking-widest uppercase hover:bg-cyan-600 transition-all shadow-xl disabled:opacity-50 italic"
                    >
                      {creating ? 'Initializing...' : 'Confirm Deployment'}
                    </button>
                  </div>
                </form>
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
          background: rgba(0, 0, 0, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.3);
        }
      `}</style>
    </div>
  );
}


