# Sentinel - Secure Content Protection System

## Overview

Sentinel is a specialized privacy-preservation platform designed to protect individuals against the non-consensual distribution of intimate imagery (NCII). It employs a "Privacy by Design" architecture, ensuring that sensitive victim data is processed locally (client-side) and only non-reversible cryptographic hashes are used for detection and matching.

## Key Features

### 1. Secure Vault (Client-Side Processing)
- **Local Hashing:** Videos and images are processed entirely within the browser using WebAssembly.
- **Fingerprinting:** Generates robust perceptual hashes (pHash) and face embeddings.
- **Zero-Knowledge:** The original file never leaves the user's device. Only the encrypted hash is transmitted to the vault.

### 2. Automated Detection & Matching
- **Cross-Platform Scanning:** Monitors inputs from public social media platforms.
- **Vector Matching:** Uses high-performance vector databases (Milvus/FAISS) to match content against the secure vault.
- **Confidence Scoring:** Calculates similarity scores based on video structure, audio fingerprints, and facial biometrics.

### 3. URL Scanner & Reporting
- **Proactive Takedown:** Users can paste suspicious URLs to verify if their protected content has been leaked.
- **Legal Automation:** Automatically generates legal takedown notices (DMCA, GDPR) and specific templates for Portuguese/Brazilian jurisdictions.
- **Evidence Packaging:** Creates cryptographically signed evidence packages containing timestamps, screenshots, and hash matches for law enforcement.

## Security Architecture

- **Encryption:** AES-256 for data at rest; TLS 1.3 for data in transit.
- **Minimization:** No PII or raw media is stored centrally.
- **Audit Logs:** Immutable logging of all scanning and takedown actions.

## Technology Stack

- **Frontend:** React, Tailwind CSS, Recharts
- **AI/ML:** Google Gemini 2.5 Flash (for risk analysis and legal drafting)
- **Security:** Web Crypto API, Client-side Sandboxing

## Disclaimer

This system is a technical tool to aid in the detection and reporting of NCII. It does not guarantee the removal of content, which is subject to the policies of individual platforms and local laws.