import React, { useState } from 'react';
import { Icons } from '../constants';
import { UrlAnalysisResult } from '../types';
import { generatePortugueseTakedown } from '../services/geminiService';

const UrlScanner: React.FC = () => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'preview' | 'matched' | 'generated'>('idle');
  const [isVictim, setIsVictim] = useState(false);
  const [analysis, setAnalysis] = useState<UrlAnalysisResult | null>(null);
  const [legalText, setLegalText] = useState('');
  const [loadingText, setLoadingText] = useState('');

  const handleAnalyze = async () => {
    if (!url) return;
    setStatus('analyzing');
    setLoadingText('Connecting to headless browser...');
    
    // Simulate network delays and processing
    await new Promise(r => setTimeout(r, 1000));
    setLoadingText('Extracting metadata and keyframes...');
    await new Promise(r => setTimeout(r, 1500));
    setLoadingText('Comparing hashes with local Secure Vault...');
    await new Promise(r => setTimeout(r, 1500));

    // Mock Result
    const platform = url.includes('facebook') ? 'Facebook' : url.includes('x.com') ? 'X (Twitter)' : 'Unknown Platform';
    const isMatch = true; // Simulating a match for demo

    setAnalysis({
      url,
      platform,
      detectedAt: new Date().toISOString(),
      thumbnailUrl: 'https://picsum.photos/400/225', // Mock
      metadata: {
        title: 'Video shared without consent',
        uploader: 'User_9928',
        views: '1,240'
      },
      matchResult: {
        isMatch,
        confidence: 96.5,
        vaultAssetId: 'VAULT-883920-SECURE',
        videoHashMatch: true,
        faceMatch: true
      }
    });

    setStatus('matched');
  };

  const handleGenerateLegal = async () => {
    if (!analysis) return;
    setLoadingText('Generating signed evidence package and legal text...');
    setStatus('analyzing'); // Reuse loading state
    
    const text = await generatePortugueseTakedown(analysis, isVictim);
    setLegalText(text);
    setStatus('generated');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Report & Remove URL</h1>
        <p className="text-slate-400 text-sm mt-1">
          Proactively validate a suspicious link against your secure vault and generate legal removal requests.
        </p>
      </header>

      {/* Input Section */}
      <div className="bg-slate-850 rounded-xl border border-slate-700 p-6 shadow-lg">
        <label className="block text-sm font-medium text-slate-300 mb-2">Paste Suspicious URL</label>
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Icons.Link />
            </div>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://facebook.com/..." 
              className="w-full pl-10 bg-slate-900 border border-slate-700 rounded-lg py-3 text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
              disabled={status !== 'idle' && status !== 'preview' && status !== 'matched'}
            />
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={status === 'analyzing' || !url}
            className="bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Icons.Search />
            <span>Analyze</span>
          </button>
        </div>

        {/* Victim Declaration */}
        <div className="mt-4 flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="victim-check"
              checked={isVictim}
              onChange={(e) => setIsVictim(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="victim-check" className="text-xs text-slate-400 cursor-pointer select-none">
                I declare that I am the victim (or authorized representative) in the content linked above.
            </label>
        </div>
      </div>

      {/* Loading State */}
      {status === 'analyzing' && (
        <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500 mb-4"></div>
            <p className="text-slate-400 text-sm animate-pulse">{loadingText}</p>
        </div>
      )}

      {/* Match Result */}
      {status === 'matched' && analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Found Content */}
          <div className="bg-slate-850 rounded-xl border border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center space-x-2">
                <Icons.Globe /> <span>External Content Found</span>
            </h3>
            <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden mb-4 relative">
                <img src={analysis.thumbnailUrl} alt="Preview" className="w-full h-full object-cover opacity-80" />
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                    {analysis.platform}
                </div>
            </div>
            <div className="space-y-2 text-xs text-slate-400">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span>Uploader</span>
                    <span className="text-slate-200">{analysis.metadata.uploader}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span>Views</span>
                    <span className="text-slate-200">{analysis.metadata.views}</span>
                </div>
                <div className="pt-2 text-amber-500 flex items-center space-x-1">
                    <Icons.Alert />
                    <span>Potential NCII Detected</span>
                </div>
            </div>
          </div>

          {/* Vault Comparison */}
          <div className="bg-slate-850 rounded-xl border border-brand-900/50 p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Icons.Shield />
             </div>
             <h3 className="text-sm font-semibold text-brand-400 mb-4 flex items-center space-x-2">
                <Icons.Lock /> <span>Secure Vault Match</span>
            </h3>
            
            <div className="space-y-6">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 text-center">
                    <span className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Confidence Score</span>
                    <span className="text-3xl font-bold text-white">{analysis.matchResult.confidence}%</span>
                </div>

                <div className="space-y-3">
                     <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Video Hash (pHash)</span>
                        <span className="text-green-500 font-mono flex items-center"><Icons.CheckCircle /> <span className="ml-1">MATCH</span></span>
                     </div>
                     <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Face Biometrics</span>
                        <span className="text-green-500 font-mono flex items-center"><Icons.CheckCircle /> <span className="ml-1">MATCH</span></span>
                     </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                    <button 
                        onClick={handleGenerateLegal}
                        disabled={!isVictim}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3 rounded-lg font-medium transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center space-x-2"
                    >
                         <Icons.FileText />
                         <span>Generate Portuguese Removal Request</span>
                    </button>
                    {!isVictim && (
                        <p className="text-center text-[10px] text-amber-500 mt-2">
                            * You must declare you are the victim to generate legal documents.
                        </p>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Legal Text */}
      {status === 'generated' && (
        <div className="bg-slate-850 rounded-xl border border-slate-700 p-6 animate-fade-in">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Evidence Package & Legal Notice</h3>
                <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-800">
                    Ready to Submit
                </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-2 uppercase">Copy/Paste to {analysis?.platform} Support</label>
                    <textarea 
                        className="w-full h-96 bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs font-mono text-slate-300 focus:outline-none resize-none"
                        readOnly
                        value={legalText}
                    />
                </div>
                <div className="space-y-4">
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <h4 className="text-sm font-medium text-white mb-2">Next Steps</h4>
                        <ol className="list-decimal list-inside text-xs text-slate-400 space-y-2">
                            <li>Copy the text on the left.</li>
                            <li>Use the link below to open the specific reporting form.</li>
                            <li>Attach the downloaded Evidence Package if allowed.</li>
                        </ol>
                    </div>

                    <a 
                        href="#" 
                        className="block w-full bg-slate-700 hover:bg-slate-600 text-center text-white py-3 rounded-lg text-sm font-medium transition-colors"
                    >
                        Open {analysis?.platform} Report Form
                    </a>

                    <button className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2">
                        <Icons.Download />
                        <span>Download Evidence (.zip)</span>
                    </button>
                    
                     <button className="w-full border border-slate-600 text-slate-300 hover:text-white py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2">
                        <Icons.Siren />
                        <span>Escalate to Authorities</span>
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default UrlScanner;