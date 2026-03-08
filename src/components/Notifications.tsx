import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Clock,
  ExternalLink
} from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

export const Notifications = ({ token }: { token: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, [token]);

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-[#141414]/5 transition-colors group"
      >
        <Bell size={18} className="group-hover:rotate-12 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#141414] text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-[#E4E3E0]">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-80 bg-white border border-[#141414] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-[#141414] bg-[#141414]/5 flex justify-between items-center">
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Notifications</h3>
                <button onClick={() => setIsOpen(false)}><X size={14} /></button>
              </div>

              <div className="max-h-96 overflow-auto divide-y divide-[#141414]/10">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-4 hover:bg-[#141414]/5 transition-colors cursor-pointer relative ${!n.readAt ? 'bg-[#141414]/[0.02]' : ''}`}
                      onClick={() => !n.readAt && markAsRead(n.id)}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 ${n.type === 'warning' ? 'text-amber-600' : n.type === 'success' ? 'text-emerald-600' : n.type === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
                          {n.type === 'warning' ? <AlertTriangle size={14} /> : n.type === 'success' ? <CheckCircle2 size={14} /> : <Info size={14} />}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xs font-bold mb-1">{n.title}</h4>
                          <p className="text-[10px] opacity-60 leading-relaxed mb-2">{n.message}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-mono opacity-40 flex items-center gap-1">
                              <Clock size={8} /> {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {!n.readAt && (
                              <span className="w-1.5 h-1.5 bg-[#141414] rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center opacity-40 italic text-xs">
                    No new notifications.
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-[#141414] bg-[#141414]/5 text-center">
                <button className="text-[9px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center gap-1 mx-auto">
                  View All Activity <ExternalLink size={10} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
