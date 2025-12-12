export enum SecurityLevel {
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  STANDARD = 'STANDARD'
}

export enum MatchStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  VERIFIED = 'VERIFIED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  REMOVED = 'REMOVED',
  PROCESSING_REMOVAL = 'PROCESSING_REMOVAL'
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

export interface DigitalFingerprint {
  hashType: 'pHash' | 'dHash' | 'FaceNet';
  hashValue: string;
  generatedAt: string;
}

export interface EvidencePackage {
  id: string;
  url: string;
  platform: string;
  detectedAt: string;
  similarityScore: number; // Overall similarity
  riskScore: number; // 0-100 based on virality/content
  nudityScore: number; // 0-100 confidence
  source: 'INTERNAL_CRAWLER' | 'STOP_NCII_FEED' | 'PARTNER_API';
  status: MatchStatus;
  thumbnailUrl?: string; // Blurry placeholder
  metadata?: {
    poster: string;
    description: string;
    views: number;
    reuploadCount?: number;
  };
}

export interface UrlAnalysisResult {
  url: string;
  platform: string;
  detectedAt: string;
  thumbnailUrl: string;
  metadata: {
    title: string;
    uploader: string;
    views: string;
  };
  matchResult: {
    isMatch: boolean;
    confidence: number;
    vaultAssetId?: string;
    videoHashMatch: boolean;
    faceMatch: boolean;
  };
}

export interface RemovalRequestDraft {
  platform: string;
  legalText: string;
  evidenceId: string;
}

export interface UserStats {
  protectedAssets: number;
  activeScans: number;
  takedownsExecuted: number;
  threatLevel: 'Low' | 'Medium' | 'High';
}