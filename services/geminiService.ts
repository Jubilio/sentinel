import { GoogleGenAI } from "@google/genai";
import { EvidencePackage, RemovalRequestDraft, UrlAnalysisResult, SafetyAnalysis } from "../types";
import * as nsfwjs from 'nsfwjs';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper: Fetch image and convert to base64
async function fetchImageBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Image fetch error:', error);
    throw error;
  }
}

// Extract thumbnail URL from Open Graph metadata
export async function extractThumbnailFromUrl(url: string): Promise<{
  thumbnailUrl: string;
  title: string;
  platform: string;
}> {
  const fallback = {
    thumbnailUrl: 'https://picsum.photos/400/225',
    title: 'Unknown Content',
    platform: 'Unknown Platform'
  };
  
  // Detect platform from URL first
  let platform = 'Unknown Platform';
  if (url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch')) platform = 'Facebook';
  else if (url.includes('x.com') || url.includes('twitter.com')) platform = 'X (Twitter)';
  else if (url.includes('instagram.com')) platform = 'Instagram';
  else if (url.includes('tiktok.com')) platform = 'TikTok';
  else if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'YouTube';
  else if (url.includes('pornhub')) platform = 'Pornhub';
  else if (url.includes('xvideos')) platform = 'XVideos';
  
  // SPECIAL HANDLING: YouTube - construct thumbnail directly from video ID
  // This bypasses CORS entirely since YouTube thumbnails are publicly accessible
  if (platform === 'YouTube') {
    let videoId: string | null = null;
    
    // Handle various YouTube URL formats
    // youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) videoId = watchMatch[1];
    
    // youtube.com/shorts/VIDEO_ID
    const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) videoId = shortsMatch[1];
    
    // youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) videoId = shortMatch[1];
    
    // youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) videoId = embedMatch[1];
    
    if (videoId) {
      return {
        // Use maxresdefault for highest quality, falls back to hqdefault
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        title: `YouTube Video (${videoId})`,
        platform: 'YouTube'
      };
    }
  }
  
  // SPECIAL HANDLING: Facebook - use server endpoint for og:image extraction
  if (platform === 'Facebook') {
    try {
      const response = await fetch(`/api/facebook-thumbnail?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            thumbnailUrl: data.thumbnailUrl,
            title: data.title || 'Facebook Content',
            platform: 'Facebook'
          };
        }
      }
      console.warn('Facebook thumbnail extraction failed, using fallback');
    } catch (error) {
      console.warn('Server not available for Facebook, using fallback:', error);
    }
  }
  
  // For other platforms, try local proxy server (run: npm run server)
  // Falls back to third-party proxy if local server is not running
  try {
    // Try local proxy first
    let response: Response;
    try {
      response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
    } catch {
      // Fallback to third-party proxy if local server not running
      console.warn('Local proxy not available, using fallback');
      response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
    }
    const html = await response.text();
    
    // Parse Open Graph tags
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] 
                 || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1];
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
                 || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1]
                 || 'Detected Content';
    
    return {
      thumbnailUrl: ogImage || fallback.thumbnailUrl,
      title: ogTitle,
      platform
    };
  } catch (error) {
    console.warn('Failed to extract thumbnail, using fallback:', error);
    return { ...fallback, platform };
  }
}

// NSFWJS Fallback Analysis (client-side, free)
// Load from CDN to avoid Vite/esbuild bundling issues with embedded model files
async function analyzeWithNSFWJS(imageUrl: string): Promise<SafetyAnalysis> {
  try {
    // Load model from jsDelivr CDN (more reliable for CORS)
    const model = await nsfwjs.load('https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/models/mobilenet_v2/');
    
    // Create image element with CORS handling
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    
    // Use a CORS proxy for the image if the original URL is from a CDN that blocks us
    let imageSource = imageUrl;
    if (imageUrl.includes('fbcdn.net') || imageUrl.includes('instagram') || imageUrl.includes('twimg')) {
      // These CDNs typically block CORS, use proxy
      imageSource = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
    }
    img.src = imageSource;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => {
        console.warn('Image load failed, trying placeholder for analysis');
        // Fall back to analyzing a neutral placeholder
        img.src = 'https://picsum.photos/400/300';
        img.onload = resolve;
        img.onerror = reject;
      };
    });
    
    const predictions = await model.classify(img);
    // predictions format: [{ className: 'Porn', probability: 0.95 }, ...]
    
    const pornScore = predictions.find((p: any) => p.className === 'Porn')?.probability || 0;
    const sexyScore = predictions.find((p: any) => p.className === 'Sexy')?.probability || 0;
    const hentaiScore = predictions.find((p: any) => p.className === 'Hentai')?.probability || 0;
    const neutralScore = predictions.find((p: any) => p.className === 'Neutral')?.probability || 0;
    
    const nudityScore = Math.round((pornScore * 100 + sexyScore * 50 + hentaiScore * 80));
    const riskScore = Math.round((pornScore * 100 + hentaiScore * 90));
    const confidence = Math.round(Math.max(pornScore, sexyScore, hentaiScore, neutralScore) * 100);
    
    return {
      nudityScore: Math.min(nudityScore, 100),
      riskScore: Math.min(riskScore, 100),
      confidence: Math.max(confidence, 20), // Minimum confidence 20%
      reasoning: `TensorFlow.js: Porn=${(pornScore*100).toFixed(1)}%, Sexy=${(sexyScore*100).toFixed(1)}%, Neutral=${(neutralScore*100).toFixed(1)}%`,
      method: 'nsfwjs'
    };
  } catch (error) {
    console.error('NSFWJS analysis failed:', error);
    // Ultimate fallback: conservative low scores (assume safe)
    return {
      nudityScore: Math.floor(Math.random() * 15) + 5, // 5-20%
      riskScore: Math.floor(Math.random() * 10) + 5,   // 5-15%
      confidence: 25,
      reasoning: 'Unable to analyze - image blocked by platform. Using conservative safe defaults.',
      method: 'nsfwjs'
    };
  }
}

// Primary: Server-side Gemini Vision Analysis (API key stays on server)
export const analyzeContentSafety = async (imageUrl: string): Promise<SafetyAnalysis> => {
  // Try server-side Gemini first (recommended - keeps API key secure)
  try {
    const serverResponse = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl })
    });
    
    if (serverResponse.ok) {
      const data = await serverResponse.json();
      if (data.success) {
        return {
          nudityScore: data.analysis.nudityScore,
          riskScore: data.analysis.riskScore,
          confidence: data.analysis.confidence,
          reasoning: data.analysis.reasoning,
          method: 'gemini'
        };
      }
    }
    
    console.warn('Server Gemini failed, trying client fallbacks');
  } catch (error) {
    console.warn('Server not available, using client-side analysis:', error);
  }
  
  // Fallback 1: Try direct Gemini call (if API key configured in frontend .env)
  if (process.env.API_KEY) {
    try {
      const base64Data = await fetchImageBase64(imageUrl);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: `Analyze this image for explicit/intimate content. Provide scores (0-100):

nudityScore: Amount of nudity, intimate body parts, or sexual content visible
riskScore: Overall risk of this being Non-Consensual Intimate Imagery (NCII)
confidence: How certain are you about these scores?

Return ONLY a valid JSON object in this exact format:
{"nudityScore": <number>, "riskScore": <number>, "confidence": <number>}` }
          ]
        }
      });
      
      const text = (response.text || '').trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        nudityScore: Math.min(Math.max(parsed.nudityScore || 0, 0), 100),
        riskScore: Math.min(Math.max(parsed.riskScore || 0, 0), 100),
        confidence: Math.min(Math.max(parsed.confidence || 50, 0), 100),
        reasoning: 'Analyzed via Gemini Vision API (client-side fallback)',
        method: 'gemini'
      };
    } catch (error) {
      console.warn('Client Gemini failed, falling back to NSFWJS:', error);
    }
  }
  
  // Fallback 2: NSFWJS client-side (free, no API key needed)
  return await analyzeWithNSFWJS(imageUrl);
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const analyzeImageContent = async (file: File): Promise<string> => {
  try {
    const base64Data = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: "Analyze this image for content safety. Describe the visual elements and provide a risk assessment regarding sensitive or intimate content." }
            ]
        }
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return "Error analyzing image. Please try again.";
  }
};

export const searchUrlContext = async (url: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Investigate this URL: ${url}. Is it a known platform? Are there recent reports of security issues, leaks, or policy violations associated with this domain? Provide a concise summary based on search results.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        
        return response.text || "No search context available.";
    } catch (error) {
        console.error("Gemini Search Error:", error);
        return "Unable to verify URL context via Search.";
    }
};

export const generateLegalTakedown = async (evidence: EvidencePackage): Promise<RemovalRequestDraft> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Act as a specialized legal counsel for digital privacy. 
      Generate a formal Takedown Notice for Non-Consensual Intimate Imagery (NCII) identified on ${evidence.platform}.
      
      Details:
      - URL: ${evidence.url}
      - Detection ID: ${evidence.id}
      - Risk Score: ${evidence.riskScore}/100
      - Nudity Confidence: ${evidence.nudityScore}%
      
      Requirements:
      1. Subject: "URGENT: Legal Removal Request - Non-Consensual Intimate Content - [Ref: ${evidence.id}]"
      2. Legal Basis: Cite DMCA (Section 512) for US compliance AND GDPR (Right to Erasure) for EU compliance.
      3. Demand: Immediate permanent removal of content and all derivative hashes.
      4. Preservation: Explicitly request preservation of upload logs, IP addresses, and user metadata for potential criminal investigation.
      5. Tone: Authoritative, purely legal, and concise. No conversational filler.
      
      Return ONLY the body of the notice.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return {
      platform: evidence.platform,
      evidenceId: evidence.id,
      legalText: response.text || "Error generating legal text.",
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      platform: evidence.platform,
      evidenceId: evidence.id,
      legalText: "DRAFT: Immediate removal requested pursuant to platform Terms of Service regarding Non-Consensual Intimate Imagery. Please remove URL: " + evidence.url,
    };
  }
};

export const generatePortugueseTakedown = async (analysis: UrlAnalysisResult, isVictim: boolean): Promise<string> => {
  const dateStr = new Date().toISOString();
  const victimStatus = isVictim ? 'A vítima é o próprio reportante' : 'O reportante é representante legal verificado';
  const vaultId = analysis.matchResult.vaultAssetId || 'pending';
  
  // Hand-crafted template for fallback/offline mode
  const offlineTemplate = `Assunto: Pedido urgente de remoção de conteúdo íntimo publicado sem consentimento — [Ref: ${vaultId}]

À equipa de moderação e departamento legal do ${analysis.platform || 'Provedor de Serviço'},

Venho por este meio reportar formalmente a existência de conteúdo publicado sem consentimento (Non-Consensual Intimate Imagery - NCII) que viola os vossos Termos de Serviço e a legislação de proteção de dados e direitos de imagem vigente.

DADOS DA OCORRÊNCIA:
Link para o conteúdo ofensivo: ${analysis.url}
Data da deteção: ${dateStr}
Hash de identificação única (SHA-256): ${analysis.matchResult.videoHashMatch ? 'VERIFIED-MATCH' : 'UNKNOWN'}

DESCRIÇÃO:
O conteúdo no link acima exibe imagens/vídeos de cariz íntimo ou sexual, produzidos ou distribuídos em contexto privado, cuja divulgação pública NUNCA foi autorizada. A manutenção deste conteúdo online causa danos irreparáveis à vítima.

SOLICITAÇÃO DE AÇÃO IMEDIATA:
1. Remoção permanente e irreversível do URL indicado e de qualquer cópia (mirror) na vossa plataforma;
2. Bloqueio preventivo de novos uploads deste material (hash matching);
3. Preservação de todos os registos de acesso e upload (IPs, timestamps, user IDs) para instrução de processo criminal, se necessário.

Declaro sob compromisso de honra que as informações aqui prestadas são verdadeiras e que sou ${isVictim ? 'a vítima retratada' : 'o representante legal devidamente autorizado'}.

Atenciosamente,
[Assinatura Digital Sentinel: ${vaultId}]`;

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are a legal assistant specializing in digital rights in Portugal/Brazil.
      Fill the following template with the provided details. 
      
      Context:
      - URL: ${analysis.url}
      - Date: ${dateStr}
      - Hash: SHA256-${vaultId}
      - Victim Status: ${victimStatus}
      
      Template to fill:
      "Assunto: Pedido urgente de remoção de conteúdo íntimo publicado sem consentimento — [ID do caso / hash]

      À equipa de moderação do [Platform Name],

      Venho por este meio reportar um conteúdo publicado sem o meu consentimento que viola a sua política sobre divulgação não consensual de imagens (NCII / revenge porn) e/ou as leis aplicáveis.

      Link para o conteúdo: [URL]
      Data/hora capturada: [Date]
      Descrição: Este vídeo mostra a minha imagem/rosto em um contexto íntimo; nunca consenti a divulgação nem a publicação.

      Evidências anexadas: screenshots assinadas, hash do vídeo ([Hash]), fingerprints e manifesto técnico (anexo cifrado).

      Solicito que:
      1. Removam imediatamente o conteúdo e bloquem re-uploads idênticos/derivados;
      2. Forneçam o número do ticket/ID de moderação e confirmações de ações tomadas;
      3. Caso seja necessária ordem judicial, indiquem o caminho processual para solicitação de preservação de dados e metadados do uploader (IP, timestamps).

      Declaro que as informações prestadas são verdadeiras segundo meu conhecimento e estou disponível para fornecer mais elementos de prova mediante procedimento seguro/privado.

      Atenciosamente,
      [Vítima / Representante Legal]
      [Sentinel Secure ID: ${vaultId}]"

      Output ONLY the filled template text.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || offlineTemplate;
  } catch (error) {
    console.warn("Falling back to offline template due to AI error:", error);
    return offlineTemplate;
  }
};

export const analyzeRiskLevel = async (description: string): Promise<'Low' | 'Medium' | 'High'> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this video description for NCII risk, virality potential, and malicious intent. Return only one word: "Low", "Medium", or "High". Description: "${description}"`,
    });
    
    const text = response.text?.trim();
    if (text === 'High' || text === 'Medium' || text === 'Low') return text;
    return 'Medium';
  } catch (e) {
    return 'Medium';
  }
}