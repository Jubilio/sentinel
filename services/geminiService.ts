import { GoogleGenAI } from "@google/genai";
import { EvidencePackage, RemovalRequestDraft, UrlAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  try {
    const model = 'gemini-2.5-flash';
    const dateStr = new Date().toISOString();
    const prompt = `
      You are a legal assistant specializing in digital rights in Portugal/Brazil.
      Fill the following template with the provided details. 
      
      Context:
      - URL: ${analysis.url}
      - Date: ${dateStr}
      - Hash: SHA256-${analysis.matchResult.vaultAssetId || 'UNKNOWN'}
      - Victim Status: ${isVictim ? 'The reporter is the victim' : 'The reporter is a verified legal representative'}
      
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
      [Sentinel Secure ID: ${analysis.matchResult.vaultAssetId || 'pending'}]"

      Output ONLY the filled template text.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "Erro ao gerar texto legal.";
  } catch (error) {
    return "Erro de conexão com o serviço de IA.";
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