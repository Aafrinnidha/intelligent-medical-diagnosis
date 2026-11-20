import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [doctor, setDoctor] = useState(() => {
    try {
      const saved = localStorage.getItem('cdss_doctor');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const verifySession = useCallback(async () => {
    const token = localStorage.getItem('cdss_token');
    if (!token) {
      setDoctor(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await authAPI.me();
      setDoctor(data.doctor);
      localStorage.setItem('cdss_doctor', JSON.stringify(data.doctor));
    } catch {
      localStorage.removeItem('cdss_token');
      localStorage.removeItem('cdss_doctor');
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('cdss_token', data.token);
    localStorage.setItem('cdss_doctor', JSON.stringify(data.doctor));
    setDoctor(data.doctor);
    return data.doctor;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    localStorage.setItem('cdss_token', data.token);
    localStorage.setItem('cdss_doctor', JSON.stringify(data.doctor));
    setDoctor(data.doctor);
    return data.doctor;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('cdss_token');
      localStorage.removeItem('cdss_doctor');
      setDoctor(null);
    }
  };

  const isExpert = doctor?.role === 'medical_expert' || doctor?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        doctor,
        loading,
        isAuthenticated: Boolean(doctor),
        isExpert,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
