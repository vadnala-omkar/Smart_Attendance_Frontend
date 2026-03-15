import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const roles = [
    { role: 'admin',   label: 'Admin',   icon: '🛡️', color: 'from-violet-600 to-purple-700',  desc: 'Manage students, holidays & system' },
    { role: 'faculty', label: 'Faculty', icon: '👨‍🏫', color: 'from-blue-600 to-cyan-700',      desc: 'Manual attendance & messaging' },
    { role: 'student', label: 'Student', icon: '🎓', color: 'from-emerald-600 to-teal-700',   desc: 'View attendance & messages' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-2xl px-6 py-3 mb-6">
          <span className="text-3xl">🎓</span>
          <div className="text-left">
            <div className="text-xs text-slate-400 font-medium tracking-widest uppercase">GNITC · CSO · 4th Year</div>
            <div className="text-white font-bold text-lg leading-tight">Smart Attendance System</div>
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-3">
          Face Recognition<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Attendance Portal
          </span>
        </h1>
        <p className="text-slate-400 text-base max-w-md mx-auto">
          Automated attendance via USB webcam — Morning 9:00–9:30 · Evening 4:00–4:30
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-2xl mb-10 animate-fade-in">
        {roles.map(({ role, label, icon, color, desc }) => (
          <button
            key={role}
            onClick={() => navigate(`/login/${role}`)}
            className={`group bg-gradient-to-br ${color} p-px rounded-2xl hover:scale-105 transition-all duration-200 shadow-lg`}
          >
            <div className="bg-slate-900 rounded-2xl p-6 h-full text-left hover:bg-slate-800 transition-colors">
              <div className="text-4xl mb-3">{icon}</div>
              <div className="text-white font-bold text-lg mb-1">{label}</div>
              <div className="text-slate-400 text-sm">{desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Camera Display link */}
      <button
        onClick={() => navigate('/camera')}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm border border-slate-700 hover:border-slate-500 rounded-xl px-5 py-3 transition-all"
      >
        <span>📷</span> Open Camera Attendance Display
      </button>

      <p className="text-slate-600 text-xs mt-8">
        Raspberry Pi 4B · face-api.js · MongoDB Atlas
      </p>
    </div>
  );
}
