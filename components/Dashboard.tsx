import React from 'react';
import { Icons } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { name: 'Mon', scans: 400 },
  { name: 'Tue', scans: 300 },
  { name: 'Wed', scans: 550 },
  { name: 'Thu', scans: 480 },
  { name: 'Fri', scans: 600 },
  { name: 'Sat', scans: 350 },
  { name: 'Sun', scans: 420 },
];

const StatCard: React.FC<{ label: string; value: string | number; subtext?: string; urgent?: boolean }> = ({ label, value, subtext, urgent }) => (
  <div className={`p-6 rounded-xl border ${urgent ? 'bg-red-900/10 border-red-800' : 'bg-slate-850 border-slate-700'} shadow-lg`}>
    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{label}</h3>
    <div className={`text-3xl font-bold mt-2 ${urgent ? 'text-red-400' : 'text-white'}`}>{value}</div>
    {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
  </div>
);

const Dashboard: React.FC = () => {
  const handleDownloadReport = () => {
    const headers = "Day,Scans";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + data.map(e => `${e.name},${e.scans}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `scan_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Protected Assets" value="3" subtext="Last updated 2m ago" />
        <StatCard label="Takedown Time" value="4h 12m" subtext="Avg. Time to Removal" />
        <StatCard label="Matches Found" value="12" subtext="3 High Risk Pending" urgent />
        <StatCard label="Success Rate" value="98.2%" subtext="0.5% False Positive Rate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-850 rounded-xl border border-slate-700 p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Scan Activity Volume</h3>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleDownloadReport}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded border border-slate-600 flex items-center space-x-1 transition-colors"
                title="Download Report"
              >
                <Icons.Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
              <span className="text-xs bg-brand-900/50 text-brand-400 px-2 py-1 rounded border border-brand-800">
                Live Monitor
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <BarChart data={data}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }}
                  itemStyle={{ color: '#38bdf8' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="scans" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#0ea5e9" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-850 rounded-xl border border-slate-700 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Network Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm text-slate-300">Crawler Nodes</span>
              </div>
              <span className="text-xs text-green-400">Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-3">
                <Icons.Globe />
                <span className="text-sm text-slate-300">StopNCII Feed</span>
              </div>
              <span className="text-xs text-brand-400">Connected (API)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-3">
                <Icons.Lock />
                <span className="text-sm text-slate-300">Milvus Vector DB</span>
              </div>
              <span className="text-xs text-green-400">Secure (TLS 1.3)</span>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-700">
            <h4 className="text-sm font-medium text-slate-400 mb-2">Audit Log</h4>
            <div className="text-xs text-slate-500 font-mono space-y-1">
              <p>10:42:01 - Scan batch #9923 completed</p>
              <p>10:15:22 - New asset registered (SHA-256)</p>
              <p>09:30:00 - Daily compliance report generated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;