import React, { useState } from 'react';
import { MOCK_MATCHES, Icons } from '../constants';
import { EvidencePackage, RemovalRequestDraft } from '../types';
import { generateLegalTakedown } from '../services/geminiService';

const MatchReview: React.FC = () => {
  const [blurContent, setBlurContent] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<EvidencePackage | null>(null);
  const [draft, setDraft] = useState<RemovalRequestDraft | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTakedown = async (match: EvidencePackage) => {
    setIsGenerating(true);
    const result = await generateLegalTakedown(match);
    setDraft(result);
    setIsGenerating(false);
  };

  const getRiskColor = (score: number) => {
    if (score >= 90) return 'text-red-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-brand-400';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* List Column */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Detected Potential Matches</h2>
          <button 
            onClick={() => setBlurContent(!blurContent)}
            className={`flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full border transition-all ${blurContent ? 'bg-brand-900/20 border-brand-500/50 text-brand-400' : 'bg-red-900/20 border-red-500/50 text-red-400'}`}
          >
            {blurContent ? <Icons.EyeOff /> : <Icons.Activity />}
            <span>{blurContent ? 'Privacy Blur On' : 'Content Visible'}</span>
          </button>
        </div>

        <div className="space-y-4">
          {MOCK_MATCHES.map((match: EvidencePackage) => (
            <div 
              key={match.id}
              onClick={() => { setSelectedMatch(match); setDraft(null); }}
              className={`group cursor-pointer rounded-lg p-4 border transition-all relative overflow-hidden ${selectedMatch?.id === match.id ? 'bg-slate-800 border-brand-500' : 'bg-slate-850 border-slate-700 hover:border-slate-500'}`}
            >
              {match.source === 'STOP_NCII_FEED' && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-bl font-bold uppercase tracking-wider">
                  StopNCII Partner Feed
                </div>
              )}
              
              <div className="flex space-x-4 mt-2">
                <div className={`w-24 h-16 bg-slate-900 rounded overflow-hidden relative flex-shrink-0`}>
                  <img 
                    src={match.thumbnailUrl} 
                    alt="Evidence thumbnail"
                    className={`w-full h-full object-cover transition-all duration-300 ${blurContent ? 'blur-md brightness-50' : ''}`}
                  />
                  <div className="absolute top-1 right-1 text-[10px] bg-black/70 px-1 rounded text-white font-mono">
                    {match.similarityScore}%
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-medium text-white truncate">{match.platform}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      match.status === 'VERIFIED' ? 'bg-red-900/30 border-red-800 text-red-400' : 
                      match.status === 'REMOVED' ? 'bg-green-900/30 border-green-800 text-green-400' :
                      'bg-amber-900/30 border-amber-800 text-amber-400'
                    }`}>
                      {match.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">{match.url}</p>
                  <div className="mt-2 flex items-center space-x-3">
                     <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-slate-500">Risk:</span>
                        <span className={`text-xs font-bold ${getRiskColor(match.riskScore)}`}>{match.riskScore}/100</span>
                     </div>
                     <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-slate-500">Nudity:</span>
                        <span className="text-xs text-slate-300">{match.nudityScore}%</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Column */}
      <div className="bg-slate-850 rounded-xl border border-slate-700 p-6 flex flex-col h-[calc(100vh-140px)] sticky top-6">
        {selectedMatch ? (
          <div className="flex flex-col h-full">
            <div className="mb-6 pb-6 border-b border-slate-700">
              <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-white mb-1">Evidence Case #{selectedMatch.id.split('_')[1]}</h3>
                  <div className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400">
                    Source: {selectedMatch.source.replace(/_/g, ' ')}
                  </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                    <span className="block text-[10px] text-slate-500 uppercase">Video Hash</span>
                    <span className="block text-lg font-mono text-brand-400">{selectedMatch.similarityScore}%</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                    <span className="block text-[10px] text-slate-500 uppercase">Risk Score</span>
                    <span className={`block text-lg font-mono ${getRiskColor(selectedMatch.riskScore)}`}>{selectedMatch.riskScore}</span>
                  </div>
                   <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                    <span className="block text-[10px] text-slate-500 uppercase">Nudity Conf.</span>
                    <span className="block text-lg font-mono text-slate-300">{selectedMatch.nudityScore}%</span>
                  </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 mb-6">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Contextual Metadata</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 block text-xs">Uploader</span>
                    <span className="text-slate-300">{selectedMatch.metadata?.poster}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Views/Reuploads</span>
                    <span className="text-slate-300">{selectedMatch.metadata?.views} / {selectedMatch.metadata?.reuploadCount}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-xs">Description</span>
                    <p className="text-slate-300 mt-1">{selectedMatch.metadata?.description}</p>
                  </div>
                </div>
              </div>

              {!draft ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-900/10 border border-amber-900/30 rounded-lg">
                    <h4 className="text-amber-500 font-medium text-sm flex items-center">
                      <Icons.Alert />
                      <span className="ml-2">Human Review Required</span>
                    </h4>
                    <p className="text-xs text-amber-200/70 mt-2">
                      High risk detected. Verify matches before automated submission to {selectedMatch.platform}.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                     <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg font-medium text-xs transition-colors border border-slate-600">
                        Mark False Positive
                     </button>
                     <button className="bg-brand-900/50 hover:bg-brand-900/80 text-brand-300 py-3 rounded-lg font-medium text-xs transition-colors border border-brand-800">
                        Verify & Lock Evidence
                     </button>
                  </div>

                  <button 
                    onClick={() => handleGenerateTakedown(selectedMatch)}
                    disabled={isGenerating}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center space-x-2"
                  >
                    {isGenerating ? (
                      <span className="animate-pulse">Generating Legal Pack...</span>
                    ) : (
                      <>
                        <Icons.FileText />
                        <span>Generate DMCA/GDPR Takedown</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-white">Generated Legal Notice</h4>
                    <span className="text-xs text-brand-400">AI-Drafted (Gemini)</span>
                  </div>
                  <textarea 
                    className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-brand-500 resize-none"
                    readOnly
                    value={draft.legalText}
                  />
                  <div className="mt-4 flex space-x-3">
                    <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                      Submit to Platform (Auto)
                    </button>
                    <button 
                      onClick={() => setDraft(null)}
                      className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Icons.Search />
            <span className="mt-2 text-sm">Select a match to review evidence</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchReview;