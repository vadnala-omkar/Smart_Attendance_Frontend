import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('att_user')) || null; } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('att_token') || null);
  const [role,  setRole]  = useState(() => localStorage.getItem('att_role') || null);

  const login = (userData, tokenVal) => {
    setUser(userData);
    setToken(tokenVal);
    setRole(userData.role);
    localStorage.setItem('att_user',  JSON.stringify(userData));
    localStorage.setItem('att_token', tokenVal);
    localStorage.setItem('att_role',  userData.role);
  };

  const logout = () => {
    setUser(null); setToken(null); setRole(null);
    localStorage.removeItem('att_user');
    localStorage.removeItem('att_token');
    localStorage.removeItem('att_role');
  };

  return (
    <AuthContext.Provider value={{ user, token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
