import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Heart, Bell, Calendar, User, Bot, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AIChat from '../../components/AIChat';

const CaregiverDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    // For now, caregiver sees the first registered patient as their "assigned" one
    // In a real app, this would be a specific assignment join table
    axios.get('http://localhost:3001/api/users/patients')
      .then(res => {
        if (res.data.patients && res.data.patients.length > 0) {
          setPatient(res.data.patients[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="h-full flex flex-col bg-nephro-bg pb-20">
      {/* Header */}
      <div className="bg-white p-5 rounded-b-3xl shadow-sm z-10 sticky top-0 flex flex-col border-b border-gray-100">
        <div className="flex justify-between items-center w-full mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-nephro-accentLight rounded-full flex items-center justify-center text-nephro-primary mr-3">
              <Heart size={20} className="fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-nephro-dark">{user?.name}</h2>
              <p className="text-gray-500 text-xs font-medium">Caregiver Account</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-nephro-primary transition-colors">
            <LogOut size={20} />
          </button>
        </div>
        
        {/* Navigation Tabs */}
        <div className="w-full flex space-x-4">
           <button onClick={() => setActiveTab('overview')} className={`pb-2 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'overview' ? 'border-nephro-primary text-nephro-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
             <ClipboardList size={16} className="inline mr-1 mb-0.5" /> Overview
           </button>
           <button onClick={() => setActiveTab('ai')} className={`pb-2 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'ai' ? 'border-nephro-primary text-nephro-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
             <Bot size={16} className="inline mr-1 mb-0.5" /> AI Assist
           </button>
        </div>
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <>
            <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider mb-3">Assigned Patient</h3>
            
            {loading ? (
              <div className="animate-pulse bg-white rounded-2xl p-8 border border-gray-100 flex items-center justify-center mb-6">
                <div className="w-8 h-8 border-4 border-nephro-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : patient ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 relative">
                <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-nephro-primary to-nephro-accentLight"></div>
                <div className="p-5 pt-6 flex items-center">
                  <div className="w-14 h-14 bg-nephro-bg rounded-full flex items-center justify-center text-nephro-primary shadow-inner mr-4">
                     <User size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-nephro-dark">{patient.name}</h4>
                    <p className="text-sm text-nephro-primary font-medium">{patient.profile?.condition || 'No Condition Set'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center mb-6">
                <User size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 font-medium">No patients currently assigned <br/> to your care profile.</p>
              </div>
            )}

            <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider mb-3">Today's Care Tasks</h3>
            {patient ? (
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-50 p-2 rounded-full text-blue-500 mr-3"><Bell size={18} /></div>
                    <div>
                      <p className="text-sm font-bold">Ensure 1L Water Intake</p>
                      <p className="text-xs text-gray-400">All Day</p>
                    </div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-nephro-primary" />
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-green-50 p-2 rounded-full text-green-500 mr-3"><Bell size={18} /></div>
                    <div>
                      <p className="text-sm font-bold">Verify Morning Medications</p>
                      <p className="text-xs text-gray-400">08:00 AM</p>
                    </div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-nephro-primary" />
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Care tasks will appear when a patient is linked.</p>
            )}
          </>
        )}

        {activeTab === 'ai' && (
          <div className="h-full bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden relative" style={{ height: 'calc(100vh - 200px)' }}>
            <AIChat customTitle="Caregiver AI Support" customSubtitle="Ask questions about task assignments" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CaregiverDashboard;
