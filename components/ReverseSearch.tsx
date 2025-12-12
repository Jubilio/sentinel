import React, { useState, useCallback } from 'react';
import { Icons } from '../constants';
import {
  SEARCH_ENGINES,
  generateSearchUrls,
  fileToDataUrl,
  createSearchSession,
  saveSearchToHistory,
  getSearchHistory,
  AggregatedResults
} from '../services/reverseSearchService';

const ReverseSearch: React.FC = () => {
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSession, setSearchSession] = useState<AggregatedResults | null>(null);
  const [history, setHistory] = useState<AggregatedResults[]>(() => getSearchHistory());

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const dataUrl = await fileToDataUrl(file);
      setPreviewUrl(dataUrl);
    }
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setPreviewUrl(e.target.value);
  };

  const handleSearch = async () => {
    const searchUrl = imageSource === 'url' ? imageUrl : previewUrl;
    if (!searchUrl) return;

    setIsSearching(true);
    
    // Create search session
    const session = createSearchSession(searchUrl);
    setSearchSession(session);
    
    // Save to history
    saveSearchToHistory(session);
    setHistory(getSearchHistory());
    
    setIsSearching(false);
  };

  const openSearchEngine = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openAllEngines = () => {
    if (!searchSession) return;
    
    searchSession.engines.forEach((engine, index) => {
      setTimeout(() => {
        if (engine.searchUrl) {
          window.open(engine.searchUrl, '_blank', 'noopener,noreferrer');
        }
      }, index * 600);
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Icons.Search className="w-7 h-7 text-purple-400" />
          Reverse Image Search
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Find copies of your images across the web using multiple search engines
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 bg-slate-850 rounded-xl border border-slate-700 p-6">
          {/* Source Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setImageSource('upload')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                imageSource === 'upload' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Upload Image
            </button>
            <button
              onClick={() => setImageSource('url')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                imageSource === 'url' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Paste URL
            </button>
          </div>

          {/* Upload Input */}
          {imageSource === 'upload' && (
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Select Image</label>
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="reverse-search-upload"
                  aria-label="Upload image for reverse search"
                />
                <label htmlFor="reverse-search-upload" className="cursor-pointer">
                  <Icons.Upload className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                  <p className="text-slate-300 font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG, WebP up to 10MB</p>
                </label>
              </div>
            </div>
          )}

          {/* URL Input */}
          {imageSource === 'url' && (
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={handleUrlChange}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Preview</label>
              <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" fill="gray">Error</text></svg>';
                  }}
                />
              </div>
            </div>
          )}

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={!previewUrl || isSearching}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Preparing Search...
              </>
            ) : (
              <>
                <Icons.Search className="w-5 h-5" />
                Search All Engines
              </>
            )}
          </button>
        </div>

        {/* Engines Panel */}
        <div className="bg-slate-850 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Search Engines</h2>
          <div className="space-y-3">
            {SEARCH_ENGINES.map(engine => (
              <div 
                key={engine.id}
                className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{engine.icon}</span>
                  <span className="font-medium text-white">{engine.name}</span>
                </div>
                <p className="text-xs text-slate-500">{engine.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchSession && (
        <div className="bg-slate-850 rounded-xl border border-slate-700 p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Search Ready</h2>
            <button
              onClick={openAllEngines}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Icons.Globe className="w-4 h-4" />
              Open All ({searchSession.engines.length})
            </button>
          </div>

          <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-300">
              <strong>Note:</strong> Due to browser security, searches will open in new tabs. 
              Click each engine below or use "Open All" to search across multiple platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchSession.engines.map((engine, i) => (
              <button
                key={i}
                onClick={() => engine.searchUrl && openSearchEngine(engine.searchUrl)}
                className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-purple-600 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white group-hover:text-purple-400 transition-colors">
                    {engine.name}
                  </span>
                  <Icons.Link className="w-4 h-4 text-slate-500 group-hover:text-purple-400" />
                </div>
                <span className="text-xs text-slate-500">Click to search</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search History */}
      {history.length > 0 && (
        <div className="bg-slate-850 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Searches</h2>
          <div className="space-y-2">
            {history.slice(0, 5).map((session, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {session.query.imageUrl && (
                    <div className="w-12 h-12 bg-slate-900 rounded overflow-hidden">
                      <img 
                        src={session.query.imageUrl} 
                        alt="Search" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-white">
                      {session.engines.length} engines
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(session.query.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSearchSession(session)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Re-open
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
        <h3 className="font-semibold text-white mb-3">Search Tips</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>• <strong className="text-slate-300">Google Lens</strong> - Best for general image matching and similar images</li>
          <li>• <strong className="text-slate-300">TinEye</strong> - Best for finding exact copies and tracking image history</li>
          <li>• <strong className="text-slate-300">Yandex</strong> - Best for Eastern European and Russian sites</li>
          <li>• <strong className="text-slate-300">Bing</strong> - Good alternative with different index coverage</li>
          <li>• <strong className="text-slate-300">KarmaDecay</strong> - Specifically for Reddit reposts</li>
        </ul>
      </div>
    </div>
  );
};

export default ReverseSearch;
