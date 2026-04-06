import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const PatientSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    condition: '',
    stage: 'Stage 1',
    diagnosisDate: '',
    treatments: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:3001/api/patient/${user.id}/profile`, formData);
      navigate('/patient/home');
    } catch (error) {
      console.error('Failed to save profile', error);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 bg-nephro-bg overflow-y-auto">
      <div className="mb-8 mt-4">
        <h2 className="text-2xl font-bold text-nephro-primary">Setup Your Profile</h2>
        <p className="text-sm text-gray-500 mt-1">Let's personalize your NephroCare experience.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        <div>
          <label className="block text-sm font-medium text-nephro-dark mb-1">Full Name</label>
          <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-nephro-primary outline-none" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-nephro-dark mb-1">Kidney Condition</label>
          <input type="text" name="condition" required value={formData.condition} onChange={handleChange} placeholder="e.g. Chronic Kidney Disease" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-nephro-primary outline-none" />
        </div>

        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-nephro-dark mb-1">Stage</label>
            <select name="stage" value={formData.stage} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-nephro-primary outline-none bg-white">
              {['Stage 1', 'Stage 2', 'Stage 3a', 'Stage 3b', 'Stage 4', 'Stage 5 (ESRD)'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-nephro-dark mb-1">Diagnosis Date</label>
            <input type="date" name="diagnosisDate" required value={formData.diagnosisDate} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-nephro-primary outline-none bg-white" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-nephro-dark mb-1">Current Treatments</label>
          <textarea name="treatments" rows="3" value={formData.treatments} onChange={handleChange} placeholder="e.g. Hemodialysis, Lisinopril..." className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-nephro-primary outline-none resize-none"></textarea>
        </div>

        <button type="submit" className="w-full mt-8 bg-nephro-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-nephro-primary/30 active:scale-95 transition-transform">
          Complete Profile
        </button>
      </form>
    </div>
  );
};

export default PatientSetup;
