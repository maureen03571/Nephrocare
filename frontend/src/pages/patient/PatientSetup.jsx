import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const PatientSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    condition: '',
    stage: 'Stage 1',
    diagnosisDate: '',
    treatments: '',
    baselineGfr: '',
    baselineCreatinine: '',
    medicationList: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/api/patient/${user.id}/profile`, {
        name: formData.name,
        condition: formData.condition,
        stage: formData.stage,
        diagnosisDate: formData.diagnosisDate,
        treatments: formData.treatments
      });

      await axios.put(`${API_BASE_URL}/api/patient/${user.id}/onboarding`, {
        ckdStage: formData.stage,
        baselineLabs: {
          gfr: formData.baselineGfr || null,
          creatinine: formData.baselineCreatinine || null
        },
        medicationList: formData.medicationList
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        quiz: {
          hydrationKnowledge: 'medium',
          confidenceLevel: 'improving'
        }
      });

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-nephro-dark mb-1">Baseline GFR</label>
            <input
              type="number"
              step="0.1"
              name="baselineGfr"
              value={formData.baselineGfr}
              onChange={handleChange}
              placeholder="e.g. 48.2"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-nephro-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-nephro-dark mb-1">Baseline Creatinine</label>
            <input
              type="number"
              step="0.1"
              name="baselineCreatinine"
              value={formData.baselineCreatinine}
              onChange={handleChange}
              placeholder="e.g. 1.9"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-nephro-primary outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-nephro-dark mb-1">Medication List (comma separated)</label>
          <input
            type="text"
            name="medicationList"
            value={formData.medicationList}
            onChange={handleChange}
            placeholder="e.g. Lisinopril, Furosemide"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-nephro-primary outline-none"
          />
        </div>

        <button type="submit" className="w-full mt-8 bg-nephro-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-nephro-primary/30 active:scale-95 transition-transform">
          Complete Profile
        </button>
      </form>
    </div>
  );
};

export default PatientSetup;
