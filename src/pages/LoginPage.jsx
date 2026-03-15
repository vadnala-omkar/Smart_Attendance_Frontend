import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const CONFIG = {
  admin:   { label: 'Admin',   icon: '🛡️', color: 'violet', idLabel: 'Email Address',    idPlaceholder: 'admin@gnitc.ac.in',     pwPlaceholder: 'admin123' },
  faculty: { label: 'Faculty', icon: '👨‍🏫', color: 'blue',   idLabel: 'Email Address',    idPlaceholder: 'faculty@gnitc.ac.in',   pwPlaceholder: 'faculty123' },
  student: { label: 'Student', icon: '🎓', color: 'emerald', idLabel: 'Roll Number',      idPlaceholder: 'e.g. 22WJ1A6901',        pwPlaceholder: 'Your roll number' },
};

const COLORS = {
  violet: 'bg-violet-600 hover:bg-violet-500 focus:ring-violet-500',
  blue:   'bg-blue-600   hover:bg-blue-500   focus:ring-blue-500',
  emerald:'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500',
};

export default function LoginPage() {
  const { role }   = useParams();
  const navigate   = useNavigate();
  const { login }  = useAuth();
  const cfg        = CONFIG[role] || CONFIG.student;

  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [showPw,     setShowPw]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { identifier, password, role });
      login(res.data.user, res.data.token);
      if (role === 'admin')   navigate('/admin');
      else if (role === 'faculty') navigate('/faculty');
      else navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Back */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          ← Back to Home
        </button>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">{cfg.icon}</div>
            <h2 className="text-2xl font-bold text-white">{cfg.label} Login</h2>
            <p className="text-slate-400 text-sm mt-1">GNITC Smart Attendance System</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm mb-5">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">{cfg.idLabel}</label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder={cfg.idPlaceholder}
                required
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500 transition"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={cfg.pwPlaceholder}
                  required
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500 transition"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-lg">
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${COLORS[cfg.color]} text-white font-semibold rounded-xl py-3 text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? '⏳ Signing in...' : `Sign In as ${cfg.label}`}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-700 pt-5">
            <p className="text-slate-500 text-xs text-center">
              {role === 'student'
                ? '💡 Your password is your roll number (e.g. 22WJ1A6901)'
                : '💡 Contact admin if you forgot your password'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
