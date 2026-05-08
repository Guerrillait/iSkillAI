import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  onSnapshot, doc, collection, query, where, addDoc, 
  deleteDoc, updateDoc, serverTimestamp, getDocs, limit, orderBy 
} from 'firebase/firestore';
import { nudgeIntelligence } from '../lib/semanticEngine';
import { 
  Cpu, LogOut, Loader2, MessageSquare, Newspaper, 
  UserCircle, Edit3, Save, X, Camera, Zap, ShieldCheck, 
  Plus, ArrowLeft, RefreshCcw, Sparkles, Smile, Trash2, Send, Image as ImageIcon,
  Check, Copy, Award, BookOpen, Clock, Heart, Terminal, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useLayout } from '../context/LayoutContext';

interface CommentSectionProps {
  postId: string;
  userProfile: any;
}

function CommentSection({ postId, userProfile }: CommentSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(25)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `posts/${postId}/comments`);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userProfile) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        authorId: auth.currentUser?.uid,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`,
        authorPhoto: userProfile.photoURL || '',
        content: newComment,
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/comments`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
      <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
              {comment.authorPhoto ? (
                <img src={comment.authorPhoto} className="w-full h-full object-cover" alt={comment.authorName} />
              ) : (
                <span className="text-[9px] font-black font-mono text-slate-500">{comment.authorName?.[0]}</span>
              )}
            </div>
            <div className="flex-grow min-w-0 bg-slate-50 border border-slate-100/80 p-3 rounded-2xl">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">{comment.authorName}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase font-mono tracking-widest">• {comment.createdAt?.toDate?.() ? new Date(comment.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium break-words">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-4 bg-slate-50/50 border border-dashed border-slate-200/60 rounded-xl">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.16em] italic">No active professional responses yet.</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Offer academic input or feedback..."
          className="flex-grow bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-cyan-500/30 transition-all font-medium resize-none h-11 italic placeholder:text-slate-350"
        />
        <button 
          disabled={loading || !newComment.trim()}
          className="w-11 h-11 flex-shrink-0 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer shadow-sm"
        >
          {loading ? <Loader2 className="animate-spin text-white" size={13} /> : <Send size={13} />}
        </button>
      </form>
    </div>
  );
}

