import { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, Check, AlertTriangle, Pill, Target } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

const Track = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('symptoms'); // symptoms, vitals, food, medications
  const [success, setSuccess] = useState(false);

  // Form states
  const [symptom, setSymptom] = useState({ type: 'Fatigue', severity: 'Low', notes: '' });
  const [med, setMed] = useState({ name: '', dose: '', time: '' });
  const [weight, setWeight] = useState({ value: '', unit: 'kg' });
  const [bloodPressure, setBloodPressure] = useState({ systolic: '', diastolic: '', pulse: '' });
  const [foodLog, setFoodLog] = useState({ meal: '', notes: '' });
  const [sideEffect, setSideEffect] = useState('None');
  const [otcName, setOtcName] = useState('');
  const [mood, setMood] = useState('🙂');
  const [dailyProgress, setDailyProgress] = useState(null);
  const [medicationLogs, setMedicationLogs] = useState([]);

  useEffect(() => {
    const fetchDailyProgress = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/patient/${user.id}/daily-actions`);
        setDailyProgress(res.data);
        const medRes = await axios.get(`${API_BASE_URL}/api/patient/${user.id}/medications`);
        setMedicationLogs(medRes.data.medications || []);
      } catch (error) {
        console.error('Failed to load daily progress', error);
      }
    };

    if (user?.id) {
      fetchDailyProgress();
    }
  }, [user?.id, success]);

  const showSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const submitSymptom = async (e) => {
    e.preventDefault();
    await axios.post(`${API_BASE_URL}/api/patient/${user.id}/symptoms`, symptom);
    setSymptom({ type: 'Fatigue', severity: 'Low', notes: '' });
    showSuccess();
  };

  const submitMed = async (e) => {
    e.preventDefault();
    await axios.post(`${API_BASE_URL}/api/patient/${user.id}/medications`, {
      ...med,
      sideEffect: sideEffect !== 'None' ? sideEffect : ''
    });
    setMed({ name: '', dose: '', time: '' });
    setSideEffect('None');
    showSuccess();
  };

  const submitWeight = async (e) => {
    e.preventDefault();
    await axios.post(`${API_BASE_URL}/api/patient/${user.id}/weight`, weight);
    setWeight({ value: '', unit: 'kg' });
    showSuccess();
  };

  const submitBloodPressure = async (e) => {
    e.preventDefault();
    await axios.post(`${API_BASE_URL}/api/patient/${user.id}/blood-pressure`, bloodPressure);
    setBloodPressure({ systolic: '', diastolic: '', pulse: '' });
    showSuccess();
  };

  const quickLogFluid = async (amountMl) => {
    await axios.post(`${API_BASE_URL}/api/patient/${user.id}/fluid-intake`, { amountMl, source: 'track' });
    showSuccess();
  };

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold text-nephro-dark mb-4">Track Health</h2>
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-nephro-dark">Today's Completion Metrics</p>
          <Target size={16} className="text-nephro-primary" />
        </div>
        <p className="text-xs text-gray-600">
          Tumefika {dailyProgress?.progress?.completedCount ?? 0}/{dailyProgress?.progress?.totalActions ?? 3} actions ({dailyProgress?.progress?.progressPercent ?? 0}%)
        </p>
        <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-nephro-primary rounded-full transition-all"
            style={{ width: `${dailyProgress?.progress?.progressPercent ?? 0}%` }}
          />
        </div>
        <div className="mt-3 space-y-2">
          {(dailyProgress?.history || []).slice(0, 3).map((item) => (
            <div key={item.id} className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              {item.title} completed at {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          ))}
          {(!dailyProgress?.history || dailyProgress.history.length === 0) && (
            <div className="text-xs text-gray-500">No quick actions completed yet today. Tap Done on Home to start.</div>
          )}
        </div>
      </div>
      <div className="bg-nephro-bg border border-nephro-accentLight/40 rounded-2xl p-4 mb-5">
        <p className="text-sm font-bold text-nephro-dark">Daily Quick Check-In</p>
        <div className="flex items-center gap-2 mt-2">
          {['😄', '🙂', '😐', '😟'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={`w-9 h-9 rounded-full text-lg ${mood === m ? 'bg-nephro-primary text-white' : 'bg-white border border-gray-200'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Pattern hint: swelling reported 3x this week? Consider messaging your care team.</p>
      </div>
      
      {/* Tabs */}
      <div className="flex bg-white rounded-lg p-1 shadow-sm mb-6 border border-gray-100">
        {['symptoms', 'vitals', 'food', 'medications'].map(t => (
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

        {activeTab === 'vitals' && (
          <div className="space-y-4">
            <form onSubmit={submitWeight} className="space-y-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-bold text-nephro-dark uppercase tracking-wider">Weight Tracking</p>
              <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
                <input type="number" step="0.1" required value={weight.value} onChange={(e) => setWeight({...weight, value: e.target.value})} className="w-full p-4 bg-transparent outline-none text-xl font-bold" placeholder="0.0" />
                <select value={weight.unit} onChange={(e) => setWeight({...weight, unit: e.target.value})} className="bg-transparent px-4 font-semibold text-gray-500 outline-none border-l border-gray-200">
                  <option>kg</option>
                  <option>lbs</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-nephro-dark text-white font-bold py-3 rounded-xl flex items-center justify-center">
                <PlusCircle size={18} className="mr-2" /> Log Weight
              </button>
            </form>

            <form onSubmit={submitBloodPressure} className="space-y-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-bold text-nephro-dark uppercase tracking-wider">Blood Pressure</p>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" required value={bloodPressure.systolic} onChange={(e) => setBloodPressure({ ...bloodPressure, systolic: e.target.value })} placeholder="Systolic" className="w-full p-3 rounded-lg bg-white border border-gray-200 outline-none text-sm" />
                <input type="number" required value={bloodPressure.diastolic} onChange={(e) => setBloodPressure({ ...bloodPressure, diastolic: e.target.value })} placeholder="Diastolic" className="w-full p-3 rounded-lg bg-white border border-gray-200 outline-none text-sm" />
                <input type="number" value={bloodPressure.pulse} onChange={(e) => setBloodPressure({ ...bloodPressure, pulse: e.target.value })} placeholder="Pulse" className="w-full p-3 rounded-lg bg-white border border-gray-200 outline-none text-sm" />
              </div>
              <button type="submit" className="w-full bg-nephro-dark text-white font-bold py-3 rounded-xl flex items-center justify-center">
                <PlusCircle size={18} className="mr-2" /> Log BP
              </button>
            </form>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700">Fluid Intake Quick Log</p>
              <div className="flex gap-2 mt-2">
                {[250, 500].map((ml) => (
                  <button key={ml} type="button" onClick={() => quickLogFluid(ml)} className="flex-1 py-2 rounded-lg bg-white border border-blue-100 text-blue-700 text-sm font-semibold">
                    +{ml}ml
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'food' && (
          <form onSubmit={(e) => { e.preventDefault(); setFoodLog({ meal: '', notes: '' }); showSuccess(); }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Meal</label>
              <input type="text" value={foodLog.meal} onChange={(e) => setFoodLog({ ...foodLog, meal: e.target.value })} className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 outline-none text-sm" placeholder="e.g. Grilled fish + vegetables" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Notes</label>
              <textarea value={foodLog.notes} onChange={(e) => setFoodLog({ ...foodLog, notes: e.target.value })} rows="3" className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 outline-none resize-none text-sm" placeholder="Potassium/sodium concerns, swaps, portion size..." />
            </div>
            <button type="submit" className="w-full bg-nephro-dark text-white font-bold py-3 rounded-xl flex items-center justify-center shadow-lg">
              <PlusCircle size={18} className="mr-2" /> Log Meal
            </button>
          </form>
        )}

        {activeTab === 'medications' && (
          <form onSubmit={submitMed} className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700">Visual Pill Organizer</p>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center text-[11px]">
                <div className="bg-white rounded-lg p-2 border border-blue-100"><Pill size={14} className="mx-auto mb-1 text-blue-600" />Morning</div>
                <div className="bg-white rounded-lg p-2 border border-blue-100"><Pill size={14} className="mx-auto mb-1 text-blue-600" />Noon</div>
                <div className="bg-white rounded-lg p-2 border border-blue-100"><Pill size={14} className="mx-auto mb-1 text-blue-600" />Evening</div>
              </div>
            </div>
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
            <div className="bg-green-50 border border-green-100 rounded-xl p-3">
              <p className="text-xs font-bold text-green-700">Why am I taking this?</p>
              <p className="text-xs text-green-800 mt-1">Common kidney medications help control blood pressure, reduce protein leakage, and protect kidney function.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Side Effect Logger</label>
              <select value={sideEffect} onChange={(e) => setSideEffect(e.target.value)} className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 outline-none text-sm">
                <option>None</option>
                <option>Dizziness</option>
                <option>Nausea</option>
                <option>Swelling</option>
                <option>Rash</option>
              </select>
              {sideEffect === 'Swelling' && (
                <p className="text-xs text-red-600 font-semibold mt-2">Concerning side effect detected. Please notify your doctor today.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">OTC Interaction Check</label>
              <input
                type="text"
                value={otcName}
                onChange={(e) => setOtcName(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 outline-none text-sm"
                placeholder="e.g. Ibuprofen"
              />
              {otcName.toLowerCase().includes('ibuprofen') && (
                <div className="mt-2 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg p-2 flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5" />
                  NSAIDs like ibuprofen can stress kidneys. Confirm with your care team before use.
                </div>
              )}
            </div>
            <button type="submit" className="w-full bg-nephro-dark text-white font-bold py-3 rounded-xl flex items-center justify-center shadow-lg active:scale-95 mt-2">
              <PlusCircle size={18} className="mr-2" /> Add Medication
            </button>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-700 mb-2">Recent Medication Logs</p>
              {(medicationLogs || []).slice(-3).reverse().map((m) => (
                <p key={m.id} className="text-xs text-gray-600">{m.name} {m.dose} at {m.time || '--:--'}</p>
              ))}
              {(!medicationLogs || medicationLogs.length === 0) && <p className="text-xs text-gray-500">No medication logs yet.</p>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Track;
