import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc 
} from 'firebase/firestore';
import { nudgeIntelligence } from '../lib/semanticEngine';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Trash2, MessageSquare, Share2, Award, Zap, 
  Image as ImageIcon, Video, Smile, X, Loader2, UserCircle
} from 'lucide-react';

function CommentSection({ postId, userProfile }: { postId: string, userProfile: any }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(20)
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
    <div className="mt-8 pt-8 border-t border-slate-100 space-y-4 md:space-y-6">
      <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 md:gap-4 group/comment">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 overflow-hidden">
               {comment.authorPhoto ? (
                 <img src={comment.authorPhoto} className="w-full h-full object-cover" alt={comment.authorName} />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">{comment.authorName?.[0]}</div>
               )}
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider truncate">{comment.authorName}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{comment.createdAt?.toDate?.() ? new Date(comment.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</span>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 md:p-3 rounded-2xl border border-slate-100 break-words">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Start the discussion</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 items-center">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a professional insight..."
          className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-cyan-600/30 transition-all resize-none h-11 h-[2.75rem] italic"
        />
        <button 
          disabled={loading || !newComment.trim()}
          className="w-11 h-11 flex-shrink-0 bg-white border border-slate-200 hover:border-cyan-600/30 rounded-2xl flex items-center justify-center text-cyan-600 hover:text-cyan-700 transition-all disabled:opacity-30 shadow-sm"
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}

