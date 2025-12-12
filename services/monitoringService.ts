/**
 * Continuous Monitoring (Crawling) Service
 * Automated scanning of risk sites to detect re-uploads of protected content
 */

import { generateAllHashes, compareHashes, getVaultHashes } from './hashingService';

export interface MonitoringTarget {
  id: string;
  name: string;
  category: 'adult' | 'social' | 'forum' | 'file_sharing';
  riskLevel: 'high' | 'medium' | 'low';
  enabled: boolean;
  lastScanned?: string;
  matchesFound: number;
}

export interface MonitoringSession {
  id: string;
  status: 'idle' | 'scanning' | 'completed' | 'error';
  startedAt?: string;
  completedAt?: string;
  targetsScanned: number;
  totalTargets: number;
  matchesFound: number;
  currentTarget?: string;
  progress: number;
}

export interface ContentAlert {
  id: string;
  type: 'match_found' | 'potential_match' | 'scan_complete';
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  title: string;
  description: string;
  targetSite?: string;
  matchUrl?: string;
  similarity?: number;
  read: boolean;
  assetId?: string;
}

export interface ProtectedAsset {
  id: string;
  filename: string;
  thumbnailUrl: string;
  hashes: {
    pHash: string;
    dHash: string;
    aHash: string;
  };
  uploadedAt: string;
  lastScanned?: string;
  matchCount: number;
  monitoringEnabled: boolean;
}

// Simulated risk sites for monitoring
export const MONITORING_TARGETS: MonitoringTarget[] = [
  { id: 'target_1', name: 'AdultSite-A', category: 'adult', riskLevel: 'high', enabled: true, matchesFound: 0 },
  { id: 'target_2', name: 'AdultSite-B', category: 'adult', riskLevel: 'high', enabled: true, matchesFound: 0 },
  { id: 'target_3', name: 'LeakForum', category: 'forum', riskLevel: 'high', enabled: true, matchesFound: 0 },
  { id: 'target_4', name: 'SocialPlatform-X', category: 'social', riskLevel: 'medium', enabled: true, matchesFound: 0 },
  { id: 'target_5', name: 'FileHost-Z', category: 'file_sharing', riskLevel: 'medium', enabled: false, matchesFound: 0 },
  { id: 'target_6', name: 'ImageBoard', category: 'forum', riskLevel: 'high', enabled: true, matchesFound: 0 },
  { id: 'target_7', name: 'MessagingApp-Leaks', category: 'social', riskLevel: 'high', enabled: true, matchesFound: 0 },
  { id: 'target_8', name: 'CloudStorage-Public', category: 'file_sharing', riskLevel: 'low', enabled: false, matchesFound: 0 },
];

/**
 * Get protected assets from localStorage
 */
export function getProtectedAssets(): ProtectedAsset[] {
  try {
    return JSON.parse(localStorage.getItem('sentinel_protected_assets') || '[]');
  } catch {
    return [];
  }
}

/**
 * Save protected asset
 */
export function saveProtectedAsset(asset: ProtectedAsset): void {
  const assets = getProtectedAssets();
  const existingIndex = assets.findIndex(a => a.id === asset.id);
  if (existingIndex >= 0) {
    assets[existingIndex] = asset;
  } else {
    assets.push(asset);
  }
  localStorage.setItem('sentinel_protected_assets', JSON.stringify(assets));
}

/**
 * Add new protected asset from file
 */
export async function addProtectedAsset(file: File): Promise<ProtectedAsset> {
  const hashes = await generateAllHashes(file);
  
  // Create thumbnail
  const thumbnailUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const asset: ProtectedAsset = {
    id: `asset_${Date.now()}`,
    filename: file.name,
    thumbnailUrl,
    hashes: {
      pHash: hashes.pHash.hash,
      dHash: hashes.dHash.hash,
      aHash: hashes.aHash.hash
    },
    uploadedAt: new Date().toISOString(),
    matchCount: 0,
    monitoringEnabled: true
  };

  saveProtectedAsset(asset);
  return asset;
}

/**
 * Get alerts
 */
export function getAlerts(): ContentAlert[] {
  try {
    return JSON.parse(localStorage.getItem('sentinel_alerts') || '[]');
  } catch {
    return [];
  }
}

/**
 * Save alert
 */
export function saveAlert(alert: ContentAlert): void {
  const alerts = getAlerts();
  alerts.unshift(alert);
  // Keep last 100 alerts
  localStorage.setItem('sentinel_alerts', JSON.stringify(alerts.slice(0, 100)));
}

/**
 * Mark alert as read
 */
export function markAlertRead(alertId: string): void {
  const alerts = getAlerts();
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.read = true;
    localStorage.setItem('sentinel_alerts', JSON.stringify(alerts));
  }
}

