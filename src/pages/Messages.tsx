import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, 
  serverTimestamp, doc, updateDoc, getDoc, getDocs, writeBatch, limit 
} from 'firebase/firestore';
import { 
  Send, MessageSquare, ArrowLeft, Loader2, 
  ShieldCheck, User, Search, Zap, Cpu, Newspaper, Users, Bell, Menu, Home
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import { useLayout } from '../context/LayoutContext';

export default function Messages() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser);
  const [profile, setProfile] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [discoveryUsers, setDiscoveryUsers] = useState<any[]>([]);
  const [tab, setTab] = useState<'chats' | 'connections' | 'discovery'>('chats');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const { isSidebarCollapsed, toggleSidebar } = useLayout();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
      if (!u) navigate('/login');
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
      if (snapshot.exists()) setProfile(snapshot.data());
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch conversations where user is a participant
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribeChats = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setConversations(convos);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'conversations');
      setLoading(false);
    });

    // Fetch connections
    const q2 = query(
      collection(db, 'connections'),
      where('userIds', 'array-contains', currentUser.uid)
    );

    const unsubscribeConns = onSnapshot(q2, async (snapshot) => {
      const connsData = await Promise.all(snapshot.docs.map(async (connectionDoc) => {
        const data = connectionDoc.data();
        const otherUserId = data.userIds.find((id: string) => id !== currentUser.uid);
        
        // Fetch other user profile
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        return {
          id: connectionDoc.id,
          otherUser: { id: otherUserId, ...userDoc.data() },
          ...data
        };
      }));
      setConnections(connsData);
    });

    return () => {
      unsubscribeChats();
      unsubscribeConns();
    };
  }, [currentUser]);

  // Fetch Discovery Users
  useEffect(() => {
    if (!currentUser || tab !== 'discovery') return;
    
    setDiscoveryLoading(true);
    const q = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      where('email', '!=', currentUser.email), // Exclude self (filter by email as a simple check)
      limit(20)
    );

    const unsubDiscovery = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser.uid); // Secondary filter to be sure
      setDiscoveryUsers(users);
      setDiscoveryLoading(false);
    }, (error) => {
      console.error("Discovery Error:", error);
      setDiscoveryLoading(false);
    });

    return () => unsubDiscovery();
  }, [currentUser, tab]);

  useEffect(() => {
    if (!currentUser) return;
    
    // Mark all message notifications as read when visiting messages page
    const clearMessageNotifications = async () => {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.uid),
          where('type', '==', 'message'),
          where('read', '==', false)
        );
        
        const snap = await getDocs(q);
        if (snap.empty) return;
        
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          batch.update(d.ref, { read: true });
        });
        await batch.commit();
      } catch (error) {
        console.error("Error clearing notifications:", error);
      }
    };

    clearMessageNotifications();
  }, [currentUser]);

  const startChat = async (otherUserId: string) => {
    if (!currentUser) return;

    // Check if conversation already exists
    const existingChat = conversations.find(c => c.participants.includes(otherUserId));
    if (existingChat) {
      setSelectedChat(existingChat);
      setTab('chats');
      return;
    }

    // Create new conversation
    try {
      const chatRef = await addDoc(collection(db, 'conversations'), {
        participants: [currentUser.uid, otherUserId],
        lastMessage: '',
        updatedAt: serverTimestamp()
      });
      setSelectedChat({ id: chatRef.id, participants: [currentUser.uid, otherUserId] });
      setTab('chats');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'conversations');
    }
  };

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'conversations', selectedChat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      scrollToBottom();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `conversations/${selectedChat.id}/messages`);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !currentUser) return;

    setSending(true);
    const textSnapshot = newMessage;
    setNewMessage('');

    try {
      const chatRef = doc(db, 'conversations', selectedChat.id);
      
      // Add message
      try {
        await addDoc(collection(chatRef, 'messages'), {
          senderId: currentUser.uid,
          text: textSnapshot,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `conversations/${selectedChat.id}/messages`);
        throw err;
      }
  
      // Update conversation timestamp and last message
      try {
        await updateDoc(chatRef, {
          lastMessage: textSnapshot,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `conversations/${selectedChat.id}`);
        throw err;
      }
  
      // Notify the other participant
      const otherUserId = selectedChat.participants.find((id: string) => id !== currentUser.uid);
      if (otherUserId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: otherUserId,
            type: 'message',
            title: 'Secure Message Received',
            content: `${profile?.firstName || 'User'} sent you an encrypted transmission.`,
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'notifications');
          // Don't throw for notification failure, message was already sent
        }
      }
  
    } catch (error) {
      setNewMessage(textSnapshot); // Restore text on error
    } finally {
      setSending(false);
    }
  };

  const handleConnect = async (otherUser: any) => {
    if (!currentUser || connectingId) return;
    setConnectingId(otherUser.id);
    try {
      const connRef = await addDoc(collection(db, 'connections'), {
        userIds: [currentUser.uid, otherUser.id],
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create Notification
      await addDoc(collection(db, 'notifications'), {
        userId: otherUser.id,
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

  const getConnectionStatus = (otherUserId: string) => {
    const conn = connections.find(c => c.userIds.includes(otherUserId));
    return conn ? conn.status : null;
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans selection:bg-cyan-500/30 flex relative overflow-hidden">
      {/* Dynamic Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -right-[10%] w-[70%] h-[70%] bg-cyan-500/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[100px]" 
        />
      </div>

      <Sidebar 
        activePage="messages" 
        profile={profile} 
        isCollapsed={isSidebarCollapsed} 
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Modern Sidebar - Conversations */}
      <aside className={`w-full md:w-[26rem] h-full flex-shrink-0 bg-white backdrop-blur-2xl border-r border-slate-100 flex flex-col relative z-20 ${selectedChat ? 'hidden md:flex' : 'flex'} transition-all duration-500 shadow-xl shadow-slate-200/50`}>
        <div className="p-8 md:p-10">


           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-cyan-600 group shadow-sm">
                  <Cpu size={22} className="animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                    Neural Comms
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Uplink Healthy
                  </p>
                </div>
              </div>
              <NotificationBell userId={currentUser?.uid} />
           </div>
           
           <div className="relative mb-8 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors" size={16} />
              <input 
                placeholder="Search threads..." 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-12 py-4 text-sm focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-400 backdrop-blur-md"
              />
           </div>

            <div className="flex gap-1 p-1 bg-slate-50 rounded-2xl border border-slate-100">
              <button 
                onClick={() => setTab('chats')}
                className={`flex-grow py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${tab === 'chats' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <MessageSquare size={12} />
                Threads
              </button>
              <button 
                onClick={() => setTab('connections')}
                className={`flex-grow py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${tab === 'connections' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Users size={12} />
                Network
              </button>
              <button 
                onClick={() => setTab('discovery')}
                className={`flex-grow py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${tab === 'discovery' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Zap size={12} />
                Discover
              </button>
           </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar px-4 pb-8 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
               <Loader2 className="animate-spin text-cyan-500 w-6 h-6" />
               <p className="text-[10px] font-bold uppercase tracking-widest">Scanning Nodes...</p>
            </div>
          ) : tab === 'chats' ? (
            conversations.length === 0 ? (
              <div className="p-20 text-center opacity-30">
                 <MessageSquare size={40} className="mx-auto mb-4" />
                 <p className="text-xs font-medium">No active transmissions.</p>
              </div>
            ) : (
              conversations.map((convo, idx) => {
                const otherParticipant = convo.participants.find((p: string) => p !== currentUser?.uid);
                const isSelected = selectedChat?.id === convo.id;
                return (
                  <motion.div 
                    key={convo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedChat(convo)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 group flex gap-4 items-center ${isSelected ? 'bg-slate-50 border border-slate-100 shadow-sm' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center font-bold text-slate-400 group-hover:text-cyan-600 transition-colors">
                      {otherParticipant?.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">{otherParticipant?.slice(0, 20)}</span>
                        <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap ml-2">
                          {convo.updatedAt?.toDate() ? convo.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate font-medium">{convo.lastMessage || 'Channel ready...'}</p>
                    </div>
                  </motion.div>
                );
              })
            )
          ) : tab === 'connections' ? (
            connections.length === 0 ? (
              <div className="p-20 text-center opacity-30">
                 <Users size={40} className="mx-auto mb-4" />
                 <p className="text-xs font-medium">Network map empty.</p>
              </div>
            ) : (
              connections.map((conn, idx) => (
                <motion.div 
                  key={conn.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => startChat(conn.otherUser.id)}
                  className="p-4 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50 cursor-pointer transition-all group flex gap-4 items-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden group-hover:shadow-md transition-all">
                    {conn.otherUser.photoURL ? (
                      <img src={conn.otherUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-slate-500">{conn.otherUser.firstName?.[0]}</span>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{conn.otherUser.firstName} {conn.otherUser.lastName}</div>
                    <div className="text-[10px] text-cyan-600 font-bold uppercase tracking-wider">{conn.otherUser.primarySector || 'Verified node'}</div>
                  </div>
                  {conn.status === 'pending' && (
                    <div className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Pending</div>
                  )}
                </motion.div>
              ))
            )
          ) : (
            discoveryLoading ? (
              <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
                 <Loader2 className="animate-spin text-cyan-500 w-6 h-6" />
                 <p className="text-[10px] font-bold uppercase tracking-widest">Scanning New Nodes...</p>
              </div>
            ) : discoveryUsers.length === 0 ? (
              <div className="p-20 text-center opacity-30">
                 <Search size={40} className="mx-auto mb-4" />
                 <p className="text-xs font-medium">No new nodes detected.</p>
              </div>
            ) : (
              discoveryUsers.map((discoveryUser, idx) => {
                const status = getConnectionStatus(discoveryUser.id);
                return (
                  <motion.div 
                    key={discoveryUser.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex gap-4 items-center mb-2 hover:bg-slate-50 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner">
                      {discoveryUser.photoURL ? (
                        <img src={discoveryUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-slate-500">{discoveryUser.firstName?.[0]}</span>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="text-[11px] font-bold text-slate-900 truncate leading-tight mb-1">{discoveryUser.firstName} {discoveryUser.lastName}</div>
                      <div className="text-[9px] text-slate-500 font-medium truncate uppercase tracking-tighter">{discoveryUser.primarySector || 'AI Analysis Pending'}</div>
                    </div>
                    <button
                      disabled={status !== null || connectingId === discoveryUser.id}
                      onClick={() => handleConnect(discoveryUser)}
                      className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        status === 'accepted' 
                        ? 'bg-emerald-500/10 text-emerald-600' 
                        : status === 'pending'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-slate-900 text-white hover:bg-cyan-600'
                      }`}
                    >
                      {status === 'accepted' ? 'Linked' : status === 'pending' ? 'Pending' : connectingId === discoveryUser.id ? <Loader2 size={10} className="animate-spin" /> : 'Connect'}
                    </button>
                  </motion.div>
                );
              })
            )
          )}
        </div>
      </aside>

      {/* Minimalist Chat Area */}
      <main className={`flex-grow h-full flex flex-col relative z-20 ${!selectedChat ? 'hidden md:flex' : 'flex'} bg-white/40 backdrop-blur-sm overflow-hidden`}>
        {selectedChat ? (
          <>
            {/* Functional Chat Header */}
            <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/70 backdrop-blur-xl sticky top-0 z-30">
               <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeft size={16} />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-600/10 flex items-center justify-center text-cyan-600 border border-cyan-600/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                       <ShieldCheck size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 leading-none mb-1 uppercase italic font-serif">
                         Secure Uplink
                      </h2>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest italic font-serif">Verified Hub • E2EE</span>
                      </div>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                 <button onClick={() => navigate('/dashboard')} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:text-slate-900 transition-all group">
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                 </button>
               </div>
            </header>

            {/* Modern Messages List - THE SCROLLABLE PART */}
            <div className="flex-grow overflow-y-auto px-6 md:px-12 py-10 space-y-8 custom-scrollbar relative z-10 scroll-smooth">
               <AnimatePresence mode="popLayout">
                 {messages.map((msg, idx) => {
                   const isMine = msg.senderId === currentUser?.uid;
                   return (
                     <motion.div 
                       key={msg.id}
                       initial={{ opacity: 0, y: 20, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       transition={{ type: 'spring', damping: 20, stiffness: 400, delay: idx * 0.02 }}
                       className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                     >
                       <div className={`group relative max-w-[85%] md:max-w-[70%] ${
                         isMine 
                         ? 'items-end flex flex-col' 
                         : 'items-start flex flex-col'
                       }`}>
                          <div className={`px-5 py-4 rounded-3xl text-sm leading-relaxed shadow-xl transition-all duration-300 ${
                            isMine 
                            ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-tr-none border border-cyan-500/20' 
                            : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none backdrop-blur-md shadow-sm'
                          }`}>
                             <p className="font-medium selection:bg-cyan-500/10">{msg.text}</p>
                          </div>
                          <div className={`text-[8px] mt-2 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 ${isMine ? 'text-cyan-600 mr-2' : 'text-slate-400 ml-2'}`}>
                            {msg.createdAt?.toDate() ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending...'}
                          </div>
                       </div>
                     </motion.div>
                   );
                 })}
               </AnimatePresence>
               <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Refined Message Input */}
            <footer className="p-6 md:p-8 shrink-0 bg-white/50 border-t border-slate-100">
               <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-3xl backdrop-blur-2xl focus-within:border-cyan-600/30 transition-all shadow-xl">
                 <div className="flex-grow">
                   <input 
                     value={newMessage}
                     onChange={(e) => setNewMessage(e.target.value)}
                     placeholder="Type secure transmission..." 
                     className="w-full bg-transparent border-none rounded-2xl px-6 py-3 text-sm focus:outline-none placeholder:text-slate-400 text-slate-900 font-medium"
                   />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={sending || !newMessage.trim()}
                  className="bg-white text-slate-950 h-12 w-12 rounded-2xl flex items-center justify-center font-bold hover:bg-cyan-400 transition-all disabled:opacity-30 shadow-lg shadow-white/5"
                 >
                   {sending ? <Loader2 className="animate-spin w-5 h-5" /> : <Send size={18} />}
                 </motion.button>
               </form>
               <div className="flex items-center justify-center gap-4 mt-6">
                 <div className="h-px bg-slate-100 flex-grow max-w-[40px]" />
                 <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.4em] italic font-serif">
                   Quantum Resistant Encryption • DIU Signal Lab
                 </p>
                 <div className="h-px bg-slate-100 flex-grow max-w-[40px]" />
               </div>
            </footer>
          </>
        ) : (
          <div className="m-auto text-center max-w-md p-10 relative">
             <div className="absolute inset-0 bg-cyan-500/5 blur-[100px] rounded-full" />
             <div className="relative z-10 space-y-10">
               <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 bg-slate-100 rounded-[2rem] border border-slate-200 flex items-center justify-center mx-auto shadow-xl"
               >
                  <MessageSquare className="text-slate-900 opacity-20" size={32} />
               </motion.div>
               <div>
                 <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">Neural Grid Messaging</h2>
                 <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                   Select a connection to establish a secure, verified uplink through the professional singularity.
                 </p>
               </div>
               <div className="flex flex-wrap gap-4 justify-center items-center">
                 <button 
                   id="scan-network-placeholder-btn"
                   onClick={() => navigate('/search')}
                   className="px-8 py-3.5 rounded-2xl bg-slate-950 text-white text-xs font-bold uppercase tracking-wider shadow-xl hover:bg-cyan-600 transition-all flex items-center gap-2 cursor-pointer"
                 >
                   <Zap size={14} /> Scan Network
                 </button>
                 <button 
                   id="go-home-placeholder-btn"
                   onClick={() => navigate('/dashboard')}
                   className="px-8 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer"
                 >
                   <Home size={14} className="text-cyan-600" /> Back to Profile
                 </button>
               </div>
             </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
