import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../constants';
import { 
  generateAllHashes, 
  getVaultHashes, 
  searchVaultForMatches, 
  compareHashes,
  HashResult 
} from '../services/hashingService';

interface VaultEntry {
  id: string;
  hashes: { aHash: HashResult; dHash: HashResult; pHash: HashResult };
  metadata: { filename?: string; description?: string };
  storedAt: string;
}

const HashMonitor: React.FC = () => {
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);
  const [testImage, setTestImage] = useState<File | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadVaultEntries();
  }, []);

  const loadVaultEntries = () => {
    const entries = getVaultHashes();
    setVaultEntries(entries);
  };

  const handleTestImage = useCallback(async () => {
    if (!testImage) return;
    
    setIsProcessing(true);
    setTestResults(null);
    
    try {
      // Generate hashes for test image
      const testHashes = await generateAllHashes(testImage);
      
      // Search for matches
      const pHashMatches = searchVaultForMatches(testHashes.pHash.hash, 'pHash', 10);
      const dHashMatches = searchVaultForMatches(testHashes.dHash.hash, 'dHash', 10);
      const aHashMatches = searchVaultForMatches(testHashes.aHash.hash, 'aHash', 5);
      
      setTestResults({
        hashes: testHashes,
        matches: {
          pHash: pHashMatches,
          dHash: dHashMatches,
          aHash: aHashMatches
        },
        hasMatch: pHashMatches.length > 0 || dHashMatches.length > 0 || aHashMatches.length > 0
      });
    } catch (error) {
      console.error('Hash test failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [testImage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTestImage(file);
      setTestResults(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Icons.Shield className="w-7 h-7 text-green-400" />
          Hash-Based Monitoring
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Track protected content using perceptual hashes. Detect re-uploads even after modifications.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vault Hashes Panel */}
        <div className="lg:col-span-2 bg-slate-850 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icons.Lock className="w-5 h-5 text-brand-400" />
            Protected Hash Vault
          </h2>
          
          {vaultEntries.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Icons.EyeOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No protected hashes yet</p>
              <p className="text-xs mt-2">Upload content to Secure Vault to generate hashes</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {vaultEntries.map((entry, i) => (
                <div 
                  key={i}
                  onClick={() => setSelectedEntry(entry)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedEntry?.id === entry.id 
                      ? 'bg-brand-900/20 border-brand-700' 
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-white text-sm">
                        {entry.metadata.filename || `Asset ${entry.id.substring(0, 8)}`}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 font-mono">
                        pHash: {entry.hashes.pHash.hash.substring(0, 12)}...
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(entry.storedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Panel */}
        <div className="bg-slate-850 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icons.Search className="w-5 h-5 text-yellow-400" />
            Match Tester
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Test Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-600 file:text-white hover:file:bg-brand-500"
              />
            </div>
            
            {testImage && (
              <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden">
                <img 
                  src={URL.createObjectURL(testImage)} 
                  alt="Test" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            
            <button
              onClick={handleTestImage}
              disabled={!testImage || isProcessing}
              className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Icons.Search className="w-5 h-5" />
                  Check for Matches
                </>
              )}
            </button>
          </div>
          
          {/* Test Results */}
          {testResults && (
            <div className="mt-6 p-4 rounded-lg border bg-slate-800/50 border-slate-700">
              <div className={`text-center mb-4 p-3 rounded-lg ${
                testResults.hasMatch 
                  ? 'bg-red-900/20 border border-red-800' 
                  : 'bg-green-900/20 border border-green-800'
              }`}>
                {testResults.hasMatch ? (
                  <div className="flex items-center justify-center gap-2 text-red-400">
                    <Icons.Alert className="w-5 h-5" />
                    <span className="font-medium">MATCH FOUND</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <Icons.CheckCircle className="w-5 h-5" />
                    <span className="font-medium">No Match</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500">pHash:</span>
                  <code className="ml-2 text-brand-400 font-mono">{testResults.hashes.pHash.hash}</code>
                </div>
                <div>
                  <span className="text-slate-500">dHash:</span>
                  <code className="ml-2 text-purple-400 font-mono">{testResults.hashes.dHash.hash}</code>
                </div>
                <div>
                  <span className="text-slate-500">aHash:</span>
                  <code className="ml-2 text-yellow-400 font-mono">{testResults.hashes.aHash.hash}</code>
                </div>
                
                {testResults.matches.pHash.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <span className="text-slate-400 font-medium">Matches:</span>
                    {testResults.matches.pHash.map((match: any, i: number) => (
                      <div key={i} className="mt-2 p-2 bg-red-900/10 rounded border border-red-800">
                        <div className="text-red-300">Asset: {match.assetId.substring(0, 12)}...</div>
                        <div className="text-red-400 font-bold">{match.similarity}% Similar</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Selected Entry Details */}
      {selectedEntry && (
        <div className="bg-slate-850 rounded-xl border border-slate-700 p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-white">Hash Details</h2>
            <button 
              onClick={() => setSelectedEntry(null)}
              className="p-1 hover:bg-slate-800 rounded"
              aria-label="Close details"
            >
              <Icons.Close className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['aHash', 'dHash', 'pHash'] as const).map(type => (
              <div key={type} className="bg-slate-800 rounded-lg p-4">
                <div className="text-xs text-slate-500 uppercase mb-2">{type}</div>
                <code className="text-sm text-green-400 font-mono break-all">
                  {selectedEntry.hashes[type].hash}
                </code>
                <div className="text-xs text-slate-500 mt-2">
                  {selectedEntry.hashes[type].size} • {selectedEntry.hashes[type].algorithm}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HashMonitor;
