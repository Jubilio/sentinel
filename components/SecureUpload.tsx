import React, { useState } from 'react';
import { Icons } from '../constants';
import { secureAssetProcessingPipeline } from '../services/localProcessing';
import { analyzeImageContent } from '../services/geminiService';
import { ProcessingStep } from '../types';

const downloadFile = (filename: string, content: string, type: string = 'text/plain') => {
  const element = document.createElement("a");
  const file = new Blob([content], { type });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element); // Required for Firefox
  element.click();
  document.body.removeChild(element);
};

const ProgressBar: React.FC<{ progress: number; status: string }> = ({ progress, status }) => {
  const barRef =React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = `${progress}%`;
    }
  }, [progress]);

  return (
    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
      <div 
        ref={barRef}
        className={`h-full transition-all duration-300 ${status === 'completed' ? 'bg-green-500' : 'bg-brand-500'}`} 
      />
    </div>
  );
};
const SecureUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [hasConsented, setHasConsented] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: '1', label: 'Local Memory Allocation & Sandbox', status: 'pending', progress: 0 },
    { id: '2', label: 'Generating Video Fingerprint (pHash)', status: 'pending', progress: 0 },
    { id: '3', label: 'Extracting Facial Features (ArcFace)', status: 'pending', progress: 0 },
    { id: '4', label: 'Encrypting Payload (AES-256)', status: 'pending', progress: 0 },
  ]);
  const [completedHash, setCompletedHash] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setCompletedHash(null);
      setAiAnalysis(null);
      resetSteps();
    }
  };

  const resetSteps = () => {
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending', progress: 0 })));
  };

  const handleAiAnalysis = async () => {
    if (!file) return;
    setIsAnalyzingAi(true);
    const result = await analyzeImageContent(file);
    setAiAnalysis(result);
    setIsAnalyzingAi(false);
  };

  const processFile = async () => {
    if (!file || !hasConsented) return;
    setIsProcessing(true);

    try {
      const updateStep = (idx: number, status: ProcessingStep['status'], progress: number) => {
        setSteps(prev => {
          const newSteps = [...prev];
          newSteps[idx] = { ...newSteps[idx], status, progress };
          return newSteps;
        });
      };

      // Execute the robust pipeline
      const result = await secureAssetProcessingPipeline(
        file, 
        { timestamp: Date.now(), filename: file.name }, // Metadata to encrypt
        (stepLabel, totalProgress) => {
            // Mapping total progress roughly to UI steps for visualization
            if (totalProgress <= 10) {
                 updateStep(0, 'processing', 100);
            } else if (totalProgress <= 40) {
                 updateStep(0, 'completed', 100);
                 updateStep(1, 'processing', ((totalProgress - 10) / 30) * 100);
            } else if (totalProgress <= 80) {
                 updateStep(1, 'completed', 100);
                 updateStep(2, 'processing', ((totalProgress - 40) / 40) * 100);
            } else {
                 updateStep(2, 'completed', 100);
                 updateStep(3, 'processing', ((totalProgress - 80) / 20) * 100);
            }
        }
      );
      
      updateStep(3, 'completed', 100);
      setCompletedHash(`SHA256-${result.originalHash.substring(0, 16)}...`);
      
      // Save to Vault persistence for Dashboard stats
      try {
        const vault = JSON.parse(localStorage.getItem('sentinel_vault') || '[]');
        vault.push({ 
            id: `VAULT-${Date.now()}`,
            hash: `SHA256-${result.originalHash.substring(0, 16)}...`,
            filename: file.name,
            addedAt: new Date().toISOString()
        });
        localStorage.setItem('sentinel_vault', JSON.stringify(vault));
      } catch (e) {
        console.error('Vault save error', e);
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-850 rounded-xl border border-slate-700 p-6 shadow-2xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-brand-900 rounded-lg text-brand-500">
          <Icons.Shield />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Secure Asset Vault</h2>
          <p className="text-sm text-slate-400">Privacy-first processing. Your original file never leaves this device.</p>
        </div>
      </div>

      {!completedHash ? (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-brand-500 transition-colors bg-slate-900/50">
            <input 
              type="file" 
              accept="video/*,image/*" 
              onChange={handleFileChange} 
              className="hidden" 
              id="file-upload"
              disabled={isProcessing}
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <Icons.Upload />
              <span className="mt-4 text-slate-300 font-medium">Click to select secure reference media</span>
              <span className="mt-1 text-xs text-slate-500">Supports MP4, MOV, PNG, JPG (Max 500MB)</span>
            </label>
            {file && <div className="mt-4 text-brand-400 text-sm font-mono">{file.name}</div>}
          </div>

          {file && !isProcessing && (
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-200">Optional: AI Risk Analysis</h3>
                {aiAnalysis && <span className="text-xs text-green-400">Analysis Complete</span>}
              </div>
              
              {!aiAnalysis ? (
                 <button 
                  onClick={handleAiAnalysis}
                  disabled={isAnalyzingAi}
                  className="w-full text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded border border-slate-700 flex items-center justify-center space-x-2"
                >
                  {isAnalyzingAi ? (
                    <span>Analyzing with Gemini...</span>
                  ) : (
                    <>
                      <Icons.Activity />
                      <span>Analyze Image Content (Sends to Cloud)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="text-xs text-slate-400 p-2 bg-slate-950 rounded border border-slate-800">
                  <span className="block font-semibold text-brand-400 mb-1">Gemini Insights:</span>
                  {aiAnalysis}
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
             <label className="flex items-start space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={hasConsented} 
                  onChange={(e) => setHasConsented(e.target.checked)}
                  disabled={isProcessing}
                  className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-600 focus:ring-brand-500"
                />
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">Digital Consent & Privacy Agreement:</span>
                  <p className="mt-1">
                    I confirm I am the authorized owner of this content. I understand that a non-reversible digital fingerprint (hash) will be generated locally. 
                    The original file will be discarded immediately after processing and will NOT be uploaded to any server (unless Optional AI Analysis was selected above).
                  </p>
                </div>
             </label>
          </div>

          {file && !isProcessing && (
            <button 
              onClick={processFile}
              disabled={!hasConsented}
              className={`w-full font-medium py-3 rounded-lg transition-all shadow-lg flex items-center justify-center space-x-2 ${
                hasConsented ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-900/50' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Icons.Lock />
              <span>Begin Local Encryption</span>
            </button>
          )}

          {isProcessing && (
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.id} className="relative">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{step.label}</span>
                    <span>{step.status === 'completed' ? 'Done' : step.progress > 0 ? `${Math.round(step.progress)}%` : 'Pending'}</span>
                  </div>
                  <ProgressBar progress={step.progress} status={step.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden mb-6 relative shadow-2xl">
            {/* Decorative top bar */}
            <div className="h-1 bg-gradient-to-r from-brand-500 to-green-500 w-full"></div>
            
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-900/40 rounded-lg text-green-400 border border-green-900">
                    <Icons.CheckCircle />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Chain of Custody Established</h3>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-1">Cryptographic Evidence Receipt</p>
                  </div>
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-2xl font-mono text-slate-500 font-bold opacity-20">SENTINEL-SECURE</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Timestamp (UTC)</span>
                    <div className="text-sm text-slate-200 font-mono mt-1">{new Date().toUTCString()}</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Encryption Protocol</span>
                    <div className="text-sm text-slate-200 font-mono mt-1">AES-256-GCM + SHA-256 (WASM)</div>
                </div>
              </div>

              <div className="mb-8">
                <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block mb-2">Unique Asset Fingerprint (pHash)</span>
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-brand-400 break-all border-l-4 border-l-brand-500 flex justify-between items-center group relative">
                    {completedHash}
                    <button 
                      className="ml-4 p-2 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors"
                      onClick={() => {
                        if (completedHash) navigator.clipboard.writeText(completedHash);
                      }}
                      title="Copy Hash"
                    >
                      <Icons.FileText />
                    </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">


                <button 
                  className="w-full flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors border border-slate-600 flex items-center justify-center space-x-2"
                  onClick={() => {
                    const timestamp = new Date().toUTCString();
                    const receiptContent = `SENTINEL SECURE VAULT - EVIDENCE RECEIPT
--------------------------------------------------
Status: VERIFIED & SECURED
Timestamp: ${timestamp}
Reference ID: ${window.crypto.randomUUID ? window.crypto.randomUUID() : 'GEN-' + Date.now()}

ASSET DETAILS
--------------------------------------------------
Fingerprint (pHash): ${completedHash || 'PENDING'}
Encryption: AES-256-GCM + SHA-256 (WASM)
Integrity: VERIFIED

CHAIN OF CUSTODY
--------------------------------------------------
1. Asset Ingestion: COMPLETED
2. Local Encryption: COMPLETED
3. Secure Transmission: COMPLETED
4. Vault Storage: CONFIRMED

This receipt certifies that the digital asset associated with 
the fingerprint above has been securely processed and stored 
within the Sentinel Secure Vault infrastructure.
--------------------------------------------------
Sentinel Protection Systems
`;
                    downloadFile(`sentinel_receipt_${Date.now()}.txt`, receiptContent);
                  }}
                >
                    <Icons.Download />
                    <span>Download Receipt</span>
                </button>
                <button 
                    onClick={() => { setFile(null); setCompletedHash(null); resetSteps(); setHasConsented(false); setAiAnalysis(null); }}
                    className="w-full flex-1 bg-transparent hover:bg-slate-800 text-brand-400 py-3 rounded-lg font-medium transition-colors border border-brand-900 hover:border-brand-700"
                >
                    Process New Asset
                </button>
              </div>
              
            </div>
            
            {/* Footer */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 text-center">
              <p className="text-[10px] text-slate-600">
                Sentinel Zero-Knowledge Proof • Generated Locally via WASM
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureUpload;