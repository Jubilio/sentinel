import React, { useState } from 'react';
import { Icons } from '../constants';

const TechSpecSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8 animate-fade-in">
    <h3 className="text-lg font-bold text-brand-400 mb-4 border-b border-brand-900/50 pb-2">{title}</h3>
    <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-800 text-sm text-slate-300">
      {children}
    </div>
  </div>
);

const DiagramNode: React.FC<{ label: string; icon?: React.ReactNode; type?: 'service' | 'db' | 'user' }> = ({ label, icon, type = 'service' }) => (
  <div className={`
    flex flex-col items-center justify-center p-4 rounded-lg border shadow-lg w-32 h-24 text-center transition-all hover:scale-105
    ${type === 'user' ? 'bg-slate-700 border-slate-600' : ''}
    ${type === 'service' ? 'bg-slate-800 border-brand-700/50 text-brand-100' : ''}
    ${type === 'db' ? 'bg-slate-900 border-blue-900/50 text-blue-200' : ''}
  `}>
    <div className="mb-2 opacity-80">{icon}</div>
    <span className="text-xs font-semibold">{label}</span>
  </div>
);

const Arrow: React.FC = () => (
  <div className="text-slate-600 flex items-center px-2">→</div>
);

const ArchitectureViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'diagram' | 'specs' | 'db'>('diagram');

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Icons.Activity />
            <span>System Architecture & Engineering</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Technical specifications for the Sentinel Privacy-Preserving Platform.
        </p>
      </header>

      <div className="flex space-x-4 mb-8 border-b border-slate-800">
        <button 
            onClick={() => setActiveTab('diagram')}
            className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'diagram' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
            Architecture Diagram
        </button>
        <button 
            onClick={() => setActiveTab('specs')}
            className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'specs' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
            Technical Specs
        </button>
        <button 
            onClick={() => setActiveTab('db')}
            className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'db' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
            Database Schema
        </button>
      </div>

      {activeTab === 'diagram' && (
        <div className="space-y-12">
            <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 overflow-x-auto">
                <h4 className="text-center text-slate-500 text-xs uppercase tracking-widest mb-8">Data Flow: Ingestion & Matching</h4>
                
                <div className="flex items-center justify-center space-x-4 min-w-[800px]">
                    <div className="flex flex-col space-y-4">
                        <DiagramNode label="Victim Device" type="user" icon={<Icons.Shield />} />
                    </div>
                    
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-brand-500 mb-1">Encrypted Payload (TLS 1.3)</span>
                        <Arrow />
                    </div>

                    <div className="p-6 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/30">
                        <p className="text-[10px] text-slate-500 mb-4 text-center uppercase">Kubernetes Cluster (Private VPC)</p>
                        <div className="grid grid-cols-2 gap-8">
                            <DiagramNode label="API Gateway (Kong)" icon={<Icons.Lock />} />
                            <DiagramNode label="Ingestion Service" icon={<Icons.Upload />} />
                            <DiagramNode label="Matching Engine" icon={<Icons.Search />} />
                            <DiagramNode label="Crawler Service" icon={<Icons.Globe />} />
                        </div>
                    </div>

                    <Arrow />

                    <div className="flex flex-col space-y-4">
                        <DiagramNode label="PostgreSQL (Meta)" type="db" />
                        <DiagramNode label="Milvus (Vectors)" type="db" />
                        <DiagramNode label="S3 (Encrypted)" type="db" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-850 rounded-lg border border-slate-700">
                    <h4 className="text-white font-semibold mb-2">Privacy Boundary</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        The "Victim Device" performs all extraction logic. The "Kubernetes Cluster" never sees the original video file, only the mathematical representation (hashes/vectors).
                    </p>
                </div>
                <div className="p-6 bg-slate-850 rounded-lg border border-slate-700">
                    <h4 className="text-white font-semibold mb-2">Vector Search</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        Milvus DB stores 512-dimension vectors. Matching is done via HNSW (Hierarchical Navigable Small World) index for <100ms latency on 10M+ records.
                    </p>
                </div>
                <div className="p-6 bg-slate-850 rounded-lg border border-slate-700">
                    <h4 className="text-white font-semibold mb-2">Compliance</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        PostgreSQL uses TDE (Transparent Data Encryption). S3 buckets use Server-Side Encryption with Customer-Provided Keys (SSE-C) managed by Vault.
                    </p>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'specs' && (
        <div>
            <TechSpecSection title="1. High Security Principles">
                <ul className="list-disc list-inside space-y-2">
                    <li><strong className="text-white">Processing:</strong> Images processed locally (WASM). No raw uploads.</li>
                    <li><strong className="text-white">Encryption:</strong> AES-256 for storage, TLS 1.3 for transit.</li>
                    <li><strong className="text-white">Authentication:</strong> RBAC (Role-Based Access Control) + MFA for operators.</li>
                    <li><strong className="text-white">Audit:</strong> Immutable WORM logs for legal admissibility.</li>
                </ul>
            </TechSpecSection>

            <TechSpecSection title="2. Machine Learning Stack">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-white font-medium mb-1">Fingerprinting</h4>
                        <p>Robust perceptual hashing (pHash, dHash) tolerant to compression and resize attacks.</p>
                    </div>
                    <div>
                        <h4 className="text-white font-medium mb-1">Face Recognition</h4>
                        <p>ArcFace/FaceNet models generating 512d embeddings. Threshold set to >0.6 cosine similarity.</p>
                    </div>
                </div>
            </TechSpecSection>

            <TechSpecSection title="3. API Endpoints">
                <pre className="bg-slate-950 p-4 rounded text-xs font-mono text-green-400 overflow-x-auto">
{`POST /v1/victim/register
  payload: { encrypted_metadata: "...", public_key: "..." }

POST /v1/evidence/upload
  payload: { case_id: "uuid", fingerprints: [...], iv: "..." }

GET /v1/matches/{case_id}
  response: { status: "active", matches: [{ url: "...", confidence: 98.5 }] }`}
                </pre>
            </TechSpecSection>
        </div>
      )}

      {activeTab === 'db' && (
        <div>
             <TechSpecSection title="Database Schema (PostgreSQL)">
                <p className="mb-4">
                    The database uses UUIDs for primary keys to prevent enumeration attacks and separate encryption keys per user context.
                </p>
                <pre className="bg-slate-950 p-4 rounded text-xs font-mono text-blue-300 overflow-x-auto">
{`TABLE users (
  id UUID PRIMARY KEY,
  email_hash VARCHAR(64) UNIQUE,
  public_key TEXT
);

TABLE fingerprints (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  hash_type VARCHAR(20),
  hash_value VARCHAR(256), -- Deterministic
  milvus_id BIGINT
);

TABLE matches (
  id UUID PRIMARY KEY,
  source_url TEXT,
  confidence_score DECIMAL,
  status VARCHAR(20),
  evidence_s3_key VARCHAR
);`}
                </pre>
            </TechSpecSection>
        </div>
      )}
    </div>
  );
};

export default ArchitectureViewer;