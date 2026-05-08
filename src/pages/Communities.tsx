import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  onSnapshot, collection, query, orderBy, limit, addDoc, 
  serverTimestamp, doc, getDocs, where, deleteDoc, updateDoc, increment
} from 'firebase/firestore';
import { 
  Users, Cpu, LogOut, Search, MessageSquare, Zap, 
  Award, TrendingUp, Plus, ChevronRight, Hash, Globe, Lock, Newspaper,
  X, Send, CornerDownRight, CheckCircle, ArrowLeft, Trash2
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
  const [joinedGroupIds, setJoinedGroupIds] = useState<Record<string, string>>({}); // groupId -> memberDocId
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('General');
  const [creating, setCreating] = useState(false);

  // Active / Selected Group Detail Workspace
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupPosts, setGroupPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  
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
      limit(50)
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

  // Track joined groups for current user
  useEffect(() => {
    if (!user || groups.length === 0) return;

    const unsubscribers = groups.map(group => {
      const q = query(
        collection(db, `groups/${group.id}/members`),
        where('userId', '==', user.uid)
      );
      return onSnapshot(q, (snapshot) => {
        setJoinedGroupIds(prev => {
          const next = { ...prev };
          if (!snapshot.empty) {
            next[group.id] = snapshot.docs[0].id;
          } else {
            delete next[group.id];
          }
          return next;
        });
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user, groups]);

  // Sub-listener for selected group workspace discussions and active members
  useEffect(() => {
    if (!selectedGroup) {
      setGroupMembers([]);
      setGroupPosts([]);
      return;
    }

    // Unsubscribes
    let unsubMembers = () => {};
    let unsubPosts = () => {};

    try {
      // Stream Members
      unsubMembers = onSnapshot(
        query(collection(db, `groups/${selectedGroup.id}/members`), orderBy('joinedAt', 'desc'), limit(30)),
        async (snapshot) => {
          const memberList: any[] = [];
          for (const d of snapshot.docs) {
            const mData = d.data();
            // Fetch simple user details for avatars
            let uName = 'Expert Hub Developer';
            try {
              const uSnap = await getDocs(query(collection(db, 'users'), where('email', '>=', '')));
              const matchUser = uSnap.docs.find(doc => doc.id === mData.userId);
              if (matchUser) {
                const uData = matchUser.data();
                uName = `${uData.firstName} ${uData.lastName}`;
              }
            } catch (err) {}
            memberList.push({
              id: d.id,
              userId: mData.userId,
              joinedAt: mData.joinedAt,
              role: mData.role || 'Member',
              name: uName
            });
          }
          setGroupMembers(memberList);
        }
      );

      // Stream Posts
      unsubPosts = onSnapshot(
        query(collection(db, `groups/${selectedGroup.id}/posts`), orderBy('createdAt', 'desc'), limit(40)),
        (snapshot) => {
          setGroupPosts(snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })));
        }
      );

    } catch (err) {
      console.error(err);
    }

    return () => {
      unsubMembers();
      unsubPosts();
    };
  }, [selectedGroup]);

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
      setNewGroupCategory('General');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'groups');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleJoin = async (group: any) => {
    if (!user) return;
    const isJoined = joinedGroupIds[group.id];

    try {
      if (isJoined) {
        // Leave Group
        const memberRef = doc(db, `groups/${group.id}/members`, isJoined);
        await deleteDoc(memberRef);
        // Decrement count
        await updateDoc(doc(db, 'groups', group.id), {
          memberCount: increment(-1)
        });
        
        // If left the active, close workspace selection
        if (selectedGroup?.id === group.id) {
          setSelectedGroup(null);
        }
      } else {
        // Join Group
        await addDoc(collection(db, `groups/${group.id}/members`), {
          userId: user.uid,
          joinedAt: serverTimestamp(),
          role: 'Contributor'
        });
        // Increment count
        await updateDoc(doc(db, 'groups', group.id), {
          memberCount: increment(1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${group.id}`);
    }
  };

  const handlePostInGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGroup || !newPostContent.trim()) return;

    setSubmittingPost(true);
    try {
      const authorName = profile ? `${profile.firstName} ${profile.lastName}` : (user.displayName || 'Dev Expert');
      await addDoc(collection(db, `groups/${selectedGroup.id}/posts`), {
        groupId: selectedGroup.id,
        authorId: user.uid,
        authorName: authorName,
        content: newPostContent,
        createdAt: serverTimestamp()
      });
      setNewPostContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `groups/${selectedGroup.id}/posts`);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleDeleteGroupPost = async (postId: string) => {
    if (!selectedGroup) return;
    try {
      await deleteDoc(doc(db, `groups/${selectedGroup.id}/posts`, postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${selectedGroup.id}/posts/${postId}`);
    }
  };

  // Compute filtered groups
  const filteredGroups = groups.filter(g => {
    const matchesCategory = activeCategory === 'All' || g.category === activeCategory;
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (g.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              id="new-hub-btn"
              onClick={() => setShowCreateModal(true)}
              className="px-4 md:px-6 py-2 md:py-3 rounded-xl bg-cyan-600/10 text-cyan-600 border border-cyan-600/20 hover:bg-cyan-600 hover:text-white font-black text-[9px] md:text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 italic font-serif cursor-pointer"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">NEW HUB</span>
              <span className="sm:hidden">HUB</span>
            </button>
          }
        />

        {selectedGroup ? (
          // ACTIVE GROUP WORKSPACE DETAIL VIEW
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-100 rounded-[3rem] p-6 md:p-12 shadow-2xl shadow-slate-200/50 mb-10 overflow-hidden"
          >
            {/* Header / Context */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-8 mb-8">
              <div className="flex items-center gap-4">
                <button 
                  id="back-to-hubs-btn"
                  onClick={() => setSelectedGroup(null)}
                  className="p-3.5 rounded-full bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                  title="Back to Communities"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest italic font-serif bg-cyan-50 px-3 py-1 rounded-full">{selectedGroup.category}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[10px] font-bold text-slate-400 italic">Established Sector</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-display font-black text-slate-900 italic font-serif">{selectedGroup.name}</h2>
                </div>
              </div>
              <button
                id="leave-group-btn"
                onClick={() => handleToggleJoin(selectedGroup)}
                className="px-6 py-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white text-[10px] font-black tracking-widest uppercase transition-all italic font-serif cursor-pointer"
              >
                Disconnect Node
              </button>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed italic mb-8 border-l-4 border-cyan-500 pl-4 bg-slate-50/50 py-3 rounded-r-xl">
              {selectedGroup.description || "Active digital hub for sharing strategic resources, system architectures, and technical progress updates."}
            </p>

            {/* Split layout for feed & member sidebar */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left 2 cols: Activity / Feed */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase italic font-serif mb-4 flex items-center gap-2">
                  <Newspaper size={14} className="text-cyan-600 animate-pulse" /> Community Neural Feed
                </h3>

                {/* Submit New Post form */}
                <form id="group-post-form" onSubmit={handlePostInGroup} className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 relative group focus-within:border-cyan-500/30 transition-all duration-300">
                  <textarea
                    id="new-post-textarea"
                    required
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Broadcast your architectural updates, findings, or technical inquiries..."
                    className="w-full bg-transparent border-none text-slate-900 placeholder:text-slate-350 text-sm font-semibold italic tracking-tight focus:outline-none resize-none h-24"
                  />
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
                    <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase italic">POST AS {profile ? `${profile.firstName} ${profile.lastName}` : 'Anonym'}</span>
                    <button
                      type="submit"
                      disabled={submittingPost || !newPostContent.trim()}
                      className="px-6 py-3 rounded-2xl bg-cyan-600 text-white font-black text-[9px] tracking-widest uppercase hover:bg-cyan-700 transition-colors disabled:opacity-40 italic flex items-center gap-2 cursor-pointer"
                    >
                      {submittingPost ? 'BROADCASTING...' : 'BROADCAST'}
                      <Send size={12} />
                    </button>
                  </div>
                </form>

                {/* Posts stream */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {groupPosts.map((post) => (
                    <div key={post.id} className="p-6 bg-slate-50/30 rounded-[2rem] border border-slate-100/50 hover:border-slate-100 transition-all relative group/post">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-600/10 flex items-center justify-center font-bold text-xs text-cyan-600 font-serif italic">
                            {(post.authorName || 'D').charAt(0)}
                          </div>
                          <div>
                            <span className="text-[11px] font-black text-slate-800 tracking-tight italic font-serif">{post.authorName}</span>
                            <span className="text-[8px] text-slate-400 block tracking-widest font-black">
                              {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                        </div>

                        {post.authorId === user?.uid && (
                          <button
                            id={`delete-post-${post.id}`}
                            onClick={() => handleDeleteGroupPost(post.id)}
                            className="p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer opacity-0 group-hover/post:opacity-100"
                            title="Delete Node Broadcast"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <p className="text-slate-600 text-xs italic leading-relaxed font-serif pl-1 whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>
                  ))}

                  {groupPosts.length === 0 && (
                    <div className="text-center py-16 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-100">
                      <MessageSquare className="mx-auto text-slate-300 mb-4 animate-bounce" size={24} />
                      <p className="text-slate-400 text-xs font-black tracking-widest uppercase italic font-serif">No Neural Feeds Found</p>
                      <p className="text-slate-300 text-[10px] mt-1 font-serif italic">Submit the first broadcast in this hub.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Col: Active Members List */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-6 lg:p-8">
                <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase italic font-serif mb-6 flex items-center gap-2">
                  <Users size={14} className="text-cyan-600" /> Connected Nodes ({groupMembers.length})
                </h3>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] italic font-serif">
                            {member.name.charAt(0)}
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-800 tracking-tight block italic">{member.name}</span>
                          <span className="text-[8px] font-bold text-cyan-600/80 uppercase tracking-widest select-none">{member.role}</span>
                        </div>
                      </div>

                      {member.role === 'admin' ? (
                        <Award size={14} className="text-cyan-600" title="Founder Node" />
                      ) : (
                        <Zap size={14} className="text-slate-300" />
                      )}
                    </div>
                  ))}

                  {groupMembers.length === 0 && (
                    <p className="text-xs text-slate-300 italic font-serif text-center py-4">Re-indexing active participants...</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          // GUILDS GRID & DIRECTORY VIEW
          <>
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
                    id="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search technical communities..."
                    className="w-full bg-white border border-slate-200 rounded-[2rem] py-6 pl-16 pr-6 text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-600 transition-all placeholder:text-slate-300 italic font-serif tracking-tight"
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-cyan-600 group-focus-within:w-full transition-all duration-700" />
               </div>
               <div className="flex gap-3 overflow-x-auto pb-4 md:pb-0 scrollbar-hide w-full md:w-auto">
                  {['All', 'AI/ML', 'Blockchain', 'Cybersecurity', 'FinTech', 'DevOps'].map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => setActiveCategory(cat)}
                      className={`px-8 py-5 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap italic font-serif cursor-pointer ${activeCategory === cat ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-600/20' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-900'}`}
                    >
                      {cat}
                    </button>
                  ))}
               </div>
            </div>

            {/* Groups Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
               <AnimatePresence>
                 {filteredGroups.map((group) => {
                   const isJoined = joinedGroupIds[group.id] !== undefined;
                   return (
                     <motion.div 
                       key={group.id}
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       whileHover={{ y: -8 }}
                       className={`bg-white border p-10 rounded-[3.5rem] group hover:border-cyan-500/30 transition-all duration-500 flex flex-col relative overflow-hidden shadow-2xl shadow-slate-200/50 ${isJoined ? 'border-cyan-100 bg-gradient-to-br from-white to-cyan-50/10' : 'border-slate-105'}`}
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
                          <div className="flex flex-col gap-2 items-end">
                            {isJoined ? (
                              <div className="flex gap-2">
                                <button
                                  id={`enter-workspace-${group.id}`}
                                  onClick={() => setSelectedGroup(group)}
                                  className="px-5 py-3 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 text-[9px] font-black tracking-widest uppercase italic font-serif transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-150"
                                >
                                  ENTER
                                </button>
                                <button
                                  id={`leave-button-${group.id}`}
                                  onClick={() => handleToggleJoin(group)}
                                  className="px-3.5 py-3 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-100 transition-all cursor-pointer"
                                  title="Leave Guild"
                                >
                                  <LogOut size={12} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                id={`join-button-${group.id}`}
                                onClick={() => handleToggleJoin(group)}
                                className="px-8 py-3.5 rounded-2xl bg-cyan-600/10 text-cyan-600 border border-cyan-600/20 hover:bg-cyan-600 hover:text-white [text-shadow:none] text-[10px] font-black tracking-widest uppercase italic font-serif transition-all group/btn flex items-center gap-3 shadow-sm hover:shadow-cyan-100 cursor-pointer"
                              >
                                CONNECT <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                              </button>
                            )}
                          </div>
                       </div>
                     </motion.div>
                   );
                 })}
               </AnimatePresence>
            </div>

            {filteredGroups.length === 0 && !loading && (
              <div className="text-center py-24 bg-white rounded-[4rem] border border-dashed border-slate-200 max-w-2xl mx-auto shadow-xl">
                 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-100 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-cyan-600/5 blur-2xl group-hover:opacity-100 transition-opacity" />
                    <Users className="w-12 h-12 text-slate-300 group-hover:text-cyan-600 transition-colors duration-500" />
                 </div>
                 <h3 className="text-2xl font-display font-black text-slate-900 mb-4 italic font-serif tracking-tight uppercase">No Matching Hubs Detected</h3>
                 <p className="text-slate-500 mb-10 max-w-sm mx-auto text-sm font-medium italic font-serif leading-relaxed">Consider initiating a custom node or modifying filters to connect to the network.</p>
                 <button 
                  onClick={() => setShowCreateModal(true)}
                  className="px-10 py-5 rounded-[2rem] bg-slate-950 text-white font-black text-xs tracking-[0.3em] uppercase hover:bg-cyan-600 transition-colors shadow-xl italic font-serif cursor-pointer"
                 >
                   Initialize Hub
                 </button>
              </div>
            )}
          </>
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
                        id="new-group-name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="e.g. Quantum Computing Research"
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
                        id="new-group-category"
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
                        id="new-group-desc"
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
                      className="flex-grow py-5 rounded-[2rem] bg-slate-100 border border-slate-200 text-slate-500 font-black text-[10px] tracking-widest uppercase hover:text-slate-900 hover:bg-slate-200 transition-all italic cursor-pointer"
                    >
                      Abort
                    </button>
                    <button 
                      type="submit"
                      disabled={creating}
                      className="flex-grow py-5 rounded-[2rem] bg-slate-950 text-white font-black text-[10px] tracking-widest uppercase hover:bg-cyan-600 transition-all shadow-xl disabled:opacity-50 italic cursor-pointer"
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
