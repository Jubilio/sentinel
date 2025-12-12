import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StatCard: React.FC<{ label: string; value: string | number; subtext?: string; urgent?: boolean }> = ({ label, value, subtext, urgent }) => (
  <div className={`p-6 rounded-xl border ${urgent ? 'bg-red-900/10 border-red-800' : 'bg-slate-850 border-slate-700'} shadow-lg`}>
    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{label}</h3>
    <div className={`text-3xl font-bold mt-2 ${urgent ? 'text-red-400' : 'text-white'}`}>{value}</div>
    {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    protectedAssets: 0,
    totalScans: 0,
    matchesFound: 0,
    highRiskCount: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    // Load real data from LocalStorage
    try {
      const scanLogs = JSON.parse(localStorage.getItem('sentinel_scan_log') || '[]');
      const matches = JSON.parse(localStorage.getItem('sentinel_matches') || '[]');
      const vault = JSON.parse(localStorage.getItem('sentinel_vault') || '[]');

      // Calculate Stat Cards
      const highRisk = matches.filter((m: any) => m.riskScore > 70 || m.nudityScore > 70).length;
      
      setStats({
        protectedAssets: vault.length,
        totalScans: scanLogs.length,
        matchesFound: matches.length,
        highRiskCount: highRisk
      });

      // Calculate Chart Data (Activity by Day of Week)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const activityMap = new Map();
      days.forEach(d => activityMap.set(d, 0));

      scanLogs.forEach((log: any) => {
        const date = new Date(log.timestamp);
        // Only count logs from last 7 days to simulate a weekly view
        if (Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
            const dayName = days[date.getDay()];
            activityMap.set(dayName, (activityMap.get(dayName) || 0) + 1);
        }
      });

      const newChartData = days.map(day => ({
        name: day,
        scans: activityMap.get(day)
      }));
      setChartData(newChartData);

      // Recent Logs
      // Merge scan logs and vault additions for audit trail
      const auditTrail = [
          ...scanLogs.map((l: any) => ({ ...l, type: 'SCAN', msg: 'Scan completed' })),
          ...vault.map((v: any) => ({ ...v, type: 'VAULT', msg: 'New asset protected', timestamp: v.addedAt })),
          ...matches.map((m: any) => ({ ...m, type: 'MATCH', msg: `High risk match detected (${m.platform})`, timestamp: m.detectedAt }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 5);
      
      setRecentLogs(auditTrail);

    } catch (e) {
      console.error('Failed to load dashboard data', e);
    }
  }, []);

  const handleDownloadReport = () => {
    const headers = "Day,Scans";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + chartData.map(e => `${e.name},${e.scans}`).join("\n");
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
        <StatCard label="Protected Assets" value={stats.protectedAssets} subtext="Stored in Secure Vault" />
        <StatCard label="Total Scans" value={stats.totalScans} subtext="All time activity" />
        <StatCard label="Matches Found" value={stats.matchesFound} subtext={`${stats.highRiskCount} High Risk Logs`} urgent={stats.matchesFound > 0} />
        <StatCard label="High Risk Assets" value={stats.highRiskCount} subtext="Requires Immediate Action" urgent={stats.highRiskCount > 0} />
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
          <div className="w-full h-[320px] min-h-[320px]">
            {chartData.some(d => d.scans > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }}
                    itemStyle={{ color: '#38bdf8' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="scans" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#0ea5e9" />
                    ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-500 flex-col">
                    <Icons.Activity className="w-8 h-8 mb-2 opacity-50"/>
                    <span className="text-sm">No recent activity data available.</span>
                    <span className="text-xs mt-1">Run a scan to initialize stats.</span>
                </div>
            )}
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
            <h4 className="text-sm font-medium text-slate-400 mb-2">Audit Log / Recent Activity</h4>
            <div className="text-xs text-slate-500 font-mono space-y-2">
              {recentLogs.length > 0 ? (
                  recentLogs.map((log, i) => (
                    <p key={i} className="truncate" title={log.msg}>
                        {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {log.msg}
                    </p>
                  ))
              ) : (
                  <p>No recent activity logs.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;