/**
 * Get unread alert count
 */
export function getUnreadAlertCount(): number {
  return getAlerts().filter(a => !a.read).length;
}

/**
 * Simulate crawling a target site
 * In production, this would use actual web scraping or API integration
 */
async function simulateCrawl(target: MonitoringTarget, asset: ProtectedAsset): Promise<{
  found: boolean;
  similarity: number;
  url?: string;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Simulate random match detection (5% chance for high-risk sites)
  const matchChance = target.riskLevel === 'high' ? 0.05 : target.riskLevel === 'medium' ? 0.02 : 0.01;
  const found = Math.random() < matchChance;
  
  if (found) {
    return {
      found: true,
      similarity: 75 + Math.random() * 20, // 75-95% similarity
      url: `https://${target.name.toLowerCase().replace(/[-_]/g, '')}.example/${Math.random().toString(36).substring(7)}`
    };
  }
  
  return { found: false, similarity: 0 };
}

/**
 * Run monitoring scan for all assets
 */
export async function runMonitoringScan(
  onProgress: (session: MonitoringSession) => void
): Promise<MonitoringSession> {
  const assets = getProtectedAssets().filter(a => a.monitoringEnabled);
  const targets = MONITORING_TARGETS.filter(t => t.enabled);
  
  const session: MonitoringSession = {
    id: `scan_${Date.now()}`,
    status: 'scanning',
    startedAt: new Date().toISOString(),
    targetsScanned: 0,
    totalTargets: targets.length * assets.length,
    matchesFound: 0,
    progress: 0
  };

  onProgress(session);

  if (assets.length === 0) {
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    session.progress = 100;
    
    saveAlert({
      id: `alert_${Date.now()}`,
      type: 'scan_complete',
      severity: 'info',
      timestamp: new Date().toISOString(),
      title: 'No Assets to Monitor',
      description: 'Add protected assets to enable continuous monitoring.',
      read: false
    });
    
    onProgress(session);
    return session;
  }

  for (const asset of assets) {
    for (const target of targets) {
      session.currentTarget = target.name;
      session.targetsScanned++;
      session.progress = Math.round((session.targetsScanned / session.totalTargets) * 100);
      onProgress(session);

      try {
        const result = await simulateCrawl(target, asset);
        
        if (result.found && result.url) {
          session.matchesFound++;
          
          // Update asset
          asset.matchCount++;
          asset.lastScanned = new Date().toISOString();
          saveProtectedAsset(asset);
          
          // Create alert
          saveAlert({
            id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            type: 'match_found',
            severity: 'critical',
            timestamp: new Date().toISOString(),
            title: 'Potential Match Detected!',
            description: `Content similar to "${asset.filename}" found on ${target.name}`,
            targetSite: target.name,
            matchUrl: result.url,
            similarity: Math.round(result.similarity),
            assetId: asset.id,
            read: false
          });
          
          onProgress(session);
        }
      } catch (error) {
        console.error(`Error scanning ${target.name}:`, error);
      }
    }
    
    // Update last scanned time for asset
    asset.lastScanned = new Date().toISOString();
    saveProtectedAsset(asset);
  }

  session.status = 'completed';
  session.completedAt = new Date().toISOString();
  session.progress = 100;
  session.currentTarget = undefined;
  
  // Summary alert
  saveAlert({
    id: `alert_${Date.now()}`,
    type: 'scan_complete',
    severity: session.matchesFound > 0 ? 'warning' : 'info',
    timestamp: new Date().toISOString(),
    title: 'Scan Complete',
    description: session.matchesFound > 0 
      ? `Found ${session.matchesFound} potential match(es) across ${targets.length} sites.`
      : `No matches found. Scanned ${targets.length} sites for ${assets.length} protected asset(s).`,
    read: false
  });

  onProgress(session);
  
  // Save scan history
  const history = JSON.parse(localStorage.getItem('sentinel_scan_history') || '[]');
  history.unshift(session);
  localStorage.setItem('sentinel_scan_history', JSON.stringify(history.slice(0, 50)));

  return session;
}

/**
 * Get scan history
 */
export function getScanHistory(): MonitoringSession[] {
  try {
    return JSON.parse(localStorage.getItem('sentinel_scan_history') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear all alerts
 */
export function clearAllAlerts(): void {
  localStorage.setItem('sentinel_alerts', '[]');
}

/**
 * Delete protected asset
 */
export function deleteProtectedAsset(assetId: string): void {
  const assets = getProtectedAssets().filter(a => a.id !== assetId);
  localStorage.setItem('sentinel_protected_assets', JSON.stringify(assets));
}
