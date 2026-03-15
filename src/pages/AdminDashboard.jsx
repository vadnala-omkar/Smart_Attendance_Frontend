import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

const TABS = [
  { id: 'overview',  label: 'Overview',   icon: '📊' },
  { id: 'students',  label: 'Students',   icon: '👥' },
  { id: 'holidays',  label: 'Holidays',   icon: '🏖️' },
  { id: 'attendance',label: 'Attendance', icon: '📋' },
  { id: 'messages',  label: 'Messages',   icon: '💬' },
];

// ── Stat Card ─────────────────────────────────────────────────────
const Stat = ({ label, value, icon, color }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-2xl">{icon}</span>
    </div>
    <div className={`text-3xl font-bold ${color || 'text-white'}`}>{value ?? '—'}</div>
  </div>
);

export default function AdminDashboard() {
  const [tab,       setTab]      = useState('overview');
  const [overview,  setOverview] = useState(null);
  const [students,  setStudents] = useState([]);
  const [holidays,  setHolidays] = useState([]);
  const [attendance,setAttendance]=useState([]);
  const [messages,  setMessages] = useState([]);
  const [loading,   setLoading]  = useState(false);
  const [toast,     setToast]    = useState('');
  const [search,    setSearch]   = useState('');

  // Forms
  const [newHoliday,  setNewHoliday]  = useState({ date: '', reason: '' });
  const [newMsg,      setNewMsg]      = useState({ to: 'all', toName: 'All', subject: '', body: '' });
  const [editStudent, setEditStudent] = useState(null);
  const [addStudent,  setAddStudent]  = useState(false);
  const [studentForm, setStudentForm] = useState({ rollno:'', name:'', email:'', phone:'', gender:'Male', branch:'CSO' });
  const [attDate,     setAttDate]     = useState(new Date().toISOString().split('T')[0]);
  const [encodingId,  setEncodingId]  = useState(null);
  const [encodingStatus, setEncodingStatus] = useState('');
  const imgRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => { fetchTab(); }, [tab]);

  const fetchTab = async () => {
    setLoading(true);
    try {
      if (tab === 'overview')   { const r = await api.get('/api/dashboard/admin');                       setOverview(r.data); }
      if (tab === 'students')   { const r = await api.get('/api/students');                               setStudents(r.data); }
      if (tab === 'holidays')   { const r = await api.get('/api/holidays');                               setHolidays(r.data); }
      if (tab === 'attendance') { const r = await api.get(`/api/attendance/all?date=${attDate}`);         setAttendance(r.data); }
      if (tab === 'messages')   { const r = await api.get('/api/messages/sent');                          setMessages(r.data); }
    } catch (err) { showToast('❌ ' + (err.response?.data?.message || err.message)); }
    setLoading(false);
  };

  // ── Add Holiday ───────────────────────────────────────────────────
  const addHoliday = async () => {
    if (!newHoliday.date || !newHoliday.reason) return showToast('Please fill date and reason');
    try {
      await api.post('/api/holidays', newHoliday);
      showToast('✅ Holiday scheduled & notification sent to all');
      setNewHoliday({ date: '', reason: '' });
      fetchTab();
    } catch (err) { showToast('❌ ' + err.response?.data?.message); }
  };

  const deleteHoliday = async (id) => {
    if (!window.confirm('Remove this holiday?')) return;
    try { await api.delete(`/api/holidays/${id}`); fetchTab(); showToast('Holiday removed'); }
    catch (err) { showToast('❌ ' + err.response?.data?.message); }
  };

  // ── Add Student ───────────────────────────────────────────────────
  const saveStudent = async () => {
    try {
      if (editStudent) {
        await api.put(`/api/students/${editStudent._id}`, studentForm);
        showToast('✅ Student updated');
      } else {
        await api.post('/api/students', studentForm);
        showToast('✅ Student added. Default password = roll number');
      }
      setEditStudent(null); setAddStudent(false);
      setStudentForm({ rollno:'', name:'', email:'', phone:'', gender:'Male', branch:'CSO' });
      fetchTab();
    } catch (err) { showToast('❌ ' + err.response?.data?.message); }
  };

  // ── Photo Upload ──────────────────────────────────────────────────
  const uploadPhoto = async (studentId, file) => {
    const fd = new FormData(); fd.append('photo', file);
    try {
      await api.post(`/api/students/${studentId}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('📸 Photo uploaded. Now click "Encode Face" to register.');
      fetchTab();
    } catch (err) { showToast('❌ ' + err.response?.data?.message); }
  };

  // ── Face Encoding ─────────────────────────────────────────────────
  const encodeStudentFace = async (student) => {
    if (!student.photoPath) return showToast('Upload a photo first');
    setEncodingId(student._id);
    setEncodingStatus('Loading models...');
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      setEncodingStatus('Detecting face...');
      const img = await faceapi.fetchImage(`http://localhost:5000/uploads/photos/${student.photoPath}`);
      const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                     .withFaceLandmarks().withFaceDescriptor();
      if (!detection) { setEncodingStatus(''); setEncodingId(null); return showToast('❌ No face detected in photo. Try a clearer photo.'); }
      const descriptor = Array.from(detection.descriptor);
      await api.post('/api/face/save-encoding', { studentId: student._id, descriptor });
      setEncodingStatus('');
      setEncodingId(null);
      showToast(`✅ Face encoded for ${student.name}`);
      fetchTab();
    } catch (err) {
      setEncodingStatus('');
      setEncodingId(null);
      showToast('❌ Encoding failed: ' + err.message);
    }
  };

  // ── Excel Import ──────────────────────────────────────────────────
  const importExcel = async (file) => {
    const fd = new FormData(); fd.append('excel', file);
    try {
      const res = await api.post('/api/students/import-excel', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast(`✅ Imported: ${res.data.added} added, ${res.data.skipped} skipped`);
      fetchTab();
    } catch (err) { showToast('❌ ' + err.response?.data?.message); }
  };

  // ── Send Message ──────────────────────────────────────────────────
  const sendMsg = async () => {
    if (!newMsg.body) return showToast('Message body required');
    try {
      await api.post('/api/messages/send', newMsg);
      showToast('✅ Message sent');
      setNewMsg({ to: 'all', toName: 'All', subject: '', body: '' });
      fetchTab();
    } catch (err) { showToast('❌ ' + err.response?.data?.message); }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollno.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = "w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <Layout tabs={TABS} activeTab={tab} setActiveTab={setTab} role="admin">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-800 border border-slate-600 text-white rounded-xl px-5 py-3 shadow-2xl text-sm animate-fade-in">
          {toast}
        </div>
      )}

      {loading && <div className="text-center py-12 text-slate-400 animate-pulse">Loading...</div>}

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && !loading && overview && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-xl font-bold text-white">Dashboard Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Total Students" value={overview.totalStudents} icon="👥" color="text-blue-400" />
            <Stat label="Present Today" value={overview.todayPresent} icon="✅" color="text-emerald-400" />
            <Stat label="Half-Day Today" value={overview.todayHalfDay} icon="🌓" color="text-yellow-400" />
            <Stat label="Absent Today" value={overview.todayAbsent} icon="❌" color="text-red-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Stat label="Face-Encoded Students" value={`${overview.studentsWithFace} / ${overview.totalStudents}`} icon="🤖" color="text-purple-400" />
            <Stat label="Faculty" value={overview.totalFaculty} icon="👨‍🏫" color="text-cyan-400" />
          </div>

          {/* Upcoming Holidays */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 font-semibold text-sm">🏖️ Upcoming Holidays</div>
            {overview.upcomingHolidays?.length === 0
              ? <div className="p-5 text-slate-500 text-sm">No upcoming holidays</div>
              : overview.upcomingHolidays?.map(h => (
                <div key={h._id} className="px-5 py-3 border-b border-slate-700/50 flex justify-between text-sm">
                  <span className="text-white">{h.reason}</span>
                  <span className="text-slate-400">{h.date}</span>
                </div>
              ))
            }
          </div>

          {/* Weekly Trend */}
          {overview.weeklyData && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="font-semibold text-sm mb-4">📈 7-Day Attendance Trend</div>
              <div className="flex items-end gap-2 h-24">
                {overview.weeklyData.map((d, i) => {
                  const h = overview.totalStudents > 0 ? Math.round(((d.present + d.halfDay * 0.5) / overview.totalStudents) * 100) : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-xs text-slate-400">{h}%</div>
                      <div className="w-full bg-slate-700 rounded-t" style={{ height: `${Math.max(4, h * 0.8)}px`, background: h > 60 ? '#10b981' : h > 40 ? '#f59e0b' : '#ef4444' }} />
                      <div className="text-xs text-slate-500">{d.date.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STUDENTS ── */}
      {tab === 'students' && !loading && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white">Students ({students.length})</h2>
            <div className="flex gap-2 flex-wrap">
              <label className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm cursor-pointer transition-colors">
                📥 Import Excel
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files[0] && importExcel(e.target.files[0])} />
              </label>
              <button onClick={() => { setAddStudent(true); setEditStudent(null); setStudentForm({ rollno:'', name:'', email:'', phone:'', gender:'Male', branch:'CSO' }); }}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm transition-colors">
                + Add Student
              </button>
            </div>
          </div>

          <input type="text" placeholder="Search name or roll number..." value={search} onChange={e => setSearch(e.target.value)}
            className={inputCls} />

          {/* Add / Edit Form */}
          {(addStudent || editStudent) && (
            <div className="bg-slate-800 border border-blue-800 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-blue-300">{editStudent ? 'Edit Student' : 'Add Student'}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {!editStudent && <div><label className="text-xs text-slate-400 mb-1 block">Roll No *</label>
                  <input className={inputCls} value={studentForm.rollno} onChange={e => setStudentForm(p=>({...p,rollno:e.target.value}))} placeholder="22WJ1A6901" /></div>}
                <div><label className="text-xs text-slate-400 mb-1 block">Name *</label>
                  <input className={inputCls} value={studentForm.name} onChange={e => setStudentForm(p=>({...p,name:e.target.value}))} placeholder="Full Name" /></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Email</label>
                  <input className={inputCls} value={studentForm.email} onChange={e => setStudentForm(p=>({...p,email:e.target.value}))} placeholder="email@gmail.com" /></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Phone</label>
                  <input className={inputCls} value={studentForm.phone} onChange={e => setStudentForm(p=>({...p,phone:e.target.value}))} placeholder="9XXXXXXXXX" /></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Gender</label>
                  <select className={inputCls} value={studentForm.gender} onChange={e => setStudentForm(p=>({...p,gender:e.target.value}))}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Branch</label>
                  <input className={inputCls} value={studentForm.branch} onChange={e => setStudentForm(p=>({...p,branch:e.target.value}))} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveStudent} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm transition-colors">Save</button>
                <button onClick={() => { setAddStudent(false); setEditStudent(null); }} className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Students Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Roll No</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Gender</th>
                    <th className="px-4 py-3 text-center">Face</th>
                    <th className="px-4 py-3 text-center">Photo</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filtered.map(s => (
                    <tr key={s._id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-blue-400 font-mono text-xs">{s.rollno}</td>
                      <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{s.phone || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{s.gender || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${s.faceEncoding?.length ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'}`}>
                          {s.faceEncoding?.length ? '✅' : '❌'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <label className="cursor-pointer text-xs bg-slate-700 hover:bg-slate-600 text-white rounded px-2 py-1 transition-colors">
                          📸 Upload
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadPhoto(s._id, e.target.files[0])} />
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <button onClick={() => { setEditStudent(s); setAddStudent(false); setStudentForm({ name:s.name, email:s.email||'', phone:s.phone||'', gender:s.gender||'Male', branch:s.branch||'CSO' }); }}
                            className="text-xs bg-slate-700 hover:bg-slate-600 text-white rounded px-2 py-1 transition-colors">✏️</button>
                          <button onClick={() => encodeStudentFace(s)} disabled={encodingId === s._id}
                            className="text-xs bg-purple-800 hover:bg-purple-700 text-white rounded px-2 py-1 transition-colors disabled:opacity-50">
                            {encodingId === s._id ? encodingStatus || '⏳' : '🤖 Encode'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="p-6 text-slate-500 text-center">No students found</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── HOLIDAYS ── */}
      {tab === 'holidays' && !loading && (
        <div className="space-y-5 animate-fade-in">
          <h2 className="text-xl font-bold text-white">Manage Holidays</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="font-semibold text-slate-200 mb-4">Schedule New Holiday</h3>
            <p className="text-slate-400 text-xs mb-4">Scheduling a holiday will automatically send notifications to all students and faculty, and attendance will not be counted for that day.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div><label className="text-xs text-slate-400 mb-1 block">Date *</label>
                <input type="date" className={inputCls} value={newHoliday.date} onChange={e => setNewHoliday(p=>({...p,date:e.target.value}))} /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Reason *</label>
                <input className={inputCls} value={newHoliday.reason} onChange={e => setNewHoliday(p=>({...p,reason:e.target.value}))} placeholder="e.g. Diwali, College Day..." /></div>
            </div>
            <button onClick={addHoliday} className="bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors">
              🏖️ Schedule Holiday + Notify All
            </button>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 font-semibold text-sm">Scheduled Holidays ({holidays.length})</div>
            {holidays.length === 0 ? <div className="p-5 text-slate-500 text-sm">No holidays scheduled</div>
              : holidays.map(h => (
                <div key={h._id} className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium text-sm">{h.reason}</div>
                    <div className="text-slate-400 text-xs">{h.date}</div>
                  </div>
                  <button onClick={() => deleteHoliday(h._id)} className="text-red-400 hover:text-red-300 text-sm transition-colors">🗑️</button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── ATTENDANCE ── */}
      {tab === 'attendance' && !loading && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-white">Attendance Records</h2>
            <input type="date" className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
              value={attDate} onChange={e => { setAttDate(e.target.value); }} onBlur={fetchTab} />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Roll No</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-center">Morning</th>
                    <th className="px-4 py-3 text-center">Evening</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {attendance.map(r => (
                    <tr key={r._id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-mono text-xs text-blue-400">{r.rollno}</td>
                      <td className="px-4 py-3 text-white">{r.student?.name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {r.morningPresent ? <span className="text-emerald-400 text-xs">✅ {r.morningTime}</span> : <span className="text-red-400 text-xs">❌</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.eveningPresent ? <span className="text-emerald-400 text-xs">✅ {r.eveningTime}</span> : <span className="text-red-400 text-xs">❌</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell text-slate-500 text-xs capitalize">
                        {r.morningMethod || r.eveningMethod || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendance.length === 0 && <div className="p-6 text-slate-500 text-center">No attendance records for {attDate}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGES ── */}
      {tab === 'messages' && !loading && (
        <div className="space-y-5 animate-fade-in">
          <h2 className="text-xl font-bold text-white">Send Notification / Message</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Recipient</label>
                <select className={inputCls} value={newMsg.to} onChange={e => setNewMsg(p=>({...p, to:e.target.value, toName: e.target.value === 'all' ? 'All' : e.target.options[e.target.selectedIndex].text}))}>
                  <option value="all">📢 All Students & Faculty</option>
                  {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.rollno})</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block">Subject</label>
                <input className={inputCls} value={newMsg.subject} onChange={e => setNewMsg(p=>({...p,subject:e.target.value}))} placeholder="Subject (optional)" /></div>
            </div>
            <div><label className="text-xs text-slate-400 mb-1 block">Message *</label>
              <textarea className={`${inputCls} h-28 resize-none`} value={newMsg.body} onChange={e => setNewMsg(p=>({...p,body:e.target.value}))} placeholder="Type your message..." /></div>
            <button onClick={sendMsg} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors">
              📨 Send Message
            </button>
          </div>

          {/* Sent messages */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 font-semibold text-sm">Sent Messages</div>
            {messages.map(m => (
              <div key={m._id} className="px-5 py-4 border-b border-slate-700/50">
                <div className="flex justify-between mb-1">
                  <span className="text-white text-sm font-medium">{m.subject || '(No Subject)'}</span>
                  <span className="text-slate-500 text-xs">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-slate-400 text-xs mb-1">To: {m.toName}</div>
                <div className="text-slate-300 text-sm">{m.body.substring(0, 120)}{m.body.length > 120 ? '...' : ''}</div>
              </div>
            ))}
            {messages.length === 0 && <div className="p-5 text-slate-500 text-sm">No messages sent yet</div>}
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
