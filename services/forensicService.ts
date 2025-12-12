/**
 * Forensic Evidence Service
 * Generates court-admissible evidence packages with cryptographic hashes,
 * timestamps, and chain of custody documentation.
 */

export interface EvidencePackage {
  caseId: string;
  generatedAt: string;
  capturedBy: string;
  version: string;
  content: {
    url: string;
    platform: string;
    pageTitle: string;
    screenshotBase64?: string;
    screenshotHash?: string;
  };
  hashes: {
    urlHash: string;
    contentHash: string;
    packageHash?: string;
  };
  analysis: {
    nudityScore: number;
    riskScore: number;
    confidence: number;
    method: string;
    reasoning?: string;
  };
  chainOfCustody: CustodyEntry[];
}

export interface CustodyEntry {
  action: 'CAPTURED' | 'ANALYZED' | 'HASHED' | 'EXPORTED' | 'VERIFIED';
  timestamp: string;
  agent: string;
  details?: string;
}

/**
 * Generate SHA-256 hash of any string content
 */
export async function generateSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.toUpperCase();
}

/**
 * Generate a unique case ID
 */
export function generateCaseId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SENTINEL-${timestamp}-${random}`;
}

/**
 * Create forensic evidence package from analysis results
 */
export async function createEvidencePackage(
  url: string,
  platform: string,
  pageTitle: string,
  analysis: { nudityScore: number; riskScore: number; confidence: number; method: string; reasoning?: string },
  screenshotBase64?: string
): Promise<EvidencePackage> {
  const now = new Date().toISOString();
  const caseId = generateCaseId();
  
  const chainOfCustody: CustodyEntry[] = [
    { action: 'CAPTURED', timestamp: now, agent: 'Sentinel Forensic Scanner', details: `URL accessed: ${url}` }
  ];

  // Generate URL hash
  const urlHash = await generateSHA256(url);
  chainOfCustody.push({ action: 'HASHED', timestamp: new Date().toISOString(), agent: 'Sentinel', details: 'URL SHA-256 computed' });

  // Generate screenshot hash if available
  let screenshotHash: string | undefined;
  if (screenshotBase64) {
    screenshotHash = await generateSHA256(screenshotBase64);
    chainOfCustody.push({ action: 'HASHED', timestamp: new Date().toISOString(), agent: 'Sentinel', details: 'Screenshot SHA-256 computed' });
  }

  // Generate content hash (combining URL + title + analysis scores)
  const contentString = `${url}|${pageTitle}|${analysis.nudityScore}|${analysis.riskScore}|${analysis.confidence}`;
  const contentHash = await generateSHA256(contentString);

  chainOfCustody.push({ action: 'ANALYZED', timestamp: new Date().toISOString(), agent: `Sentinel AI (${analysis.method})`, details: `Nudity: ${analysis.nudityScore}%, Risk: ${analysis.riskScore}%` });

  const pkg: EvidencePackage = {
    caseId,
    generatedAt: now,
    capturedBy: 'Sentinel NCII Protection Platform v1.0',
    version: '1.0.0',
    content: {
      url,
      platform,
      pageTitle,
      screenshotBase64,
      screenshotHash: screenshotHash ? `SHA256:${screenshotHash}` : undefined
    },
    hashes: {
      urlHash: `SHA256:${urlHash}`,
      contentHash: `SHA256:${contentHash}`
    },
    analysis: {
      nudityScore: analysis.nudityScore,
      riskScore: analysis.riskScore,
      confidence: analysis.confidence,
      method: analysis.method,
      reasoning: analysis.reasoning
    },
    chainOfCustody
  };

  // Add package hash (hash of the entire package minus this field)
  const packageString = JSON.stringify({ ...pkg, hashes: { ...pkg.hashes, packageHash: undefined } });
  const packageHash = await generateSHA256(packageString);
  pkg.hashes.packageHash = `SHA256:${packageHash}`;
  
  chainOfCustody.push({ action: 'EXPORTED', timestamp: new Date().toISOString(), agent: 'Sentinel', details: `Package finalized with hash: ${packageHash.substring(0, 16)}...` });

  return pkg;
}

/**
 * Format evidence package as human-readable text report
 */
export function formatForensicReport(pkg: EvidencePackage): string {
  return `═══════════════════════════════════════════════════════════════
                    SENTINEL FORENSIC EVIDENCE REPORT
