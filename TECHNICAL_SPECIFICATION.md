# Sentinel: Technical Architecture & Security Specification

## 1. System Overview
Sentinel is a privacy-first platform for detecting and removing Non-Consensual Intimate Imagery (NCII). The architecture adheres to **Privacy by Design** principles, ensuring victim data is encrypted client-side before transmission.

### Core Philosophy
- **Zero-Knowledge Storage:** The platform stores fingerprints, not source media.
- **Client-Side Processing:** Hashing and encryption occur in the user's browser (WASM).
- **Immutable Audit:** All actions are logged for legal chain-of-custody.

---

## 2. Infrastructure Architecture (Microservices)

The system is designed as a Kubernetes-orchestrated microservices cluster.

### Layers
1.  **Edge Layer:**
    -   **WAF (Cloudflare/AWS WAF):** DDoS protection, rate limiting.
    -   **API Gateway (Kong/Envoy):** SSL termination (TLS 1.3), Authentication (mTLS), Request validation.

2.  **Application Layer (K8s Pods):**
    -   **Auth Service:** Keycloak integration for RBAC (Victim, Moderator, Admin).
    -   **Ingestion Service:** Handles encrypted payloads from client.
    -   **Matching Engine:** Interfaces with Vector DB for similarity search.
    -   **Crawler Service:** Headless browsers (Puppeteer/Playwright) in sandboxed containers scanning public feeds.
    -   **Legal Service:** Generates PDFs and handles API submissions to platforms.

3.  **Data Layer:**
    -   **Primary DB:** PostgreSQL 16 with TDE (Transparent Data Encryption).
    -   **Vector DB:** Milvus or Weaviate (for 10M+ vector embeddings).
    -   **Object Storage:** S3 (Encrypted with AWS KMS) for Evidence Packages.
    -   **Cache:** Redis (Encrypted) for session management.

---

## 3. Security Specification (OWASP ASVS Level 2)

### Encryption Standards
-   **Data at Rest:** AES-256-GCM. Keys managed via HashiCorp Vault.
-   **Data in Transit:** TLS 1.3 only. HSTS enabled.
-   **Key Management:** Automatic key rotation every 90 days.

### Client-Side Security (Browser)
-   **WebAssembly (WASM):** Used for computationally intensive hashing (pHash) to keep data local.
-   **Memory Hygiene:** Explicit zeroing of memory buffers after processing.
-   **CSP (Content Security Policy):** Strict-dynamic, no inline scripts.

---

## 4. API Specification (OpenAPI Draft)

### Endpoints

#### `POST /v1/victim/register`
Registers a new case.
-   **Payload:** `{ "encrypted_metadata": "...", "public_key": "..." }`
-   **Response:** `{ "case_id": "uuid", "access_token": "jwt" }`

#### `POST /v1/evidence/upload`
Uploads the locally generated fingerprints.
-   **Headers:** `Authorization: Bearer <token>`
-   **Payload:**
    ```json
    {
      "case_id": "uuid",
      "fingerprints": [
        { "type": "pHash", "hash": "sha256...", "vector": [0.12, -0.4...] },
        { "type": "face_embedding", "vector": [...] }
      ],
      "encrypted_aes_key": "rsa_wrapped_key"
    }
    ```

#### `POST /v1/scan/url`
Submits a URL for analysis.
-   **Payload:** `{ "url": "https://..." }`
-   **Response:** `{ "risk_score": 95, "match_found": true }`

---

## 5. Machine Learning Pipeline

### Models
1.  **Video Fingerprinting:** Perceptual Hashing (pHash) + DCT (Discrete Cosine Transform).
2.  **Face Recognition:** ArcFace (onnx-runtime-web for client-side) generating 512d vectors.
3.  **NSFW Detection:** Quantized MobileNetV2 (Client-side) or NudeNet (Server-side sandbox) for filtering.

### Bias Mitigation
-   Threshold calibration across diverse demographic datasets.
-   Human-in-the-loop review for all automated takedowns.

---

## 6. Development Guidelines

### Secure Coding
-   **SAST:** SonarQube integrated into CI/CD.
-   **DAST:** OWASP ZAP scans on staging.
-   **Dependency Scanning:** Snyk for vulnerability checks.

### CI/CD Pipeline
1.  Checkout code.
2.  Run Unit Tests.
3.  SAST Scan.
4.  Build Docker Container (Distroless base image).
5.  Sign Image (Cosign).
6.  Deploy to Staging (Helm Chart).
