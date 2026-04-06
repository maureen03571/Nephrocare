import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email, password }
      : { email, password, name, role };

    try {
      const res = await axios.post(`http://localhost:3001${endpoint}`, payload);
      if (res.data.success) {
        login(res.data.user);
        if (res.data.user.role === 'patient') {
          navigate(isLogin ? '/patient/home' : '/patient/setup');
        } else if (res.data.user.role === 'doctor') {
          navigate('/doctor');
        } else if (res.data.user.role === 'caregiver') {
          navigate('/caregiver');
        }
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
          {!isLogin && (
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
          )}

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
              className="w-full bg-gradient-to-r from-nephro-primary to-nephro-light text-white font-black py-4 px-4 rounded-2xl mt-8 shadow-[0_0_20px_rgba(26,107,74,0.4)] hover:shadow-[0_0_30px_rgba(26,107,74,0.6)] transition-all duration-300 active:scale-95 border border-white/20 tracking-wide text-lg"
            >
              {isLogin ? 'LOG IN' : 'SIGN UP'}
            </button>
          </form>
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
