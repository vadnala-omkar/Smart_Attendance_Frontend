import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api';

const TABS = [
  { id: 'overview',  label: 'Today',          icon: '📊' },
  { id: 'manual',    label: 'Manual Entry',    icon: '✏️' },
  { id: 'reports',   label: 'Reports',         icon: '📋' },
  { id: 'messages',  label: 'Messages',        icon: '💬' },
];

export default function FacultyDashboard() {
  const [tab,       setTab]      = useState('overview');
  const [overview,  setOverview] = useState(null);
  const [students,  setStudents] = useState([]);
  const [attDate,   setAttDate]  = useState(new Date().toISOString().split('T')[0]);
  const [manualData,setManualData] = useState({});  // { studentId: { morning: bool, evening: bool } }
  const [messages,  setMessages] = useState([]);
  const [inbox,     setInbox]    = useState([]);
  const [newMsg,    setNewMsg]   = useState({ to: 'all', toName: 'All', subject: '', body: '' });
  const [loading,   setLoading]  = useState(false);
  const [toast,     setToast]    = useState('');
  const [reportDate,setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData,setReportData] = useState([]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => { fetchTab(); }, [tab]);

  const fetchTab = async () => {
    setLoading(true);
    try {
      if (tab === 'overview' || tab === 'manual') {
        const [ovRes, stRes] = await Promise.all([
          api.get('/api/dashboard/faculty'),
          api.get('/api/students'),
        ]);
        setOverview(ovRes.data);
        setStudents(stRes.data);
        // Initialize manual entry toggles
        const init = {};
        stRes.data.forEach(s => {
          const rec = ovRes.data.todayRecords?.find(r => r.student?._id === s._id);
          init[s._id] = { morning: rec?.morningPresent || false, evening: rec?.eveningPresent || false };
        });
        setManualData(init);
      }
      if (tab === 'messages') {
        const [sentRes, inboxRes] = await Promise.all([
          api.get('/api/messages/sent'),
          api.get('/api/messages/inbox'),
        ]);
        setMessages(sentRes.data);
        setInbox(inboxRes.data);
      }
    } catch (err) { showToast('❌ ' + (err.response?.data?.message || err.message)); }
    setLoading(false);
  };

  // ── Submit bulk manual attendance ─────────────────────────────────
  const submitManual = async () => {
    const entries = students.map(s => ({
      studentId:    s._id,
      morningPresent: manualData[s._id]?.morning || false,
      eveningPresent: manualData[s._id]?.evening || false,
    }));
    try {
      const res = await api.post('/api/attendance/bulk-manual', { date: attDate, entries });
      showToast(`✅ Saved ${res.data.count} records for ${attDate}`);
      fetchTab();
    } catch (err) { showToast('❌ ' + (err.response?.data?.message || err.message)); }
  };

  // ── Load report for a date ────────────────────────────────────────
  const loadReport = async () => {
    try {
      const res = await api.get(`/api/attendance/all?date=${reportDate}`);
      setReportData(res.data);
    } catch (err) { showToast('❌ ' + err.message); }
  };

  const sendMsg = async () => {
    if (!newMsg.body) return showToast('Message body required');
    try {
      await api.post('/api/messages/send', newMsg);
      showToast('✅ Message sent');
      setNewMsg({ to: 'all', toName: 'All', subject: '', body: '' });
      fetchTab();
    } catch (err) { showToast('❌ ' + err.response?.data?.message); }
  };

  const toggle = (sid, slot) => {
    setManualData(prev => ({ ...prev, [sid]: { ...prev[sid], [slot]: !prev[sid]?.[slot] } }));
  };

  const inputCls = "w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <Layout tabs={TABS} activeTab={tab} setActiveTab={setTab} role="faculty">
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-800 border border-slate-600 text-white rounded-xl px-5 py-3 shadow-2xl text-sm animate-fade-in">
          {toast}
        </div>
      )}

      {loading && <div className="text-center py-12 text-slate-400 animate-pulse">Loading...</div>}

      {/* ── TODAY OVERVIEW ── */}
      {tab === 'overview' && !loading && overview && (
        <div className="space-y-5 animate-fade-in">
          <h2 className="text-xl font-bold text-white">Today's Attendance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">{overview.totalStudents}</div>
              <div className="text-slate-400 text-xs mt-1">Total</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{overview.presentToday}</div>
              <div className="text-slate-400 text-xs mt-1">Present</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">{overview.halfDayToday}</div>
              <div className="text-slate-400 text-xs mt-1">Half-Day</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-400">{overview.absentToday}</div>
              <div className="text-slate-400 text-xs mt-1">Absent</div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 font-semibold text-sm">Today's Records</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Roll No</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-center">Morning</th>
                    <th className="px-4 py-3 text-center">Evening</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {overview.todayRecords?.map(r => (
                    <tr key={r._id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-mono text-xs text-blue-400">{r.rollno}</td>
                      <td className="px-4 py-3 text-white">{r.student?.name}</td>
                      <td className="px-4 py-3 text-center text-xs">{r.morningPresent ? <span className="text-emerald-400">✅ {r.morningTime}</span> : <span className="text-red-400">❌</span>}</td>
                      <td className="px-4 py-3 text-center text-xs">{r.eveningPresent ? <span className="text-emerald-400">✅ {r.eveningTime}</span> : <span className="text-red-400">❌</span>}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!overview.todayRecords || overview.todayRecords.length === 0) && (
                <div className="p-5 text-slate-500 text-sm text-center">No records yet for today</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MANUAL ENTRY ── */}
      {tab === 'manual' && !loading && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-bold text-white">Manual Attendance Entry</h2>
            <div className="flex items-center gap-3">
              <input type="date" className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
                value={attDate} onChange={e => setAttDate(e.target.value)} />
              <button onClick={submitManual} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors">
                💾 Save All
              </button>
            </div>
          </div>

          <div className="bg-amber-900/30 border border-amber-800 rounded-xl px-4 py-3 text-amber-300 text-sm">
            ⚠️ Use manual entry only when the face recognition system is not working. Toggle ✅/❌ for each student.
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 text-sm">
              <span className="font-semibold">All Students ({students.length})</span>
              <div className="flex gap-3 text-xs text-slate-400">
                <span>Toggle M=Morning, E=Evening</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Roll No</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-center">Morning</th>
                    <th className="px-4 py-3 text-center">Evening</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {students.map(s => {
                    const d = manualData[s._id] || {};
                    const status = d.morning && d.evening ? 'present' : d.morning ? 'half-day' : 'absent';
                    return (
                      <tr key={s._id} className="hover:bg-slate-700/30">
                        <td className="px-4 py-3 font-mono text-xs text-blue-400">{s.rollno}</td>
                        <td className="px-4 py-3 text-white">{s.name}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggle(s._id, 'morning')}
                            className={`w-10 h-6 rounded-full text-xs font-bold transition-colors ${d.morning ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                            {d.morning ? '✓' : '✗'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggle(s._id, 'evening')}
                            className={`w-10 h-6 rounded-full text-xs font-bold transition-colors ${d.evening ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                            {d.evening ? '✓' : '✗'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── REPORTS ── */}
      {tab === 'reports' && !loading && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-white">Attendance Report</h2>
            <input type="date" className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
              value={reportDate} onChange={e => setReportDate(e.target.value)} />
            <button onClick={loadReport} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm transition-colors">
              🔍 Load
            </button>
          </div>

          {reportData.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700 text-sm font-semibold">
                {reportDate} — {reportData.filter(r=>r.status==='present').length} Present, {reportData.filter(r=>r.status==='half-day').length} Half-Day, {reportData.filter(r=>r.status==='absent').length} Absent
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/60 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">Roll No</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-center">Morning</th>
                      <th className="px-4 py-3 text-center">Evening</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {reportData.map(r => (
                      <tr key={r._id} className="hover:bg-slate-700/30">
                        <td className="px-4 py-3 font-mono text-xs text-blue-400">{r.rollno}</td>
                        <td className="px-4 py-3 text-white">{r.student?.name}</td>
                        <td className="px-4 py-3 text-center text-xs">{r.morningPresent ? <span className="text-emerald-400">✅</span> : <span className="text-red-400">❌</span>}</td>
                        <td className="px-4 py-3 text-center text-xs">{r.eveningPresent ? <span className="text-emerald-400">✅</span> : <span className="text-red-400">❌</span>}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MESSAGES ── */}
      {tab === 'messages' && !loading && (
        <div className="space-y-5 animate-fade-in">
          <h2 className="text-xl font-bold text-white">Messages</h2>

          {/* Send */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-slate-200 text-sm">Send Message to Students</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-400 mb-1 block">To</label>
                <select className={inputCls} value={newMsg.to} onChange={e => setNewMsg(p=>({...p, to:e.target.value, toName: e.target.value==='all'?'All':e.target.options[e.target.selectedIndex].text}))}>
                  <option value="all">📢 All Students</option>
                  {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.rollno})</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block">Subject</label>
                <input className={inputCls} value={newMsg.subject} onChange={e => setNewMsg(p=>({...p,subject:e.target.value}))} placeholder="Subject" /></div>
            </div>
            <textarea className={`${inputCls} h-24 resize-none`} value={newMsg.body} onChange={e => setNewMsg(p=>({...p,body:e.target.value}))} placeholder="Write message..." />
            <button onClick={sendMsg} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors">📨 Send</button>
          </div>

          {/* Inbox */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 font-semibold text-sm">📥 Inbox from Students ({inbox.length})</div>
            {inbox.filter(m => m.fromRole === 'student').map(m => (
              <div key={m._id} className="px-5 py-4 border-b border-slate-700/50">
                <div className="flex justify-between mb-1">
                  <span className="text-white text-sm font-medium">{m.fromName} <span className="text-slate-500 text-xs">({m.fromRole})</span></span>
                  <span className="text-slate-500 text-xs">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                {m.subject && <div className="text-slate-400 text-xs mb-1">Subject: {m.subject}</div>}
                <div className="text-slate-300 text-sm">{m.body}</div>
              </div>
            ))}
            {inbox.filter(m => m.fromRole === 'student').length === 0 && <div className="p-5 text-slate-500 text-sm">No messages from students</div>}
          </div>
        </div>
      )}
    </Layout>
  );
}

function StatusBadge({ status }) {
  const map = { present:'bg-emerald-900 text-emerald-300', 'half-day':'bg-yellow-900 text-yellow-300', absent:'bg-red-900 text-red-300', holiday:'bg-blue-900 text-blue-300', sunday:'bg-slate-700 text-slate-400' };
  return <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${map[status] || 'bg-slate-700 text-slate-400'}`}>{status || '—'}</span>;
}

const inputCls = "w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
