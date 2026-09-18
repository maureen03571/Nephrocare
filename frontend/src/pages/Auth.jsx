import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getPatientHomePath } from '../utils/patientSetup';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (user.role === 'patient') {
      getPatientHomePath(user.id, API_BASE_URL).then(navigate);
    } else if (user.role === 'doctor') {
      navigate('/doctor');
    } else if (user.role === 'caregiver') {
      navigate('/caregiver');
    }
  }, [user, navigate]);

  const routeAfterAuth = async (authUser, isNewUser = false) => {
    login(authUser);
    if (authUser.role === 'patient') {
      const destination = isNewUser
        ? '/patient/setup'
        : await getPatientHomePath(authUser.id, API_BASE_URL);
      navigate(destination);
    } else if (authUser.role === 'doctor') {
      navigate('/doctor');
    } else if (authUser.role === 'caregiver') {
      navigate('/caregiver');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/google`, {
        credential: credentialResponse.credential,
        role: isLogin ? undefined : role
      });
      if (res.data.success) {
        await routeAfterAuth(res.data.user, res.data.isNewUser);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google Sign-In failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = isLogin 
      ? { email, password, role }
      : { email, password, name, role };

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/${isLogin ? 'login' : 'register'}`, payload);
      if (res.data.success) {
        await routeAfterAuth(res.data.user, !isLogin);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-[800px] h-full flex flex-col p-6 bg-nephro-bg relative overflow-hidden">
      {/* Animated Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-nephro-accentLight/40 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] bg-nephro-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[300px] h-[300px] bg-white/40 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex-1 flex flex-col justify-center relative z-10 w-full max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-nephro-primary drop-shadow-sm tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-nephro-dark/70 mt-2 font-medium text-lg">
            {isLogin ? 'Log in to continue to NephroCare' : 'Join NephroCare today'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 mb-6 rounded-2xl shadow-sm backdrop-blur-md">
            <p className="font-medium text-sm text-center">{error}</p>
          </div>
        )}

        {/* Premium Glassmorphism Form Card */}
        <div className="backdrop-blur-xl bg-white/50 border border-white/60 p-6 rounded-[32px] shadow-[0_8px_32px_rgba(26,107,74,0.1)]">
          <div className="mb-6 flex p-1.5 bg-white/60 backdrop-blur-md rounded-[18px] shadow-inner border border-white/40">
            {['patient', 'doctor', 'caregiver'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl capitalize transition-all duration-300 ${
                  role === r
                    ? 'bg-gradient-to-r from-nephro-primary to-nephro-light text-white shadow-[0_4px_12px_rgba(26,107,74,0.3)] scale-[1.02]'
                    : 'text-gray-500 hover:text-nephro-dark'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-nephro-dark/80 mb-1.5 uppercase tracking-wider ml-1">Full Name</label>
                <input
                  type="text" required
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-white/60 bg-white/40 focus:bg-white/80 focus:border-nephro-primary focus:ring-4 focus:ring-nephro-primary/20 outline-none transition-all placeholder:text-gray-400 font-medium shadow-inner"
                  placeholder="John Doe"
                  value={name} onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-nephro-dark/80 mb-1.5 uppercase tracking-wider ml-1">Email Address</label>
              <input
                type="email" required
                className="w-full px-5 py-3.5 rounded-2xl border-2 border-white/60 bg-white/40 focus:bg-white/80 focus:border-nephro-primary focus:ring-4 focus:ring-nephro-primary/20 outline-none transition-all placeholder:text-gray-400 font-medium shadow-inner"
                placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-nephro-dark/80 mb-1.5 uppercase tracking-wider ml-1">Password</label>
              <input
                type="password" required
                className="w-full px-5 py-3.5 rounded-2xl border-2 border-white/60 bg-white/40 focus:bg-white/80 focus:border-nephro-primary focus:ring-4 focus:ring-nephro-primary/20 outline-none transition-all placeholder:text-gray-400 font-medium shadow-inner"
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-nephro-primary to-nephro-light text-white font-black py-4 px-4 rounded-2xl mt-4 shadow-[0_0_20px_rgba(26,107,74,0.4)] hover:shadow-[0_0_30px_rgba(26,107,74,0.6)] transition-all duration-300 active:scale-95 border border-white/20 tracking-wide text-lg"
            >
              {isLogin ? 'LOG IN' : 'SIGN UP'}
            </button>
          </form>

          {GOOGLE_CLIENT_ID ? (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google Sign-In was cancelled or failed')}
                  theme="outline"
                  size="large"
                  text={isLogin ? 'continue_with' : 'signup_with'}
                  shape="pill"
                  width="280"
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-center text-gray-500 mt-4">
              Google Sign-In: set <span className="font-semibold">VITE_GOOGLE_CLIENT_ID</span> in frontend env.
            </p>
          )}
        </div>

        <div className="mt-8 text-center bg-white/30 backdrop-blur-sm p-5 rounded-3xl mx-4 border border-white/50 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
          <p className="text-gray-600 font-medium">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-nephro-primary font-extrabold hover:text-nephro-light hover:underline focus:outline-none transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Auth;