export default function Feed({ userProfile }: any) {
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'posts');
    });

    return () => unsubscribe();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !userProfile) return;

    setLoading(true);
    try {
      // Final payload size check (1MB = 1048576 bytes)
      // Since everything is JSON stringified, checking string length is a good proxy.
      const payloadSize = JSON.stringify({
        authorId: auth.currentUser?.uid,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`,
        content: newPost,
        domain: userProfile.primarySector || 'General',
        media: mediaFile,
        mediaType: mediaType,
        reactions: {},
      }).length;

      if (payloadSize > 1000000) {
        alert('Neural transmission payload exceeds secure bandwidth limits (1MB). Please reduce text length or use a smaller media file.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'posts'), {
        authorId: auth.currentUser?.uid,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`,
        authorPhoto: userProfile.photoURL || '',
        content: newPost,
        domain: userProfile.primarySector || 'General',
        media: mediaFile,
        mediaType: mediaType,
        reactions: {},
        createdAt: serverTimestamp()
      });

      // Real-time Intelligence Nudge
      if (auth.currentUser) {
        nudgeIntelligence(auth.currentUser.uid, 'POST', newPost);
      }

      setNewPost('');
      setMediaFile(null);
      setMediaType(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'posts');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict limit for initial selection
    if (file.size > 5 * 1024 * 1024) {
      alert('Source file too large. Max 5MB allowed before compression.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      
      if (file.type.startsWith('image/')) {
        setMediaType('image');
        // Compress image
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions for identity feed
          const MAX_SIZE = 1000;
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
          
          // 0.7 quality is a good balance for professional feed
          const compressedData = canvas.toDataURL('image/jpeg', 0.7);
          
          // Final sanity check: Base64 is ~1.33x original size. 
          // Firestore limit is 1MB. We aim for < 800KB to be safe.
          if (compressedData.length > 800000) {
            alert('Image is too complex and exceeds the 1MB transmission limit even after compression. Please try a different photo.');
            return;
          }
          
          setMediaFile(compressedData);
        };
        img.src = result;
      } else if (file.type.startsWith('video/')) {
        // Videos are harder to compress in-browser reliably, 
        // so we just enforce a hard limit on the raw data.
        if (result.length > 800000) {
          alert('Video file is too large for the secure neural feed. Max 750KB for videos.');
          return;
        }
        setMediaType('video');
        setMediaFile(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReaction = async (postId: string, emoji: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !auth.currentUser) return;

    const reactions = { ...(post.reactions || {}) };
    const userId = auth.currentUser.uid;

    if (!reactions[emoji]) reactions[emoji] = [];
    
    const userIndex = reactions[emoji].indexOf(userId);
    if (userIndex > -1) {
      reactions[emoji].splice(userIndex, 1);
    } else {
      reactions[emoji].push(userId);
    }

    try {
      await updateDoc(doc(db, 'posts', postId), { reactions });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts');
    }
  };

  return (
    <div className="space-y-8">
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*"
        className="hidden"
      />
      {/* Create Post */}
      <div className="bg-white border border-slate-200 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/50">
        <form onSubmit={handlePost} className="space-y-4">
           <textarea 
             value={newPost}
             onChange={(e) => setNewPost(e.target.value)}
             placeholder="Share professional insights or achievements..."
             className="w-full bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl p-4 md:p-6 text-sm text-slate-900 focus:outline-none focus:border-cyan-600/30 transition-all resize-none h-28 md:h-32 italic placeholder:text-slate-300"
           />
           
           {mediaFile && (
             <div className="relative rounded-2xl overflow-hidden border border-slate-100 aspect-video bg-slate-50">
               {mediaType === 'image' ? (
                 <img src={mediaFile} className="w-full h-full object-contain" alt="Preview" />
               ) : (
                 <video src={mediaFile} className="w-full h-full object-contain" controls />
               )}
               <button 
                 type="button"
                 onClick={() => { setMediaFile(null); setMediaType(null); }}
                 className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-colors"
               >
                 <X size={16} />
               </button>
             </div>
           )}

           <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4 text-slate-400">
                 <button 
                   type="button" 
                   onClick={() => fileInputRef.current?.click()}
                   className="hover:text-cyan-600 transition-colors flex items-center gap-1 text-[10px] uppercase font-black tracking-widest italic"
                 >
                   <ImageIcon size={18} /> MEDIA
                 </button>
                 <button type="button" className="hover:text-cyan-600 transition-colors cursor-not-allowed opacity-30"><Zap size={18} /></button>
              </div>
              <button 
                disabled={loading || (!newPost.trim() && !mediaFile)}
                className="bg-slate-950 text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-cyan-600 active:scale-[0.98] transition-all disabled:opacity-50 italic"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <><Send size={16} /> Post Update</>}
              </button>
           </div>
        </form>
      </div>

      {/* Feed List */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {posts.map((post) => (
            <motion.div 
              key={post.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 hover:border-cyan-600/10 transition-all group relative shadow-xl shadow-slate-200/50"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:text-cyan-600 transition-colors uppercase overflow-hidden">
                    {post.authorPhoto ? (
                      <img src={post.authorPhoto} className="w-full h-full object-cover" alt={post.authorName} />
                    ) : (
                      post.authorName?.[0]
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 italic tracking-tight">{post.authorName}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{post.domain}</div>
                  </div>
                </div>
                
                {post.authorId === auth.currentUser?.uid && (
                  <button 
                    onClick={() => deletePost(post.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <p className="text-slate-600 leading-relaxed mb-6 whitespace-pre-wrap font-medium">{post.content}</p>

              {post.media && (
                <div className="mb-6 rounded-[2rem] overflow-hidden border border-slate-100 bg-slate-50">
                  {post.mediaType === 'image' ? (
                    <img src={post.media} className="w-full h-auto max-h-[500px] object-contain mx-auto" alt="Post content" />
                  ) : (
                    <video src={post.media} className="w-full h-auto max-h-[500px]" controls />
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-6">
                <AnimatePresence>
                  {post.reactions && Object.entries(post.reactions).map(([emoji, users]: [string, any]) => (
                    users.length > 0 && (
                      <motion.button
                        key={emoji}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={() => handleReaction(post.id, emoji)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          users.includes(auth.currentUser?.uid) 
                            ? 'bg-cyan-600/10 border-cyan-600/30 text-cyan-700 shadow-md shadow-cyan-600/5' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span>{users.length}</span>
                      </motion.button>
                    )
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-4 md:gap-6 border-t border-slate-100 pt-6 relative">
                <div className="relative group/emoji">
                  <button 
                    onClick={() => setShowEmojiPicker(showEmojiPicker === post.id ? null : post.id)}
                    className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-600 transition-colors italic"
                  >
                    <Smile size={14} /> <span className="hidden sm:inline">React</span>
                  </button>
                  
                  {showEmojiPicker === post.id && (
                    <div className="absolute bottom-full left-0 mb-4 p-2 md:p-3 bg-white border border-slate-200 rounded-2xl flex gap-2 md:gap-3 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      {['🔥', '🚀', '🎯', '⚡', '🤖', '🤝'].map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => {
                            handleReaction(post.id, emoji);
                            setShowEmojiPicker(null);
                          }}
                          className="hover:scale-125 transition-transform text-lg md:text-xl"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-600 transition-colors italic">
                  <Award size={14} /> Verify
                </button>
                <button 
                  onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                  className={`flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors italic ${expandedPostId === post.id ? 'text-cyan-600' : 'text-slate-400 hover:text-cyan-600'}`}
                >
                  <MessageSquare size={14} /> <span className="hidden sm:inline">Discuss</span>
                  {!expandedPostId && <span className="sm:hidden">Reply</span>}
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <span className="hidden xs:inline px-2 md:px-3 py-1 rounded-full bg-cyan-600/5 text-[8px] md:text-[9px] font-bold text-cyan-600 border border-cyan-600/10 uppercase tracking-widest italic">#{post.domain?.replace(/\s+/g, '')}</span>
                  <span className="px-2 md:px-3 py-1 rounded-full bg-slate-50 text-[8px] md:text-[9px] font-bold text-slate-400 border border-slate-100 uppercase tracking-widest italic">Social Verified</span>
                </div>
              </div>

              {expandedPostId === post.id && (
                <CommentSection postId={post.id} userProfile={userProfile} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
