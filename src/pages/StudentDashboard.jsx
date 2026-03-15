import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../api';

const TABS = [
  { id: 'overview',  label: 'My Attendance', icon: '📊' },
  { id: 'history',   label: 'History',       icon: '📅' },
  { id: 'messages',  label: 'Messages',      icon: '💬' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [tab,      setTab]     = useState('overview');
  const [dashboard,setDash]    = useState(null);
  const [inbox,    setInbox]   = useState([]);
  const [newMsg,   setNewMsg]  = useState({ subject: '', body: '' });
  const [faculty,  setFaculty] = useState(null);
  const [loading,  setLoading] = useState(false);
  const [toast,    setToast]   = useState('');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().substring(0,7));

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => { fetchTab(); }, [tab]);

  useEffect(() => {
    // Get faculty to send message to
    api.get('/api/students').then(res => {
      // find any faculty user... we'll just set to 'all' fallback
    }).catch(() => {});
  }, []);

  const fetchTab = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      if (tab === 'overview' || tab === 'history') {
        const res = await api.get(`/api/dashboard/student/${user._id}`);
        setDash(res.data);
      }
      if (tab === 'messages') {
        const res = await api.get('/api/messages/inbox');
        setInbox(res.data);
        // mark all read
        res.data.forEach(m => api.put(`/api/messages/${m._id}/read`).catch(()=>{}));
      }
    } catch (err) { showToast('❌ ' + (err.response?.data?.message || err.message)); }
    setLoading(false);
  };

  const sendMsg = async () => {
    if (!newMsg.body) return showToast('Message required');
    try {
      // Students send to faculty (use 'all' which faculty can see)
      await api.post('/api/messages/send', { to: 'all', toName: 'Faculty', subject: newMsg.subject, body: newMsg.body });
      showToast('✅ Message sent to faculty');
      setNewMsg({ subject: '', body: '' });
      fetchTab();
    } catch (err) { showToast('❌ ' + err.response?.data?.message); }
  };

  const statusColor = (status) => {
    const map = { present: 'text-emerald-400', 'half-day': 'text-yellow-400', absent: 'text-red-400', holiday: 'text-blue-400', sunday: 'text-slate-500' };
    return map[status] || 'text-slate-400';
  };

  const statusIcon = (status) => {
    const map = { present: '✅', 'half-day': '🌓', absent: '❌', holiday: '🏖️', sunday: '😴' };
    return map[status] || '—';
  };

  const filteredHistory = dashboard?.allRecords?.filter(r => r.date.startsWith(monthFilter)) || [];

  const inputCls = "w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <Layout tabs={TABS} activeTab={tab} setActiveTab={setTab} role="student">
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-800 border border-slate-600 text-white rounded-xl px-5 py-3 shadow-2xl text-sm animate-fade-in">
          {toast}
        </div>
      )}

      {loading && <div className="text-center py-12 text-slate-400 animate-pulse">Loading...</div>}

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && !loading && dashboard && (
        <div className="space-y-5 animate-fade-in">
          {/* Welcome */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-slate-800 border border-emerald-800/50 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🎓</span>
              <div>
                <div className="text-white font-bold text-lg">{user?.name}</div>
                <div className="text-emerald-400 font-mono text-sm">{user?.rollno}</div>
              </div>
            </div>
          </div>

          {/* Today's status */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="text-slate-400 text-sm font-medium mb-3">Today's Attendance</div>
            {dashboard.todayRecord ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl mb-1">{dashboard.todayRecord.morningPresent ? '✅' : '❌'}</div>
                  <div className="text-xs text-slate-400">Morning</div>
                  {dashboard.todayRecord.morningTime && <div className="text-xs text-emerald-400">{dashboard.todayRecord.morningTime}</div>}
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-1 ${statusColor(dashboard.todayRecord.status)}`}>
                    {statusIcon(dashboard.todayRecord.status)}
                  </div>
                  <div className={`text-sm font-semibold capitalize ${statusColor(dashboard.todayRecord.status)}`}>
                    {dashboard.todayRecord.status}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">{dashboard.todayRecord.eveningPresent ? '✅' : '❌'}</div>
                  <div className="text-xs text-slate-400">Evening</div>
                  {dashboard.todayRecord.eveningTime && <div className="text-xs text-emerald-400">{dashboard.todayRecord.eveningTime}</div>}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-3">
                <div className="text-3xl mb-1">⏰</div>
                <div className="text-sm">No attendance recorded today yet</div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{dashboard.stats.totalDays}</div>
              <div className="text-slate-400 text-xs mt-1">Total Days</div>
            </div>
            <div className="bg-slate-800 border border-emerald-900 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{dashboard.stats.presentDays}</div>
              <div className="text-slate-400 text-xs mt-1">Present</div>
            </div>
            <div className="bg-slate-800 border border-yellow-900 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">{dashboard.stats.halfDays}</div>
              <div className="text-slate-400 text-xs mt-1">Half-Day</div>
            </div>
            <div className="bg-slate-800 border border-red-900 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-400">{dashboard.stats.absentDays}</div>
              <div className="text-slate-400 text-xs mt-1">Absent</div>
            </div>
          </div>

          {/* Percentage */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-300 font-semibold">Overall Attendance</span>
              <span className={`text-2xl font-bold ${dashboard.stats.percentage >= 75 ? 'text-emerald-400' : dashboard.stats.percentage >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {dashboard.stats.percentage}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${dashboard.stats.percentage >= 75 ? 'bg-emerald-500' : dashboard.stats.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${dashboard.stats.percentage}%` }} />
            </div>
            {dashboard.stats.percentage < 75 && (
              <div className="text-red-400 text-xs mt-2">⚠️ Below 75% — you need to improve attendance</div>
            )}
            <div className="text-slate-500 text-xs mt-1">* Half-day counted as 0.5 days</div>
          </div>

          {/* Unread messages */}
          {dashboard.unreadMessages > 0 && (
            <div className="bg-blue-900/30 border border-blue-800 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-blue-900/50 transition-colors"
              onClick={() => setTab('messages')}>
              <span className="text-2xl">📩</span>
              <div>
                <div className="text-blue-300 font-medium text-sm">{dashboard.unreadMessages} unread message{dashboard.unreadMessages > 1 ? 's' : ''}</div>
                <div className="text-slate-400 text-xs">Click to view messages</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === 'history' && !loading && dashboard && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-white">Attendance History</h2>
            <input type="month" className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
              value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-center">Morning</th>
                    <th className="px-4 py-3 text-center">Evening</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredHistory.map(r => (
                    <tr key={r._id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-white font-medium">
                        {new Date(r.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {r.isHoliday || r.isSunday ? '—' : r.morningPresent ? <span className="text-emerald-400">✅ {r.morningTime}</span> : <span className="text-red-400">❌</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {r.isHoliday || r.isSunday ? '—' : r.eveningPresent ? <span className="text-emerald-400">✅ {r.eveningTime}</span> : <span className="text-red-400">❌</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm ${statusColor(r.status)}`}>{statusIcon(r.status)} <span className="text-xs capitalize">{r.status}</span></span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell text-slate-500 text-xs capitalize">
                        {r.morningMethod || r.eveningMethod || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredHistory.length === 0 && (
                <div className="p-6 text-slate-500 text-sm text-center">No records for {monthFilter}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGES ── */}
      {tab === 'messages' && !loading && (
        <div className="space-y-5 animate-fade-in">
          <h2 className="text-xl font-bold text-white">Messages</h2>

          {/* Send to faculty */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-slate-200 text-sm">✉️ Send Message to Faculty</h3>
            <input className={inputCls} value={newMsg.subject} onChange={e => setNewMsg(p=>({...p,subject:e.target.value}))} placeholder="Subject (optional)" />
            <textarea className={`${inputCls} h-24 resize-none`} value={newMsg.body} onChange={e => setNewMsg(p=>({...p,body:e.target.value}))} placeholder="Write your message to faculty..." />
            <button onClick={sendMsg} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors">📨 Send</button>
          </div>

          {/* Inbox */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 font-semibold text-sm">📥 Inbox ({inbox.length})</div>
            {inbox.length === 0
              ? <div className="p-5 text-slate-500 text-sm">No messages</div>
              : inbox.map(m => (
                <div key={m._id} className="px-5 py-4 border-b border-slate-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">
                      {m.type === 'holiday' ? '🏖️' : m.fromRole === 'admin' ? '🛡️' : '👨‍🏫'} {m.fromName}
                    </span>
                    <span className="text-slate-500 text-xs">{new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                  {m.subject && <div className="text-blue-400 text-xs font-medium mb-1">{m.subject}</div>}
                  <div className="text-slate-300 text-sm whitespace-pre-line">{m.body}</div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </Layout>
  );
}

const inputCls = "w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
