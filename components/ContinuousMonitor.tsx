import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../constants';
import {
  getProtectedAssets,
  addProtectedAsset,
  deleteProtectedAsset,
  getAlerts,
  markAlertRead,
  clearAllAlerts,
  runMonitoringScan,
  getScanHistory,
  MONITORING_TARGETS,
  ProtectedAsset,
  ContentAlert,
  MonitoringSession
} from '../services/monitoringService';

const ContinuousMonitor: React.FC = () => {
  const [assets, setAssets] = useState<ProtectedAsset[]>([]);
  const [alerts, setAlerts] = useState<ContentAlert[]>([]);
  const [scanSession, setScanSession] = useState<MonitoringSession | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'alerts' | 'targets'>('assets');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setAssets(getProtectedAssets());
    setAlerts(getAlerts());
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await addProtectedAsset(file);
        loadData();
      } catch (error) {
        console.error('Failed to add asset:', error);
      }
    }
  }, []);

  const handleDeleteAsset = (assetId: string) => {
    if (confirm('Are you sure you want to remove this protected asset?')) {
      deleteProtectedAsset(assetId);
      loadData();
    }
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanSession(null);
    
    await runMonitoringScan((session) => {
      setScanSession({ ...session });
    });
    
    setIsScanning(false);
    loadData();
  };

  const handleMarkRead = (alertId: string) => {
    markAlertRead(alertId);
    loadData();
  };

  const handleClearAlerts = () => {
    if (confirm('Clear all alerts?')) {
      clearAllAlerts();
      loadData();
    }
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Icons.Shield className="w-7 h-7 text-green-400" />
          Continuous Monitoring
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Automated scanning for re-uploads of your protected content
        </p>
      </header>

      {/* Scan Control Panel */}
      <div className="bg-slate-850 rounded-xl border border-slate-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Monitoring Status</h2>
            <p className="text-sm text-slate-400">
              {assets.length} protected assets • {MONITORING_TARGETS.filter(t => t.enabled).length} target sites
            </p>
          </div>
          <button
            onClick={handleStartScan}
            disabled={isScanning || assets.length === 0}
            className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isScanning ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Icons.Search className="w-5 h-5" />
                Start Manual Scan
              </>
            )}
          </button>
        </div>

        {/* Scan Progress */}
        {scanSession && (
          <div className="bg-slate-800 rounded-lg p-4 mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-300">
                {scanSession.status === 'scanning' ? `Scanning: ${scanSession.currentTarget}` : 'Scan Complete'}
              </span>
              <span className="text-sm text-white font-mono">{scanSession.progress}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  scanSession.status === 'completed' 
                    ? scanSession.matchesFound > 0 ? 'bg-red-500' : 'bg-green-500'
                    : 'bg-brand-500'
                }`}
                style={{ width: `${scanSession.progress}%` }}
              />
            </div>
            {scanSession.status === 'completed' && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="text-slate-400">
                  Scanned: {scanSession.targetsScanned} targets
                </span>
                <span className={scanSession.matchesFound > 0 ? 'text-red-400 font-semibold' : 'text-green-400'}>
                  Matches: {scanSession.matchesFound}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {[
          { id: 'assets' as const, label: 'Protected Assets', count: assets.length },
          { id: 'alerts' as const, label: 'Alerts', count: unreadCount },
          { id: 'targets' as const, label: 'Target Sites', count: MONITORING_TARGETS.filter(t => t.enabled).length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-green-500 bg-slate-800/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                tab.id === 'alerts' && tab.count > 0
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          {/* Upload */}
          <div className="bg-slate-850 rounded-xl border-2 border-dashed border-slate-600 p-8">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
              id="monitor-upload"
              aria-label="Upload content to protect"
            />
            <label htmlFor="monitor-upload" className="cursor-pointer block text-center">
              <Icons.Upload className="w-12 h-12 mx-auto mb-4 text-slate-500" />
              <p className="text-slate-300 font-medium">Add Content to Protect</p>
              <p className="text-xs text-slate-500 mt-1">
                Upload your original image or video to generate protective hashes
              </p>
            </label>
          </div>

          {/* Asset List */}
          {assets.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Icons.EyeOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No protected assets yet</p>
              <p className="text-xs mt-2">Upload content above to start monitoring</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map(asset => (
                <div key={asset.id} className="bg-slate-850 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="aspect-video bg-slate-900 relative">
                    <img 
                      src={asset.thumbnailUrl} 
                      alt={asset.filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        asset.monitoringEnabled 
                          ? 'bg-green-900/80 text-green-400'
                          : 'bg-slate-800/80 text-slate-400'
                      }`}>
                        {asset.monitoringEnabled ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-white truncate">{asset.filename}</h3>
                    <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                      <span>Matches: {asset.matchCount}</span>
                      <span>{asset.lastScanned ? `Last: ${new Date(asset.lastScanned).toLocaleDateString()}` : 'Never scanned'}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="flex-1 py-2 border border-red-800 text-red-400 hover:bg-red-900/20 rounded text-sm transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleClearAlerts}
                className="text-sm text-slate-400 hover:text-white"
              >
                Clear All
              </button>
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Icons.CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No alerts</p>
              <p className="text-xs mt-2">You'll see notifications here when matches are found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div 
                  key={alert.id}
                  onClick={() => !alert.read && handleMarkRead(alert.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    alert.severity === 'critical'
                      ? 'bg-red-900/20 border-red-800 hover:border-red-700'
                      : alert.severity === 'warning'
                      ? 'bg-amber-900/20 border-amber-800 hover:border-amber-700'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  } ${!alert.read ? 'ring-1 ring-white/10' : 'opacity-70'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      alert.severity === 'critical' ? 'bg-red-600' :
                      alert.severity === 'warning' ? 'bg-amber-600' : 'bg-slate-600'
                    }`}>
                      <Icons.Alert className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className={`font-medium ${
                          alert.severity === 'critical' ? 'text-red-300' :
                          alert.severity === 'warning' ? 'text-amber-300' : 'text-white'
                        }`}>
                          {alert.title}
                        </h3>
                        <span className="text-xs text-slate-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{alert.description}</p>
                      {alert.matchUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded">
                            {alert.similarity}% match
                          </span>
                          <span className="text-xs text-slate-500 truncate">{alert.targetSite}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Targets Tab */}
      {activeTab === 'targets' && (
        <div className="space-y-4">
          <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-300">
              <strong>Demo Mode:</strong> These are simulated target sites for demonstration. 
              In production, this would integrate with actual crawling infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MONITORING_TARGETS.map(target => (
              <div 
                key={target.id}
                className={`p-4 rounded-lg border ${
                  target.enabled 
                    ? 'bg-slate-800/50 border-slate-700'
                    : 'bg-slate-900/50 border-slate-800 opacity-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-white">{target.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        target.riskLevel === 'high' ? 'bg-red-900/50 text-red-400' :
                        target.riskLevel === 'medium' ? 'bg-amber-900/50 text-amber-400' :
                        'bg-green-900/50 text-green-400'
                      }`}>
                        {target.riskLevel}
                      </span>
                      <span className="text-xs text-slate-500">{target.category}</span>
                    </div>
                  </div>
                  <span className={`text-xs ${target.enabled ? 'text-green-400' : 'text-slate-500'}`}>
                    {target.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
        <h3 className="font-semibold text-white mb-3">How It Works</h3>
        <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
          <li>Upload your original content to generate protective hashes</li>
          <li>The system creates unique pHash/dHash fingerprints</li>
          <li>Periodic scans compare these hashes against content on monitored sites</li>
          <li>You receive instant alerts when potential matches are detected</li>
        </ol>
      </div>
    </div>
  );
};

export default ContinuousMonitor;
