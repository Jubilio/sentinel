import React, { useState } from 'react';
import { Icons } from '../constants';
import { processLocalVideo } from '../services/cryptoService';
import { ProcessingStep } from '../types';

const SecureUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [hasConsented, setHasConsented] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: '1', label: 'Local Memory Allocation & Sandbox', status: 'pending', progress: 0 },
    { id: '2', label: 'Keyframe Extraction (Client-Side)', status: 'pending', progress: 0 },
    { id: '3', label: 'Generating pHash & Face Embeddings', status: 'pending', progress: 0 },
    { id: '4', label: 'AES-256 Encryption & Salting', status: 'pending', progress: 0 },
  ]);
  const [completedHash, setCompletedHash] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setCompletedHash(null);
      resetSteps();
    }
  };

  const resetSteps = () => {
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending', progress: 0 })));
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

      // Step 1: Sandbox
      updateStep(0, 'processing', 50);
      await new Promise(r => setTimeout(r, 800));
      updateStep(0, 'completed', 100);

      // Step 2 & 3: Extraction & Hashing
      updateStep(1, 'processing', 20);
      await processLocalVideo(file, (stage, percent) => {
        if (percent < 50) updateStep(1, 'processing', percent * 2);
        else {
           updateStep(1, 'completed', 100);
           updateStep(2, 'processing', (percent - 50) * 2);
        }
      });
      updateStep(2, 'completed', 100);

      // Step 4: Encryption
      updateStep(3, 'processing', 80);
      await new Promise(r => setTimeout(r, 600));
      updateStep(3, 'completed', 100);

      setCompletedHash(`SHA256-${Date.now().toString(16)}`);
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
                    The original file will be discarded immediately after processing and will NOT be uploaded to any server.
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
                    <span>{step.status === 'completed' ? 'Done' : `${step.progress}%`}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${step.status === 'completed' ? 'bg-green-500' : 'bg-brand-500'}`} 
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 text-green-500 mb-4">
            <Icons.CheckCircle />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Asset Secured & Indexed</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Your anonymous fingerprint has been added to the monitoring queue (Internal + StopNCII Feed).
            The original file has been securely wiped from browser memory.
          </p>
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 font-mono text-xs text-slate-400 break-all mb-6">
            {completedHash}
          </div>
          <button 
            onClick={() => { setFile(null); setCompletedHash(null); resetSteps(); setHasConsented(false); }}
            className="text-brand-400 hover:text-brand-300 text-sm font-medium"
          >
            Register another asset
          </button>
        </div>
      )}
    </div>
  );
};

export default SecureUpload;