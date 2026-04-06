import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PhoneWrapper from './components/PhoneWrapper';

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

import DoctorDashboard from './pages/doctor/DoctorDashboard';
import CaregiverDashboard from './pages/caregiver/CaregiverDashboard';

// Placeholders for other routes that we'll implement next
const Placeholder = ({ title }) => (
  <div className="flex items-center justify-center h-full">
    <h2 className="text-xl font-bold">{title}</h2>
  </div>
);

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/auth" />; // or unauthorized page
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/auth" element={<Auth />} />
      
      {/* Patient Routes */}
      <Route path="/patient/setup" element={<ProtectedRoute allowedRole="patient"><PatientSetup /></ProtectedRoute>} />
      <Route path="/patient" element={<ProtectedRoute allowedRole="patient"><PatientLayout /></ProtectedRoute>}>
        <Route path="home" element={<Home />} />
        <Route path="education" element={<Education />} />
        <Route path="track" element={<Track />} />
        <Route path="community" element={<Community />} />
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
    <AuthProvider>
      <PhoneWrapper>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </PhoneWrapper>
    </AuthProvider>
  );
}

export default App;
