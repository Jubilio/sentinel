/**
 * Reverse Image Search Service
 * Provides integration with multiple reverse image search engines
 * to find copies of images across the web.
 */

export interface ReverseSearchEngine {
  id: string;
  name: string;
  icon: string;
  description: string;
  searchUrl: (imageUrl: string) => string;
  uploadSupported: boolean;
}

export interface ReverseSearchResult {
  engine: string;
  url: string;
  title?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  similarity?: number;
  timestamp?: string;
}

export interface AggregatedResults {
  query: {
    imageUrl?: string;
    uploadedFile?: string;
    timestamp: string;
  };
  engines: {
    name: string;
    status: 'pending' | 'completed' | 'error';
    resultsCount?: number;
    searchUrl?: string;
  }[];
  totalResults: number;
}

/**
 * Supported reverse image search engines
 */
export const SEARCH_ENGINES: ReverseSearchEngine[] = [
  {
    id: 'google',
    name: 'Google Lens',
    icon: '🔍',
    description: 'Most comprehensive image search with AI-powered matching',
    searchUrl: (imageUrl: string) => 
      `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`,
    uploadSupported: true
  },
  {
    id: 'tineye',
    name: 'TinEye',
    icon: '👁️',
    description: 'Specialized reverse image search with exact match detection',
    searchUrl: (imageUrl: string) => 
      `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`,
    uploadSupported: true
  },
  {
    id: 'yandex',
    name: 'Yandex Images',
    icon: '🔎',
    description: 'Strong for finding images across Eastern European sites',
    searchUrl: (imageUrl: string) => 
      `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`,
    uploadSupported: true
  },
  {
    id: 'bing',
    name: 'Bing Visual Search',
    icon: '🖼️',
    description: 'Microsoft\'s visual search with good coverage',
    searchUrl: (imageUrl: string) => 
      `https://www.bing.com/images/search?view=detailv2&iss=sbi&FORM=SBIIRP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(imageUrl)}`,
    uploadSupported: true
  },
  {
    id: 'karmadecay',
    name: 'KarmaDecay',
    icon: '🔄',
    description: 'Specialized for finding Reddit reposts',
    searchUrl: (imageUrl: string) => 
      `http://karmadecay.com/search?q=${encodeURIComponent(imageUrl)}`,
    uploadSupported: false
  }
];

/**
 * Generate search URLs for all engines
 */
export function generateSearchUrls(imageUrl: string): { engine: ReverseSearchEngine; url: string }[] {
  return SEARCH_ENGINES.map(engine => ({
    engine,
    url: engine.searchUrl(imageUrl)
  }));
}

/**
 * Open all search engines in new tabs
 */
export function openAllSearchEngines(imageUrl: string): void {
  const urls = generateSearchUrls(imageUrl);
  urls.forEach(({ url }, index) => {
    // Stagger opening to avoid popup blockers
    setTimeout(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    }, index * 500);
  });
}

/**
 * Convert a File to base64 data URL
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image to temporary hosting for URL-based searches
 * Note: In production, this would use a proper image hosting API
 */
export async function uploadForSearch(file: File): Promise<string> {
  // For demo purposes, we'll use the local data URL
  // In production, use imgbb, imgur, or similar API
  const dataUrl = await fileToDataUrl(file);
  
  // Store in localStorage for reference
  const uploadId = `search_${Date.now()}`;
  localStorage.setItem(uploadId, JSON.stringify({
    dataUrl,
    filename: file.name,
    uploadedAt: new Date().toISOString()
  }));
  
  return dataUrl;
}

/**
 * Create aggregated search session
 */
export function createSearchSession(imageUrl: string): AggregatedResults {
  const urls = generateSearchUrls(imageUrl);
  
  return {
    query: {
      imageUrl,
      timestamp: new Date().toISOString()
    },
    engines: urls.map(({ engine, url }) => ({
      name: engine.name,
      status: 'pending',
      searchUrl: url
    })),
    totalResults: 0
  };
}

/**
 * Save search to history
 */
export function saveSearchToHistory(session: AggregatedResults): void {
  try {
    const history = JSON.parse(localStorage.getItem('sentinel_reverse_search_history') || '[]');
    history.unshift({
      ...session,
      id: `search_${Date.now()}`
    });
    // Keep last 20 searches
    localStorage.setItem('sentinel_reverse_search_history', JSON.stringify(history.slice(0, 20)));
  } catch (e) {
    console.error('Failed to save search history', e);
  }
}

/**
 * Get search history
 */
export function getSearchHistory(): AggregatedResults[] {
  try {
    return JSON.parse(localStorage.getItem('sentinel_reverse_search_history') || '[]');
  } catch {
    return [];
  }
}
