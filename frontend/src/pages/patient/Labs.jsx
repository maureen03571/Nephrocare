import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

const getLabStatus = (value, low, high) => {
  if (value === null || value === undefined) return 'unknown';
  if (value < low || value > high) return 'high-risk';
  if (value < low + ((high - low) * 0.15) || value > high - ((high - low) * 0.15)) return 'watch';
  return 'good';
};

const Labs = () => {
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [form, setForm] = useState({ gfr: '', creatinine: '', potassium: '', phosphorus: '', reportName: '' });

  const loadLabs = async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/patient/${user.id}/labs`);
      setLabs(res.data.labs || []);
    } catch (error) {
      console.error('Failed to load labs', error);
    }
  };

  useEffect(() => {
    loadLabs();
  }, [user?.id]);

  const latest = labs[0];
  const gfrTrend = useMemo(() => labs.slice(0, 5).map((l) => l.gfr).reverse(), [labs]);

  const submitLab = async (e) => {
    e.preventDefault();
    await axios.post(`${API_BASE_URL}/api/patient/${user.id}/labs`, form);
    setForm({ gfr: '', creatinine: '', potassium: '', phosphorus: '', reportName: '' });
    await loadLabs();
  };

  return (
    <div className="p-5 space-y-4">
      <h2 className="text-2xl font-bold text-nephro-dark">Lab Results</h2>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-nephro-dark">Traffic Light Summary</p>
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <TrafficCard label="GFR" value={latest?.gfr} status={getLabStatus(latest?.gfr, 45, 90)} />
          <TrafficCard label="Creatinine" value={latest?.creatinine} status={getLabStatus(latest?.creatinine, 0.6, 1.3)} />
          <TrafficCard label="Potassium" value={latest?.potassium} status={getLabStatus(latest?.potassium, 3.5, 5.1)} />
          <TrafficCard label="Phosphorus" value={latest?.phosphorus} status={getLabStatus(latest?.phosphorus, 2.5, 4.5)} />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-nephro-dark">GFR Trend</p>
        <p className="text-xs text-gray-500 mt-1">Recent values: {gfrTrend.length ? gfrTrend.join(' → ') : 'No data yet'}</p>
      </div>

      <form onSubmit={submitLab} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-sm font-bold text-nephro-dark">Upload Lab Report (manual entry)</p>
        <input value={form.reportName} onChange={(e) => setForm({ ...form, reportName: e.target.value })} placeholder="Report name (optional)" className="w-full p-3 rounded-lg border border-gray-200 text-sm outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <input required type="number" step="0.1" value={form.gfr} onChange={(e) => setForm({ ...form, gfr: e.target.value })} placeholder="GFR" className="p-3 rounded-lg border border-gray-200 text-sm outline-none" />
          <input required type="number" step="0.1" value={form.creatinine} onChange={(e) => setForm({ ...form, creatinine: e.target.value })} placeholder="Creatinine" className="p-3 rounded-lg border border-gray-200 text-sm outline-none" />
          <input type="number" step="0.1" value={form.potassium} onChange={(e) => setForm({ ...form, potassium: e.target.value })} placeholder="Potassium" className="p-3 rounded-lg border border-gray-200 text-sm outline-none" />
          <input type="number" step="0.1" value={form.phosphorus} onChange={(e) => setForm({ ...form, phosphorus: e.target.value })} placeholder="Phosphorus" className="p-3 rounded-lg border border-gray-200 text-sm outline-none" />
        </div>
        <button type="submit" className="w-full bg-nephro-primary text-white font-bold py-3 rounded-xl">Save Lab Result</button>
      </form>
    </div>
  );
};

const TrafficCard = ({ label, value, status }) => {
  const color = status === 'good' ? 'bg-green-100 text-green-700' : status === 'watch' ? 'bg-yellow-100 text-yellow-700' : status === 'high-risk' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';
  return (
    <div className={`rounded-xl p-3 border border-gray-100 ${color}`}>
      <p className="font-bold">{label}</p>
      <p className="mt-1">{value ?? '--'}</p>
    </div>
  );
};

export default Labs;
