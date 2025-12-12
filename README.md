# Sentinel - Secure NCII Protection Platform

## Mission Statement

Sentinel is a high-security, privacy-first platform dedicated to protecting individuals from the non-consensual distribution of intimate imagery (NCII). By leveraging client-side cryptography and local processing, Sentinel ensures that victim content is never uploaded to a server in its original form, while providing robust tools for detection, matching, and legal remediation.

## Core Architecture: Privacy by Design

The system is built on a Zero-Knowledge architecture regarding source assets.

1.  **Secure Vault (Client-Side):**
    *   **Local Processing:** All video processing, including keyframe extraction and hashing, occurs within the browser environment (using WebAssembly/JS).
    *   **Cryptographic Fingerprinting:** Generates non-reversible perceptual hashes (pHash) and facial embeddings.
    *   **Data Minimization:** Original files are wiped from memory immediately after processing. Only the encrypted hashes are transmitted to the backend.

2.  **Detection Engine:**
    *   **Cross-Platform Scanning:** Simulates a crawler that monitors major social networks for matching content signatures.
    *   **Vector Database:** Utilizes a vector store (e.g., Milvus/FAISS) to perform similarity searches on the encrypted embeddings.
    *   **Risk Scoring:** Evaluates matches based on visual similarity, metadata analysis, and platform virality potential.

3.  **Remediation Workflow:**
    *   **Automated Legal Drafting:** Uses Google Gemini 2.5 AI to generate jurisdiction-specific legal takedown notices (DMCA, GDPR, LGPD).
    *   **Evidence Packaging:** Compiles a cryptographically signed package of evidence, including timestamps, hash matches, and metadata logs, for submission to platforms or law enforcement.

## System Features

*   **Dashboard:** Real-time overview of protected assets, active scans, and threat levels.
*   **Secure Upload:** Client-side drag-and-drop interface for registering content without server upload.
*   **URL Scanner:** Proactive tool for victims to check suspicious links against their secure vault.
*   **Match Review:** detailed interface for verifying potential matches and initiating takedowns.

## Tech Stack

*   **Frontend:** React 19, Tailwind CSS
*   **Routing:** React Router DOM
*   **Visualization:** Recharts
*   **AI Integration:** Google Gemini API (gemini-2.5-flash)
*   **Security:** Web Crypto API (SHA-256, AES-256 simulation)

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/sentinel.git
    cd sentinel
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Ensure you have a valid Google Gemini API Key.
    ```env
    API_KEY=your_google_api_key_here
    ```

4.  **Run Development Server:**
    ```bash
    npm start
    ```

## Security & Compliance

*   **Encryption:** All data in transit is secured via TLS 1.3. Data at rest is encrypted using AES-256.
*   **Auditability:** All actions (uploads, scans, takedowns) are logged to an immutable audit trail.
*   **RBAC:** Role-Based Access Control ensures strictly limited access to sensitive operations.

---
*Disclaimer: Sentinel is a technical solution to aid in content protection. Effectiveness depends on platform cooperation and legal jurisdiction.*