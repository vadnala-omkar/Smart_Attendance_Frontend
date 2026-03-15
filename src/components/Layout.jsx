import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Layout({ children, tabs, activeTab, setActiveTab, role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifCount, setNotifCount] = useState(0);
  const [showNotif, setShowNotif]   = useState(false);
  const [notifs,    setNotifs]      = useState([]);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/api/messages/notifications');
      setNotifs(res.data);
      setNotifCount(res.data.filter(n => !n.read).length);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/messages/notifications/read-all');
      setNotifCount(0);
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const roleColors = { admin: 'text-violet-400', faculty: 'text-blue-400', student: 'text-emerald-400' };
  const roleIcons  = { admin: '🛡️', faculty: '👨‍🏫', student: '🎓' };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <div className="text-white font-bold text-sm sm:text-base leading-tight">Smart Attendance</div>
            <div className="text-slate-400 text-xs">GNITC · CSO</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) markAllRead(); }}
              className="relative bg-slate-700 hover:bg-slate-600 text-white rounded-xl p-2 transition-colors">
              🔔
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                  <span className="text-white font-semibold text-sm">Notifications</span>
                  <button onClick={() => setShowNotif(false)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
                </div>
                {notifs.length === 0 ? (
                  <div className="p-4 text-slate-400 text-sm text-center">No notifications</div>
                ) : notifs.slice(0, 15).map((n, i) => (
                  <div key={i} className={`p-3 border-b border-slate-700/50 ${!n.read ? 'bg-slate-700/50' : ''}`}>
                    <p className="text-white text-xs leading-relaxed">{n.message}</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-500 text-xs">{n.from}</span>
                      <span className="text-slate-500 text-xs">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-700 rounded-xl px-3 py-2">
            <span>{roleIcons[role]}</span>
            <div>
              <div className={`text-xs font-semibold ${roleColors[role]}`}>{user?.name}</div>
              <div className="text-slate-400 text-xs">{role?.toUpperCase()}</div>
            </div>
          </div>

          <button onClick={handleLogout}
            className="bg-slate-700 hover:bg-red-800 text-slate-300 hover:text-white rounded-xl px-3 py-2 text-sm transition-colors">
            Logout
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-4 sm:px-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