export default function MyPosts() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mediaFile, setMediaFile] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [expandedCommentPostId, setExpandedCommentPostId] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isSidebarCollapsed, toggleSidebar } = useLayout();

  // Listen to Auth State
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

  // Listen to User Profile Doc
  useEffect(() => {
    if (!user) return;

    const unsubDoc = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubDoc();
  }, [user]);

  // Listen to User's OWN posts
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userPublications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by createdAt descending
      userPublications.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setPosts(userPublications);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPost.trim() && !mediaFile) || !profile) return;

    setCreating(true);
    try {
      const payloadSize = JSON.stringify({
        authorId: auth.currentUser?.uid,
        authorName: `${profile.firstName} ${profile.lastName}`,
        content: newPost,
        domain: profile.primarySector || 'General',
        media: mediaFile,
        mediaType: mediaType,
        reactions: {},
      }).length;

      if (payloadSize > 1000000) {
        alert('Transmission package limits exceeded (1MB max). Reduce text or compress resource.');
        setCreating(false);
        return;
      }

      await addDoc(collection(db, 'posts'), {
        authorId: auth.currentUser?.uid,
        authorName: `${profile.firstName} ${profile.lastName}`,
        authorPhoto: profile.photoURL || '',
        content: newPost,
        domain: profile.primarySector || 'General',
        media: mediaFile,
        mediaType: mediaType,
        reactions: {},
        createdAt: serverTimestamp()
      });

      if (auth.currentUser) {
        await nudgeIntelligence(auth.currentUser.uid, 'POST', newPost);
      }

      setNewPost('');
      setMediaFile(null);
      setMediaType(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setCreating(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm('Retrieve node? This will permanently delete this publication.')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'posts');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Raw input file too large. Max 5MB allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (file.type.startsWith('image/')) {
        setMediaType('image');
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 900;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);

          if (compressed.length > 800000) {
            alert('Calculated image entropy is too high. Choose a simpler resource.');
            return;
          }
          setMediaFile(compressed);
        };
        img.src = result;
      } else if (file.type.startsWith('video/')) {
        if (result.length > 800000) {
          alert('Input exceeds direct transmission guidelines. Max 750KB.');
          return;
        }
        setMediaType('video');
        setMediaFile(result);
      }
    };
    reader.readAsDataURL(file);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 gap-6">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-cyan-600/15 border-t-cyan-600 rounded-full animate-spin" />
          <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-cyan-600 animate-pulse" />
        </div>
        <p className="text-[10px] font-mono tracking-[0.25em] text-slate-500 font-bold uppercase">Mapping Publication Database...</p>
      </div>
    );
  }

  // Calculate dynamic metrics to showcase on the top board
  const totalPosts = posts.length;
  const currentSkillScore = profile?.skillScore || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-cyan-500 flex flex-col md:flex-row relative">
      
      {/* Background Mesh Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-cyan-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[5%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[110px]" />
      </div>

      <Sidebar 
        activePage="my-posts" 
        profile={profile} 
        isCollapsed={isSidebarCollapsed} 
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Container */}
      <main className={`flex-grow p-4 md:p-14 overflow-y-auto max-h-screen relative z-10 transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-14' : ''}`}>
        
        <Header 
          profile={profile}
          user={user}
          activePage="dashboard"
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
        />

        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          
          {/* Header Title Section */}
          <div className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-black bg-gradient-to-r from-slate-900 via-slate-800 to-slate-500 bg-clip-text text-transparent italic tracking-tight leading-none uppercase">
                My Publications
              </h1>
              <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-[0.15em] text-slate-400 uppercase mt-1.5 block">
                Manage your validated credentials and portfolio posts
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="bg-white border border-slate-200 shadow-sm px-3.5 py-1.5 rounded-full text-[10px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 uppercase font-mono">
                <Clock size={12} className="text-slate-400" /> Total Posts: <span className="text-slate-800 font-extrabold">{totalPosts}</span>
              </span>
            </div>
          </div>

          {/* =======================================================
              CLEAN TOP PROFILE SUMMARY
              ======================================================= */}
          <div className="bg-white border border-slate-200/80 rounded-[2rem] shadow-sm p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Left side: Profile Score & Basic details */}
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              {/* Visual Score Circle */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    className="stroke-slate-100 fill-none" 
                    strokeWidth="6" 
                  />
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    className="stroke-cyan-500 fill-none transition-all duration-1000 ease-out" 
                    strokeWidth="6" 
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - (currentSkillScore || 1) / 100)}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-800 italic leading-none">{currentSkillScore}</span>
                  <span className="text-[8px] tracking-widest font-bold text-slate-400 font-mono uppercase mt-0.5">SCORE</span>
                </div>
              </div>

              {/* Profile Details */}
              <div className="space-y-2">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 font-bold uppercase block">STUDENT PROFILE</span>
                  <h3 className="text-xl font-black tracking-tight text-slate-900 italic font-serif uppercase">
                    {profile?.firstName} {profile?.lastName}
                  </h3>
                </div>
                
                {/* Sector details */}
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="bg-slate-50 border border-slate-100 text-[9px] font-mono px-2.5 py-1 text-slate-500 rounded-lg font-bold">
                    Sector: <span className="text-slate-800 font-extrabold">{profile?.primarySector || 'General'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-600 border border-cyan-100 text-[9px] px-2.5 py-1 rounded-lg font-bold font-mono uppercase">
                    <span className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" />
                    Verified Node
                  </span>
                </div>
              </div>
            </div>

            {/* Right side: Clean minimal stats or badges */}
            <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-8">
              <div className="text-center sm:text-right">
                <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Publications</span>
                <span className="text-3xl font-serif italic text-slate-900 font-black">{totalPosts}</span>
              </div>
            </div>

          </div>

          {/* =======================================================
              CREATE POST AREA
              ======================================================= */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-[1.5rem] shadow-sm hover:border-slate-300/40 transition-all duration-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <Zap size={13} className="text-cyan-600 animate-pulse" />
              <h3 className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Deploy Intellectual Outcome</h3>
            </div>

            <form onSubmit={handlePost} className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <span className="text-xs font-black text-slate-400 font-mono">{profile?.firstName?.[0]}</span>
                  )}
                </div>
                <div className="flex-grow">
                  <textarea 
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Share your latest professional engineering outcomes, publications, or visual updates..."
                    className="w-full bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-cyan-500/20 rounded-xl p-3 text-xs md:text-sm text-slate-800 focus:outline-none transition-all resize-none h-16 md:h-18 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>
               
              {mediaFile && (
                <div className="relative rounded-xl overflow-hidden border border-slate-100 bg-slate-50 max-w-md mx-auto aspect-video">
                  {mediaType === 'image' ? (
                    <img src={mediaFile} className="w-full h-full object-contain" alt="Preview" />
                  ) : (
                    <video src={mediaFile} className="w-full h-full object-contain" controls />
                  )}
                  <button 
                    type="button"
                    onClick={() => { setMediaFile(null); setMediaType(null); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-colors cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                 <div className="flex items-center gap-3">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 hover:text-cyan-600 text-slate-500 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase cursor-pointer animate-none"
                    >
                      <ImageIcon size={14} className="text-slate-400" />
                      <span>Add Media</span>
                    </button>
                    {mediaFile && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-mono px-2.5 py-0.5 rounded-lg font-bold uppercase">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        MEDIA LOADED
                      </span>
                    )}
                 </div>
                 <button 
                   disabled={creating || (!newPost.trim() && !mediaFile)}
                   className="bg-slate-900 hover:bg-cyan-600 text-white px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-35 cursor-pointer shadow-sm active:scale-[0.98]"
                 >
                   {creating ? <Loader2 className="animate-spin text-white" size={12} /> : <><Send size={11} /> Deploy Node</>}
                 </button>
                 <input 
                   type="file" 
                   ref={fileInputRef}
                   onChange={handleFileSelect}
                   accept="image/*,video/*"
                   className="hidden"
                 />
              </div>
            </form>
          </div>

          {/* =======================================================
              PUBLICATIONS LIST
              ======================================================= */}
          <div className="space-y-6">
            
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">PUBLISHED TELEMETRY NODES</h3>
              <span className="text-[9px] font-mono text-slate-400 uppercase">REAL-TIME DB LINK</span>
            </div>

            <AnimatePresence mode="popLayout">
              {posts.map((post) => (
                <motion.div 
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 hover:border-cyan-600/10 transition-all group relative shadow-lg shadow-slate-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-400 uppercase overflow-hidden">
                        {post.authorPhoto ? (
                          <img src={post.authorPhoto} className="w-full h-full object-cover" alt={post.authorName} />
                        ) : (
                          <span className="text-xs font-black font-mono">{post.authorName?.[0]}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 tracking-tight">{post.authorName}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{post.domain}</div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => deletePost(post.id)}
                      className="p-2 text-slate-350 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete Publication"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <p className="text-slate-600 leading-relaxed mb-5 whitespace-pre-wrap font-medium text-xs md:text-sm">{post.content}</p>

                  {post.media && (
                    <div className="mb-5 rounded-[1.5rem] overflow-hidden border border-slate-100 bg-slate-50/50">
                      {post.mediaType === 'image' ? (
                        <img src={post.media} className="w-full h-auto max-h-[400px] object-contain mx-auto" alt="Node media context" />
                      ) : (
                        <video src={post.media} className="w-full h-auto max-h-[400px]" controls />
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                     
                     <div className="flex items-center gap-4">
                       <button 
                         onClick={() => setExpandedCommentPostId(expandedCommentPostId === post.id ? null : post.id)}
                         className={`flex items-center gap-1.5 transition-colors cursor-pointer ${expandedCommentPostId === post.id ? 'text-cyan-600' : 'hover:text-cyan-600'}`}
                       >
                         <MessageSquare size={13} /> 
                         <span>Discussion ({post.reactions?.commentsCount || 0})</span>
                         {expandedCommentPostId === post.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                       </button>

                       <span className="hidden sm:inline-flex items-center bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[8px] text-slate-400 font-mono italic">
                         ID: {post.id?.slice(0, 8)}...
                       </span>
                     </div>

                     <div className="flex items-center gap-2">
                       <span className="px-2.5 py-1 rounded bg-slate-50 text-[8px] font-bold text-slate-400 border border-slate-100 uppercase font-mono tracking-wider italic">Validated Core</span>
                       <span className="px-2.5 py-1 rounded bg-cyan-600/5 text-[8px] font-bold text-cyan-600 border border-cyan-600/10 uppercase tracking-widest font-mono italic">#{post.domain?.replace(/\s+/g, '') || 'General'}</span>
                     </div>
                  </div>

                  {expandedCommentPostId === post.id && (
                    <CommentSection postId={post.id} userProfile={profile} />
                  )}
                </motion.div>
              ))}
              
              {posts.length === 0 && (
                <div className="text-center py-16 bg-white border border-slate-200 p-8 rounded-[2rem] shadow-xl shadow-slate-200/40">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 mx-auto mb-4 animate-bounce">
                    <BookOpen size={20} />
                  </div>
                  <h4 className="text-base font-black text-slate-800 tracking-tight font-serif uppercase italic mb-1">Publications Node Empty</h4>
                  <p className="text-slate-400 text-xs font-semibold max-w-sm mx-auto leading-relaxed italic">
                    You haven’t deployed any portfolio posts yet. Try typing a status update or technical description above and submit to sync your feed!
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Global styling overrides matches style exactly */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(34, 211, 238, 0.25);
            border-radius: 9px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(34, 211, 238, 0.4);
          }
        `}</style>
      </main>

    </div>
  );
}
