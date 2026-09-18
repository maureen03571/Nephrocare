import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PhoneWrapper from './components/PhoneWrapper';
import { API_BASE_URL } from './config';
import { isPatientProfileComplete } from './utils/patientSetup';

import Welcome from './pages/Welcome';
import Auth from './pages/Auth';

import PatientLayout from './pages/patient/PatientLayout';
import PatientSetup from './pages/patient/PatientSetup';
import Home from './pages/patient/Home';
import Education from './pages/patient/Education';
import Track from './pages/patient/Track';
import Community from './pages/patient/Community';
import Profile from './pages/patient/Profile';
import CareTeam from './pages/patient/CareTeam';
import Labs from './pages/patient/Labs';

import DoctorDashboard from './pages/doctor/DoctorDashboard';
import CaregiverDashboard from './pages/caregiver/CaregiverDashboard';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/auth" />;
  return children;
};

const PatientRoute = ({ children, requireSetup = true }) => {
  const { user } = useAuth();
  const [setupState, setSetupState] = useState(requireSetup ? 'loading' : 'ready');

  useEffect(() => {
    if (!user?.id || user.role !== 'patient' || !requireSetup) {
      setSetupState('ready');
      return;
    }

    let cancelled = false;
    const checkSetup = async () => {
      try {
        const [profileRes, onboardingRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/patient/${user.id}/profile`),
          axios.get(`${API_BASE_URL}/api/patient/${user.id}/onboarding`)
        ]);
        if (cancelled) return;
        const complete = isPatientProfileComplete(
          profileRes.data.profile,
          onboardingRes.data.onboarding
        );
        setSetupState(complete ? 'ready' : 'incomplete');
      } catch {
        if (!cancelled) setSetupState('incomplete');
      }
    };

    checkSetup();
    return () => { cancelled = true; };
  }, [user?.id, user?.role, requireSetup]);

  if (!user) return <Navigate to="/auth" />;
  if (user.role !== 'patient') return <Navigate to="/auth" />;
  if (requireSetup && setupState === 'loading') {
    return (
      <div className="h-full flex items-center justify-center bg-nephro-bg">
        <div className="w-10 h-10 border-4 border-nephro-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (requireSetup && setupState === 'incomplete') return <Navigate to="/patient/setup" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/auth" element={<Auth />} />
      
      {/* Patient Routes */}
      <Route path="/patient/setup" element={<PatientRoute requireSetup={false}><PatientSetup /></PatientRoute>} />
      <Route path="/patient" element={<PatientRoute><PatientLayout /></PatientRoute>}>
        <Route path="home" element={<Home />} />
        <Route path="education" element={<Education />} />
        <Route path="track" element={<Track />} />
        <Route path="community" element={<Community />} />
        <Route path="labs" element={<Labs />} />
        <Route path="profile" element={<Profile />} />
        <Route path="care-team" element={<CareTeam />} />
      </Route>
      
      {/* Doctor Routes */}
      <Route path="/doctor" element={<ProtectedRoute allowedRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
      
      {/* Caregiver Routes */}
      <Route path="/caregiver" element={<ProtectedRoute allowedRole="caregiver"><CaregiverDashboard /></ProtectedRoute>} />
      
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PhoneWrapper>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </PhoneWrapper>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