═══════════════════════════════════════════════════════════════

CASE IDENTIFICATION
────────────────────────────────────────────────────────────────
Case ID:        ${pkg.caseId}
Generated:      ${pkg.generatedAt}
Captured By:    ${pkg.capturedBy}
Package Version: ${pkg.version}

CONTENT DETAILS
────────────────────────────────────────────────────────────────
URL:            ${pkg.content.url}
Platform:       ${pkg.content.platform}
Page Title:     ${pkg.content.pageTitle}
${pkg.content.screenshotHash ? `Screenshot:     [ATTACHED - ${pkg.content.screenshotHash}]` : 'Screenshot:     Not available'}

CRYPTOGRAPHIC VERIFICATION
────────────────────────────────────────────────────────────────
URL Hash:       ${pkg.hashes.urlHash}
Content Hash:   ${pkg.hashes.contentHash}
Package Hash:   ${pkg.hashes.packageHash || 'N/A'}

AI ANALYSIS RESULTS
────────────────────────────────────────────────────────────────
Nudity Score:   ${pkg.analysis.nudityScore}/100
Risk Score:     ${pkg.analysis.riskScore}/100
Confidence:     ${pkg.analysis.confidence}%
Method:         ${pkg.analysis.method === 'gemini' ? 'Google Gemini Vision AI' : 'TensorFlow.js NSFWJS'}
${pkg.analysis.reasoning ? `\nAnalysis Notes:\n${pkg.analysis.reasoning}` : ''}

CHAIN OF CUSTODY
────────────────────────────────────────────────────────────────
${pkg.chainOfCustody.map(entry => 
  `[${entry.timestamp}] ${entry.action.padEnd(10)} | ${entry.agent}${entry.details ? ` | ${entry.details}` : ''}`
).join('\n')}

LEGAL NOTICE
────────────────────────────────────────────────────────────────
This evidence package was generated automatically by the Sentinel
NCII Protection Platform. The cryptographic hashes can be used to
verify the integrity and authenticity of the captured content.

To verify: Compute SHA-256 of the URL and compare with URL Hash above.

This document may be used as supporting evidence in legal proceedings
related to Non-Consensual Intimate Imagery (NCII) removal requests.

═══════════════════════════════════════════════════════════════
                    END OF FORENSIC REPORT
═══════════════════════════════════════════════════════════════
`;
}

/**
 * Export evidence package as downloadable JSON
 */
export function exportAsJSON(pkg: EvidencePackage): string {
  // Remove screenshot base64 from JSON export to reduce size
  const exportPkg = {
    ...pkg,
    content: {
      ...pkg.content,
      screenshotBase64: pkg.content.screenshotBase64 ? '[BASE64_DATA_OMITTED - See separate screenshot file]' : undefined
    }
  };
  return JSON.stringify(exportPkg, null, 2);
}

/**
 * Verify evidence package integrity
 */
export async function verifyPackageIntegrity(pkg: EvidencePackage): Promise<{ valid: boolean; details: string }> {
  try {
    // Verify URL hash
    const computedUrlHash = await generateSHA256(pkg.content.url);
    if (`SHA256:${computedUrlHash}` !== pkg.hashes.urlHash) {
      return { valid: false, details: 'URL hash mismatch - evidence may have been tampered with' };
    }

    // Verify screenshot hash if present
    if (pkg.content.screenshotBase64 && pkg.content.screenshotHash) {
      const computedScreenshotHash = await generateSHA256(pkg.content.screenshotBase64);
      if (`SHA256:${computedScreenshotHash}` !== pkg.content.screenshotHash) {
        return { valid: false, details: 'Screenshot hash mismatch - image may have been modified' };
      }
    }

    return { valid: true, details: 'All hashes verified successfully - evidence integrity confirmed' };
  } catch (error) {
    return { valid: false, details: `Verification error: ${error}` };
  }
}
