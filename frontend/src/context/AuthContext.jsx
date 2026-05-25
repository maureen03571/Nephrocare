import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Load user from localStorage or Firebase
  useEffect(() => {
    const storedUser = localStorage.getItem('nephro_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // If logged in via Firebase, we might need to fetch their role from our backend
        // For now, we'll assume they are a patient or use their existing local data
        const userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          role: 'patient', // Default role for Google Sign-In
          isGoogle: true
        };
        setUser(userData);
        localStorage.setItem('nephro_user', JSON.stringify(userData));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('nephro_user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('nephro_user');
    await signOut(auth);
  };

  const signInWithGoogle = async () => {
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
