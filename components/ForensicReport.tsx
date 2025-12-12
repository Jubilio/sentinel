import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { EvidencePackage, formatForensicReport, exportAsJSON, verifyPackageIntegrity } from '../services/forensicService';

interface ForensicReportProps {
  evidencePackage: EvidencePackage;
  onClose: () => void;
}

const ForensicReport: React.FC<ForensicReportProps> = ({ evidencePackage, onClose }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'json' | 'text'>('summary');
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; details: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Verify package integrity on load
    verifyPackageIntegrity(evidencePackage).then(setVerificationResult);
  }, [evidencePackage]);

  const handleDownloadJSON = () => {
    const json = exportAsJSON(evidencePackage);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${evidencePackage.caseId}_evidence.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    const report = formatForensicReport(evidencePackage);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${evidencePackage.caseId}_report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadScreenshot = () => {
    if (!evidencePackage.content.screenshotBase64) return;
    const a = document.createElement('a');
    a.href = `data:image/jpeg;base64,${evidencePackage.content.screenshotBase64}`;
    a.download = `${evidencePackage.caseId}_screenshot.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Icons.Shield className="w-7 h-7 text-green-400" />
              Forensic Evidence Package
            </h2>
            <p className="text-slate-400 mt-1 font-mono text-sm">{evidencePackage.caseId}</p>
          </div>
          <div className="flex items-center gap-4">
            {verificationResult && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                verificationResult.valid 
                  ? 'bg-green-900/30 text-green-400 border border-green-800' 
                  : 'bg-red-900/30 text-red-400 border border-red-800'
              }`}>
                {verificationResult.valid ? <Icons.CheckCircle className="w-4 h-4" /> : <Icons.Alert className="w-4 h-4" />}
                {verificationResult.valid ? 'Verified' : 'Modified'}
              </div>
            )}
            <button 
              onClick={onClose}
              aria-label="Close forensic report"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Icons.Close className="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700">
          {(['summary', 'json', 'text'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-brand-500 bg-slate-800/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'summary' ? 'Summary' : tab === 'json' ? 'JSON Data' : 'Text Report'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Screenshot Preview */}
                {evidencePackage.content.screenshotBase64 && (
                  <div className="bg-slate-800 rounded-lg overflow-hidden">
                    <div className="p-3 border-b border-slate-700 flex justify-between items-center">
                      <span className="text-sm font-medium text-white">Captured Screenshot</span>
                      <button
                        onClick={handleDownloadScreenshot}
                        className="text-xs text-brand-400 hover:text-brand-300"
                      >
                        Download
                      </button>
                    </div>
                    <img 
                      src={`data:image/jpeg;base64,${evidencePackage.content.screenshotBase64}`} 
                      alt="Evidence screenshot" 
                      className="w-full"
                    />
                  </div>
                )}

                {/* Analysis Results */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">AI Analysis Results</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Nudity Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${evidencePackage.analysis.nudityScore > 70 ? 'bg-red-500' : evidencePackage.analysis.nudityScore > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${evidencePackage.analysis.nudityScore}%` }}
                          />
                        </div>
                        <span className="text-white font-mono text-sm">{evidencePackage.analysis.nudityScore}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Risk Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${evidencePackage.analysis.riskScore > 70 ? 'bg-red-500' : evidencePackage.analysis.riskScore > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${evidencePackage.analysis.riskScore}%` }}
                          />
                        </div>
                        <span className="text-white font-mono text-sm">{evidencePackage.analysis.riskScore}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Confidence</span>
                      <span className="text-white font-mono text-sm">{evidencePackage.analysis.confidence}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Method</span>
                      <span className="px-2 py-1 bg-brand-900/30 text-brand-400 rounded text-xs">
                        {evidencePackage.analysis.method === 'gemini' ? 'Gemini Vision' : 'TensorFlow NSFWJS'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Content Details */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Content Details</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-slate-500 block mb-1">URL</span>
                      <span className="text-slate-300 font-mono break-all">{evidencePackage.content.url}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Platform</span>
                      <span className="text-white">{evidencePackage.content.platform}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Page Title</span>
                      <span className="text-slate-300">{evidencePackage.content.pageTitle || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Captured At</span>
                      <span className="text-white font-mono">{evidencePackage.generatedAt}</span>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Hashes */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Lock className="w-4 h-4 text-green-400" />
                    Cryptographic Verification
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(evidencePackage.hashes).filter(([_, v]) => v).map(([key, value]) => (
                      <div key={key} className="group">
                        <span className="text-slate-500 text-xs uppercase">{key.replace('Hash', ' Hash')}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs text-green-400 font-mono bg-slate-900 px-2 py-1 rounded flex-1 truncate">
                            {value}
                          </code>
                          <button
                            onClick={() => handleCopyHash(value as string)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded transition-all"
                            aria-label="Copy hash"
                          >
                            <Icons.Copy className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {copied && <p className="text-xs text-green-400 mt-2">Hash copied to clipboard!</p>}
                </div>

                {/* Chain of Custody */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Chain of Custody</h3>
                  <div className="space-y-2">
                    {evidencePackage.chainOfCustody.map((entry, i) => (
                      <div key={i} className="flex items-start gap-3 text-xs">
                        <div className="w-2 h-2 rounded-full bg-brand-500 mt-1" />
                        <div>
                          <span className="text-slate-400 font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                          <span className="mx-2 text-slate-600">|</span>
                          <span className="text-white">{entry.action}</span>
                          {entry.details && <span className="text-slate-500"> — {entry.details}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <pre className="bg-slate-950 rounded-lg p-4 text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
              {exportAsJSON(evidencePackage)}
            </pre>
          )}

          {activeTab === 'text' && (
            <pre className="bg-slate-950 rounded-lg p-4 text-sm text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {formatForensicReport(evidencePackage)}
            </pre>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={handleDownloadJSON}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-500 rounded-lg text-white font-medium transition-colors"
          >
            <Icons.Download className="w-5 h-5" />
            Download JSON
          </button>
          <button
            onClick={handleDownloadReport}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium transition-colors"
          >
            <Icons.FileText className="w-5 h-5" />
            Download Report
          </button>
          {evidencePackage.content.screenshotBase64 && (
            <button
              onClick={handleDownloadScreenshot}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
            >
              <Icons.EyeOff className="w-5 h-5" />
              Download Screenshot
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForensicReport;
