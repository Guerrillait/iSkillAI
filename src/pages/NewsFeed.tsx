import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { onSnapshot, doc, collection, query, where, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Cpu, LogOut, Search, MessageSquare, Zap, 
  Award, TrendingUp, Newspaper, UserPlus, Check, Loader2, ShieldCheck, User, Sparkles, Globe, ChevronRight
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Feed from '../components/Feed';
import { useLayout } from '../context/LayoutContext';

export default function NewsFeed() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Discover Section States
  const [discoverUsers, setDiscoverUsers] = useState<any[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [userConnections, setUserConnections] = useState<Record<string, { id: string; status: string }>>({});
  const [connectingId, setConnectingId] = useState<string | null>(null);

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
    const unsubDoc = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data());
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      setLoading(false);
    });

    return () => unsubDoc();
  }, [user]);

  // Discoverable Users Live Stream
  useEffect(() => {
    if (!user) return;
    setDiscoverLoading(true);
    
    // Limits the query to get top nodes active in database
    const qUsers = query(collection(db, 'users'), limit(25));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== user.uid); // Exclude self
      
      setDiscoverUsers(list.slice(0, 5));
      setDiscoverLoading(false);
    }, (error) => {
      console.error("Discover Nodes Fetch Fail:", error);
      setDiscoverLoading(false);
    });

    return () => unsubUsers();
  }, [user]);

  // Sync Live Connections
  useEffect(() => {
    if (!user) return;
    const qConns = query(collection(db, 'connections'), where('userIds', 'array-contains', user.uid));
    const unsubConns = onSnapshot(qConns, (snapshot) => {
      const statuses: Record<string, { id: string; status: string }> = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        const otherId = data.userIds.find((id: string) => id !== user.uid);
        if (otherId) {
          statuses[otherId] = {
            id: d.id,
            status: data.status
          };
        }
      });
      setUserConnections(statuses);
    }, (error) => {
      console.error("Connection trace fail:", error);
    });

    return () => unsubConns();
  }, [user]);

  // Connection Handler
  const handleConnectUser = async (targetUser: any) => {
    if (!user || connectingId) return;
    setConnectingId(targetUser.id);
    try {
      const connRef = await addDoc(collection(db, 'connections'), {
        userIds: [user.uid, targetUser.id],
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Spawn Notification
      await addDoc(collection(db, 'notifications'), {
        userId: targetUser.id,
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
      setConnectingId(null);
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
             Syncing Node...
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
        activePage="news" 
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
          activePage="news"
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
        />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto px-2"
        >
          <div className="grid lg:grid-cols-3 gap-10 items-start">
            
            {/* Left Feed Area (Cols 1 & 2) */}
            <div className="lg:col-span-2 space-y-8">
              <div className="mb-10 px-2">
                <h1 className="text-3xl md:text-4xl font-display font-black bg-gradient-to-r from-slate-900 via-slate-800 to-slate-500 bg-clip-text text-transparent italic font-serif tracking-tight mb-2 uppercase leading-none">
                  Network Feed
                </h1>
                <p className="text-slate-400 text-[10px] md:text-xs font-medium italic font-serif tracking-wider uppercase">Collaborative Skill Insights & Neural Announcements</p>
              </div>
              <Feed userProfile={profile} />
            </div>

            {/* Right Side Discover Panel (Col 3) */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8 mt-12 lg:mt-0">
              
              <div className="bg-white border border-slate-200/60 p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.015] font-serif font-black text-6xl uppercase pointer-events-none select-none italic text-slate-900 rotate-12">DISCOVER</div>
                
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-150">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-600 animate-pulse" />
                    <h3 className="text-[11px] font-black tracking-widest text-slate-400 uppercase italic font-serif">Discover Nodes</h3>
                  </div>
                  <button 
                    id="deep-scan-nav-btn"
                    onClick={() => navigate('/search')}
                    className="text-[9px] font-black tracking-widest text-cyan-600 uppercase hover:text-cyan-700 transition-colors italic font-serif cursor-pointer hover:underline"
                  >
                    Deep Scan
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 font-medium italic leading-relaxed uppercase tracking-wider mb-6">
                  Instantly sync and establish secure verified handshakes with newly deployed professional profiles.
                </p>

                {discoverLoading ? (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Scanning Network...</span>
                  </div>
                ) : discoverUsers.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-100 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic font-serif">Awaiting verified handshakes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {discoverUsers.map((item) => {
                      const connInfo = userConnections[item.id];
                      const isConnecting = connectingId === item.id;
                      
                      return (
                        <div 
                          key={item.id} 
                          className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/80 hover:bg-white hover:border-cyan-600/20 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group/user"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white flex items-center justify-center font-bold text-xs italic font-serif shadow-sm">
                                {item.firstName?.[0] || 'D'}{item.lastName?.[0] || 'N'}
                              </div>
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                                <ShieldCheck size={9} className="text-white" />
                              </span>
                            </div>
                            <div className="min-w-0 pr-1">
                              <div className="text-[11px] font-black text-slate-800 tracking-tight block truncate group-hover/user:text-cyan-600 transition-colors italic font-serif">
                                {item.firstName} {item.lastName}
                              </div>
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate mb-1">
                                {item.primarySector || 'Engineering'}
                              </div>
                              <div className="inline-block bg-cyan-600/5 px-2 py-0.5 rounded-md text-[8px] font-bold text-cyan-600 scale-95 origin-left">
                                {Math.round(item.skillScore || 80)} PNT
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 ml-1">
                            {connInfo?.status === 'accepted' ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg select-none">
                                <Check size={10} /> Active
                              </span>
                            ) : connInfo?.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg select-none">
                                Pending
                              </span>
                            ) : (
                              <button
                                id={`sidebar-connect-${item.id}`}
                                disabled={isConnecting}
                                onClick={() => handleConnectUser(item)}
                                className="px-3 py-1.5 bg-slate-950 text-white hover:bg-cyan-600 hover:scale-105 active:scale-95 transition-all text-[8px] font-black tracking-widest uppercase italic font-serif rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                {isConnecting ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <UserPlus size={10} />
                                )}
                                <span>Connect</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick system metric or deep invite box */}
              <div className="bg-slate-950 p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-slate-900 group">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.1),transparent)]" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <Globe size={16} className="text-cyan-400 animate-pulse" />
                    <h3 className="text-xs font-black tracking-widest text-white uppercase italic font-serif">Neural Singularity</h3>
                  </div>
                  <p className="text-slate-400 text-[10px] leading-relaxed font-semibold italic mb-4">
                    Expand your network nodes to unlock additional tier-1 verification pathways and collaboration workspace bandwidth.
                  </p>
                  <button 
                    onClick={() => navigate('/search')}
                    className="text-[9px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest italic font-serif flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    LAUNCH SYSTEM DEEP SCAN <ChevronRight size={10} />
                  </button>
                </div>
              </div>

            </div>

          </div>
        </motion.div>
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


