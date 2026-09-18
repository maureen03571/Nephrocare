import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

let auth = null;
let googleProvider = null;

try {
  const firebaseModule = await import('../firebaseConfig');
  auth = firebaseModule.auth;
  googleProvider = firebaseModule.googleProvider;
} catch (err) {
  console.warn('Firebase initialization failed:', err.message);
}

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Load user from localStorage or Firebase
  useEffect(() => {
    const storedUser = localStorage.getItem('nephro_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('nephro_user');
      }
    }

    // Safety timeout — if Firebase never responds, stop loading after 3s
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    
    if (auth) {
      try {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          clearTimeout(safetyTimer);
          if (firebaseUser) {
            const userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              role: 'patient',
              isGoogle: true
            };
            setUser(userData);
            localStorage.setItem('nephro_user', JSON.stringify(userData));
          }
          setLoading(false);
        });
        return () => { clearTimeout(safetyTimer); unsubscribe(); };
      } catch (err) {
        console.warn('Firebase auth listener failed:', err.message);
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    } else {
      // No Firebase — just use localStorage
      clearTimeout(safetyTimer);
      setLoading(false);
    }

    return () => clearTimeout(safetyTimer);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('nephro_user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('nephro_user');
    if (auth) {
      try { await signOut(auth); } catch (e) {}
    }
  };

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error('Firebase is not configured. Google Sign-In is unavailable.');
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signInWithGoogle }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
