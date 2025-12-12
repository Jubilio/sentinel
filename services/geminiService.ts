import { GoogleGenAI } from "@google/genai";
import { EvidencePackage, RemovalRequestDraft, UrlAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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