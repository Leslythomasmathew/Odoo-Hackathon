import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('brightloop_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('brightloop_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Verify token
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('brightloop_user', JSON.stringify(data.user));
          } else {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('brightloop_token', data.token);
    localStorage.setItem('brightloop_user', JSON.stringify(data.user));
    return data.user;
  };

  const register = async (formData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('brightloop_token', data.token);
    localStorage.setItem('brightloop_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('brightloop_token');
    localStorage.removeItem('brightloop_user');
  };

  // Instant switch user for demo evaluation
  const switchUser = async (roleOrEmail) => {
    const isEmail = roleOrEmail.includes('@');
    const body = isEmail ? { email: roleOrEmail } : { role: roleOrEmail };
    const res = await fetch('/api/auth/switch-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('brightloop_token', data.token);
      localStorage.setItem('brightloop_user', JSON.stringify(data.user));
      return data.user;
    }
    throw new Error(data.error || 'User switch failed');
  };

  // Authorized fetch helper
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `Request failed with status ${res.status}`);
    }
    return data;
  };

  const roleLevel = user?.role === 'admin' ? 3 : user?.role === 'staff' ? 2 : user?.role === 'customer' ? 1 : 0;
  const isSupreme = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isCustomer = user?.role === 'customer';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      switchUser,
      authFetch,
      roleLevel,
      isSupreme,
      isAdmin: isSupreme,
      isStaff,
      isCustomer,
      canManageStaff: isSupreme,       // AUTH-6: Only Admin Supreme can provision staff
      canManageDiscounts: isSupreme,   // DISC-1: Only Admin Supreme can create discount rules
      canManageTaxes: isSupreme,       // INV-3: Admin sets tax rules
      canManageCatalog: isSupreme,     // PROD-1..3: Admin manages catalog & variants
      canManagePlans: isSupreme,       // PLAN-1..4: Admin configures plans
      canRunSystem: isSupreme,         // Admin runs benchmarks / reseeds
      canOperate: isSupreme || isStaff // Staff + Admin handle day-to-day operations
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
