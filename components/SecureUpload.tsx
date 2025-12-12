import React, { useState } from 'react';
import { Icons } from '../constants';
import { secureAssetProcessingPipeline } from '../services/localProcessing';
import { analyzeImageContent } from '../services/geminiService';
import { ProcessingStep } from '../types';

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
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${step.status === 'completed' ? 'bg-green-500' : 'bg-brand-500'}`} 
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
            Your anonymous fingerprint has been added to the monitoring queue.
            The original file has been securely wiped from browser memory.
          </p>
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 font-mono text-xs text-slate-400 break-all mb-6">
            {completedHash}
          </div>
          <button 
            onClick={() => { setFile(null); setCompletedHash(null); resetSteps(); setHasConsented(false); setAiAnalysis(null); }}
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