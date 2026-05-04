import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { 
  Cpu, LogOut, Search, MessageSquare, Zap, 
  Award, TrendingUp, Newspaper
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
          className="max-w-4xl mx-auto"
        >
          <div className="mb-10 px-2">
            <h1 className="text-3xl md:text-4xl font-display font-black bg-gradient-to-r from-slate-900 via-slate-800 to-slate-500 bg-clip-text text-transparent italic font-serif tracking-tight mb-2 uppercase leading-none">
              Network Feed
            </h1>
            <p className="text-slate-400 text-[10px] md:text-xs font-medium italic font-serif tracking-wider uppercase">Collaborative Skill Insights & Neural Announcements</p>
          </div>
          <Feed userProfile={profile} />
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


