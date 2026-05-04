import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  doc, updateDoc, limit, deleteDoc, serverTimestamp, getDoc, addDoc 
} from 'firebase/firestore';
import { Bell, Check, Trash2, MessageSquare, UserPlus, Info, Zap } from 'lucide-react';

interface NotificationBellProps {
  userId: string;
  className?: string;
}

export default function NotificationBell({ userId, className = '' }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50) // Fetch more to account for filtered messages
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((n: any) => n.type !== 'message')
        .slice(0, 20); // Maintain 20 limit after filter
      setNotifications(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => unsubscribe();
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  };

  const acceptConnection = async (notification: any) => {
    if (!notification.data?.connectionId) return;
    try {
      await updateDoc(doc(db, 'connections', notification.data.connectionId), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });
      
      // Notify the requester
      const connDoc = await getDoc(doc(db, 'connections', notification.data.connectionId));
      if (connDoc.exists()) {
        const connData = connDoc.data();
        const requesterId = connData.userIds.find((id: string) => id !== userId);
        if (requesterId) {
          await addDoc(collection(db, 'notifications'), {
            userId: requesterId,
            type: 'update',
            title: 'Connection Link Established',
            content: 'Your identity established a verified link with a professional colleague.',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }

      await markAsRead(notification.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'connections');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare size={14} className="text-blue-400" />;
      case 'connection_request': return <UserPlus size={14} className="text-cyan-400" />;
      case 'update': return <Zap size={14} className="text-amber-400" />;
      default: return <Info size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-cyan-600 transition-all relative shadow-sm"
      >
        <Bell size={18} md:size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 md:top-2 md:right-2 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDropdown(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-72 xs:w-80 md:w-96 bg-white border border-slate-100 rounded-2xl md:rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Transmissions</h3>
                <span className="text-[10px] font-bold px-2 py-1 bg-slate-50 rounded-lg text-slate-400">{notifications.length} Total</span>
              </div>
              
              <div className="max-h-[28rem] overflow-y-auto scrollbar-hide">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <Bell className="mx-auto text-slate-100 mb-4 opacity-50" size={48} />
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-loose">No active signals detected in your network.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-6 border-b border-slate-50 transition-all hover:bg-slate-50 relative group ${!n.read ? 'bg-cyan-600/5' : ''}`}
                    >
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className={`text-xs font-black tracking-tight ${!n.read ? 'text-cyan-600' : 'text-slate-900'}`}>{n.title}</h4>
                            <span className="text-[9px] text-slate-400 font-mono italic">
                              {n.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed mb-3 font-medium">{n.content}</p>
                          
                          <div className="flex gap-2">
                            {n.type === 'connection_request' && !n.read && (
                              <button 
                                onClick={() => acceptConnection(n)}
                                className="text-[9px] font-black uppercase text-cyan-600 bg-cyan-600/10 px-2 py-1 rounded transition-colors hover:bg-cyan-600/20"
                              >
                                Accept Link
                              </button>
                            )}
                            {!n.read && (
                              <button 
                                onClick={() => markAsRead(n.id)}
                                className="text-[9px] font-black uppercase text-cyan-600 hover:text-cyan-700 flex items-center gap-1 transition-colors"
                              >
                                <Check size={10} /> Mark read
                              </button>
                            )}
                            <button 
                              onClick={() => deleteNotification(n.id)}
                              className="text-[9px] font-black uppercase text-slate-300 hover:text-red-500 flex items-center gap-1 transition-colors"
                            >
                              <Trash2 size={10} /> PURGE
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <button className="text-[10px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest italic">
                  View Intelligence Log
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
