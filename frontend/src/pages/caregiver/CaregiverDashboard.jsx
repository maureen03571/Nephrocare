import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Heart, Bell, Calendar, User, Bot, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AIChat from '../../components/AIChat';
import { API_BASE_URL } from '../../config';

const CaregiverDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkCode, setLinkCode] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  React.useEffect(() => {
    fetchLinkedPatient();
  }, [user?.id]);

  const fetchLinkedPatient = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/caregiver/${user.id}/patient`);
      if (res.data.success) {
        setPatient(res.data.patient);
      }
    } catch (err) {
      console.error('No patient linked or failed to fetch', err);
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPatient = async (e) => {
    e.preventDefault();
    if (!linkCode.trim()) return;
    
    setIsLinking(true);
    setLinkError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/caregiver/link-patient`, {
        caregiverId: user.id,
        linkCode: linkCode.toUpperCase().trim()
      });
      
      if (res.data.success) {
        alert(`Successfully linked to ${res.data.patientName}!`);
        fetchLinkedPatient();
      }
    } catch (err) {
      setLinkError(err.response?.data?.message || 'Invalid link code. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

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
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
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

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CKD Stage</p>
                      <p className="text-lg font-black text-nephro-dark">{patient.profile?.stage || 'N/A'}</p>
                   </div>
                   <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Health Score</p>
                      <p className={`text-lg font-black ${patient.dashboard?.healthScore?.value >= 80 ? 'text-green-500' : 'text-orange-500'}`}>
                         {patient.dashboard?.healthScore?.value || '--'}%
                      </p>
                   </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <h4 className="font-bold text-sm text-nephro-dark mb-4 border-b border-gray-50 pb-2 flex items-center">
                    <ClipboardList size={16} className="mr-2 text-nephro-primary" /> Medications
                  </h4>
                  {patient.meds?.length > 0 ? (
                    <div className="space-y-3">
                      {patient.meds.map((m, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm font-bold text-nephro-dark">{m.name}</p>
                            <p className="text-[10px] text-gray-500">{m.dose} • {m.time}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-gray-400 italic">No medications documented.</p>}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-nephro-bg rounded-full flex items-center justify-center text-nephro-primary mb-4">
                    <User size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-nephro-dark mb-1">Link a Patient</h4>
                  <p className="text-sm text-gray-500 mb-6 px-4">Enter the unique link code provided by your patient to securely connect to their care status.</p>
                  
                  <form onSubmit={handleLinkPatient} className="w-full max-w-xs">
                    <div className="relative mb-3">
                      <input 
                        type="text" 
                        maxLength={6}
                        value={linkCode}
                        onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE (e.g. AB12CD)"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 text-center font-mono font-bold tracking-widest text-nephro-primary focus:border-nephro-primary focus:bg-white outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-300"
                        required
                      />
                    </div>
                    {linkError && <p className="text-xs text-red-500 font-medium mb-3">⚠️ {linkError}</p>}
                    <button 
                      type="submit"
                      disabled={isLinking || !linkCode}
                      className="w-full bg-nephro-primary text-white font-bold py-3 rounded-xl shadow-md shadow-nephro-primary/10 hover:bg-nephro-dark active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {isLinking ? (
                         <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Connect Account'
                      )}
                    </button>
                  </form>
                </div>
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
