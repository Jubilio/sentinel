/**
 * Perceptual Hashing Service
 * Generates perceptual hashes (pHash) for images that remain similar
 * even after compression, resizing, or minor edits.
 */

export interface HashResult {
  hash: string;
  algorithm: 'pHash' | 'dHash' | 'aHash';
  size: string;
  timestamp: string;
}

export interface HashComparison {
  hash1: string;
  hash2: string;
  hammingDistance: number;
  similarity: number;
  isMatch: boolean;
}

/**
 * Load image from various sources and return ImageData
 */
async function loadImage(source: string | File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    
    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Resize image to specified dimensions
 */
function resizeImage(img: HTMLImageElement, width: number, height: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Convert image to grayscale
 */
function toGrayscale(imageData: ImageData): number[] {
  const gray: number[] = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    // Luminosity method
    gray.push(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return gray;
}

/**
 * Generate Average Hash (aHash) - simplest perceptual hash
 * Good for detecting exact or near-exact duplicates
 */
export async function generateAverageHash(source: string | File | Blob): Promise<HashResult> {
  const img = await loadImage(source);
  const imageData = resizeImage(img, 8, 8);
  const gray = toGrayscale(imageData);
  
  // Calculate average
  const avg = gray.reduce((a, b) => a + b, 0) / gray.length;
  
  // Generate hash: 1 if pixel > average, 0 otherwise
  let hash = '';
  for (const pixel of gray) {
    hash += pixel > avg ? '1' : '0';
  }
  
  // Convert to hex
  const hexHash = BigInt('0b' + hash).toString(16).padStart(16, '0').toUpperCase();
  
  return {
    hash: hexHash,
    algorithm: 'aHash',
    size: '64-bit',
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate Difference Hash (dHash) - better for rotated/flipped images
 * Compares adjacent pixels for gradient detection
 */
export async function generateDifferenceHash(source: string | File | Blob): Promise<HashResult> {
  const img = await loadImage(source);
  const imageData = resizeImage(img, 9, 8); // 9x8 for 8x8 differences
  const gray = toGrayscale(imageData);
  
  // Generate hash based on horizontal gradient
  let hash = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const idx = y * 9 + x;
      hash += gray[idx] > gray[idx + 1] ? '1' : '0';
    }
  }
  
  const hexHash = BigInt('0b' + hash).toString(16).padStart(16, '0').toUpperCase();
  
  return {
    hash: hexHash,
    algorithm: 'dHash',
    size: '64-bit',
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate Perceptual Hash (pHash) - most robust
 * Uses DCT (Discrete Cosine Transform) for frequency analysis
 */
export async function generatePerceptualHash(source: string | File | Blob): Promise<HashResult> {
  const img = await loadImage(source);
  const imageData = resizeImage(img, 32, 32);
  const gray = toGrayscale(imageData);
  
  // Simple DCT approximation (for browser compatibility)
  // Full DCT would require more complex math
  const dct: number[] = [];
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let sum = 0;
      for (let x = 0; x < 32; x++) {
        for (let y = 0; y < 32; y++) {
          const idx = y * 32 + x;
          sum += gray[idx] * 
                 Math.cos((2 * x + 1) * u * Math.PI / 64) * 
                 Math.cos((2 * y + 1) * v * Math.PI / 64);
        }
      }
      dct.push(sum);
    }
  }
  
  // Remove DC component (first coefficient)
  const dctWithoutDC = dct.slice(1);
  const median = [...dctWithoutDC].sort((a, b) => a - b)[Math.floor(dctWithoutDC.length / 2)];
  
  // Generate hash
  let hash = '';
  for (const val of dctWithoutDC.slice(0, 64)) {
    hash += val > median ? '1' : '0';
  }
  
  // Pad to 64 bits if needed
  hash = hash.padEnd(64, '0');
  
  const hexHash = BigInt('0b' + hash).toString(16).padStart(16, '0').toUpperCase();
  
  return {
    hash: hexHash,
    algorithm: 'pHash',
    size: '64-bit',
    timestamp: new Date().toISOString()
  };
}

/**
 * Calculate Hamming distance between two hashes
 * (number of different bits)
 */
export function calculateHammingDistance(hash1: string, hash2: string): number {
  const bin1 = BigInt('0x' + hash1).toString(2).padStart(64, '0');
  const bin2 = BigInt('0x' + hash2).toString(2).padStart(64, '0');
  
  let distance = 0;
  for (let i = 0; i < bin1.length; i++) {
    if (bin1[i] !== bin2[i]) distance++;
  }
  return distance;
}

/**
 * Compare two hashes and return similarity analysis
 */
export function compareHashes(hash1: string, hash2: string, threshold: number = 10): HashComparison {
  const hammingDistance = calculateHammingDistance(hash1, hash2);
  const similarity = Math.round((1 - hammingDistance / 64) * 100);
  
  return {
    hash1,
    hash2,
    hammingDistance,
    similarity,
    isMatch: hammingDistance <= threshold
  };
}

/**
 * Generate all hash types for comprehensive matching
 */
export async function generateAllHashes(source: string | File | Blob): Promise<{
  aHash: HashResult;
  dHash: HashResult;
  pHash: HashResult;
}> {
  const [aHash, dHash, pHash] = await Promise.all([
    generateAverageHash(source),
    generateDifferenceHash(source),
    generatePerceptualHash(source)
  ]);
  
  return { aHash, dHash, pHash };
}

/**
 * Store hash in localStorage vault
 */
export function storeHashInVault(
  assetId: string, 
  hashes: { aHash: HashResult; dHash: HashResult; pHash: HashResult },
  metadata: { filename?: string; description?: string }
): void {
  try {
    const vault = JSON.parse(localStorage.getItem('sentinel_hash_vault') || '[]');
    vault.push({
      id: assetId,
      hashes,
      metadata,
      storedAt: new Date().toISOString()
    });
    localStorage.setItem('sentinel_hash_vault', JSON.stringify(vault));
  } catch (e) {
    console.error('Failed to store hash in vault', e);
  }
}

/**
 * Search vault for matching hashes
 */
export function searchVaultForMatches(
  targetHash: string, 
  algorithm: 'aHash' | 'dHash' | 'pHash' = 'pHash',
  threshold: number = 10
): Array<{ assetId: string; similarity: number; storedAt: string }> {
  try {
    const vault = JSON.parse(localStorage.getItem('sentinel_hash_vault') || '[]');
    const matches: Array<{ assetId: string; similarity: number; storedAt: string }> = [];
    
    for (const entry of vault) {
      const storedHash = entry.hashes[algorithm]?.hash;
      if (storedHash) {
        const comparison = compareHashes(targetHash, storedHash, threshold);
        if (comparison.isMatch) {
          matches.push({
            assetId: entry.id,
            similarity: comparison.similarity,
            storedAt: entry.storedAt
          });
        }
      }
    }
    
    return matches.sort((a, b) => b.similarity - a.similarity);
  } catch (e) {
    console.error('Failed to search vault', e);
    return [];
  }
}

/**
 * Get all stored hashes from vault
 */
export function getVaultHashes(): Array<{
  id: string;
  hashes: { aHash: HashResult; dHash: HashResult; pHash: HashResult };
  metadata: { filename?: string; description?: string };
  storedAt: string;
}> {
  try {
    return JSON.parse(localStorage.getItem('sentinel_hash_vault') || '[]');
  } catch {
    return [];
  }
}
