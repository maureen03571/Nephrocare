import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, Check } from 'lucide-react';

const Track = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('symptoms'); // symptoms, medications, weight
  const [success, setSuccess] = useState(false);

  // Form states
  const [symptom, setSymptom] = useState({ type: 'Fatigue', severity: 'Low', notes: '' });
  const [med, setMed] = useState({ name: '', dose: '', time: '' });
  const [weight, setWeight] = useState({ value: '', unit: 'kg' });

  const showSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const submitSymptom = async (e) => {
    e.preventDefault();
    await axios.post(`http://localhost:3001/api/patient/${user.id}/symptoms`, symptom);
    setSymptom({ type: 'Fatigue', severity: 'Low', notes: '' });
    showSuccess();
  };

  const submitMed = async (e) => {
    e.preventDefault();
    await axios.post(`http://localhost:3001/api/patient/${user.id}/medications`, med);
    setMed({ name: '', dose: '', time: '' });
    showSuccess();
  };

  const submitWeight = async (e) => {
    e.preventDefault();
    await axios.post(`http://localhost:3001/api/patient/${user.id}/weight`, weight);
    setWeight({ value: '', unit: 'kg' });
    showSuccess();
  };

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold text-nephro-dark mb-4">Track Health</h2>
      
      {/* Tabs */}
      <div className="flex bg-white rounded-lg p-1 shadow-sm mb-6 border border-gray-100">
        {['symptoms', 'medications', 'weight'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md capitalize transition-colors ${activeTab === t ? 'bg-nephro-primary text-white' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {success && (
        <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-center text-sm font-medium flex items-center justify-center">
          <Check size={16} className="mr-2" /> Successfully Logged
        </div>
      )}

      {/* Forms */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        {activeTab === 'symptoms' && (
          <form onSubmit={submitSymptom} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Symptom Type</label>
              <select value={symptom.type} onChange={(e) => setSymptom({...symptom, type: e.target.value})} className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 outline-none">
                <option>Fatigue</option>
                <option>Swelling (Edema)</option>
                <option>Nausea</option>
                <option>Shortness of Breath</option>
                <option>Pain</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Severity</label>
              <div className="flex space-x-2">
                {['Low', 'Medium', 'High'].map(s => (
                  <button key={s} type="button" onClick={() => setSymptom({...symptom, severity: s})} className={`flex-1 py-2 rounded-lg text-sm border font-medium ${symptom.severity === s ? 'bg-nephro-light text-white border-nephro-light' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Notes</label>
              <textarea value={symptom.notes} onChange={(e) => setSymptom({...symptom, notes: e.target.value})} rows="3" className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 outline-none resize-none text-sm" placeholder="Any additional context..."></textarea>
            </div>
            <button type="submit" className="w-full bg-nephro-dark text-white font-bold py-3 rounded-xl flex items-center justify-center shadow-lg active:scale-95">
              <PlusCircle size={18} className="mr-2" /> Log Symptom
            </button>
          </form>
        )}

        {activeTab === 'medications' && (
          <form onSubmit={submitMed} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Medication Name</label>
              <input type="text" required value={med.name} onChange={(e) => setMed({...med, name: e.target.value})} className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 outline-none text-sm" placeholder="e.g. Lisinopril" />
            </div>
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Dosage</label>
                <input type="text" required value={med.dose} onChange={(e) => setMed({...med, dose: e.target.value})} className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 outline-none text-sm" placeholder="e.g. 10mg" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Time</label>
                <input type="time" required value={med.time} onChange={(e) => setMed({...med, time: e.target.value})} className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 outline-none text-sm" />
              </div>
            </div>
            <button type="submit" className="w-full bg-nephro-dark text-white font-bold py-3 rounded-xl flex items-center justify-center shadow-lg active:scale-95 mt-2">
              <PlusCircle size={18} className="mr-2" /> Add Medication
            </button>
          </form>
        )}

        {activeTab === 'weight' && (
          <form onSubmit={submitWeight} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Current Weight</label>
              <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                <input type="number" step="0.1" required value={weight.value} onChange={(e) => setWeight({...weight, value: e.target.value})} className="w-full p-4 bg-transparent outline-none text-xl font-bold" placeholder="0.0" />
                <select value={weight.unit} onChange={(e) => setWeight({...weight, unit: e.target.value})} className="bg-transparent px-4 font-semibold text-gray-500 outline-none border-l border-gray-200">
                  <option>kg</option>
                  <option>lbs</option>
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-2">Tracking weight helps monitor fluid retention.</p>
            </div>
            <button type="submit" className="w-full bg-nephro-dark text-white font-bold py-3 rounded-xl flex items-center justify-center shadow-lg active:scale-95 mt-4">
              <PlusCircle size={18} className="mr-2" /> Log Weight
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Track;
