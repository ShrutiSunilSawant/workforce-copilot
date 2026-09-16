import { createContext, useContext, useState, useEffect } from "react";
import { apiUrl } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
        if (res.ok) {
          setUser(await res.json());
        }
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
    setUser(null);
  };

  const isAdmin = () => user?.role === "admin";
  const isManager = () => user?.role === "manager";

  const authFetch = async (url, options = {}) => {
    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...options.headers,
        "Content-Type": options.body instanceof FormData ? undefined : "application/json",
      },
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
