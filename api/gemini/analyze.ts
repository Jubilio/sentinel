import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl, imageBase64 } = req.body;

  if (!imageUrl && !imageBase64) {
    return res.status(400).json({ error: 'imageUrl or imageBase64 required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'api_key_not_configured',
      message: 'GEMINI_API_KEY not set in environment'
    });
  }

  try {
    // Get image as base64 if URL provided
    let base64Data = imageBase64;
    if (imageUrl && !imageBase64) {
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        return res.status(502).json({ error: 'image_fetch_failed', status: imgResponse.status });
      }
      const buffer = await imgResponse.arrayBuffer();
      base64Data = Buffer.from(buffer).toString('base64');
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Data
                }
              },
              {
                text: `Analyze this image for explicit/intimate content. Provide scores (0-100):

nudityScore: Amount of nudity, intimate body parts, or sexual content visible
riskScore: Overall risk of this being Non-Consensual Intimate Imagery (NCII)
confidence: How certain are you about these scores?

Return ONLY a valid JSON object in this exact format:
{"nudityScore": <number>, "riskScore": <number>, "confidence": <number>}`
              }
            ]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return res.status(502).json({
        error: 'gemini_api_error',
        status: geminiResponse.status,
        details: errorText
      });
    }

    const geminiData = await geminiResponse.json() as any;
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({
        error: 'parse_failed',
        rawResponse: text
      });
    }

    const scores = JSON.parse(jsonMatch[0]);

    return res.json({
      success: true,
      method: 'gemini',
      analysis: {
        nudityScore: Math.min(Math.max(scores.nudityScore || 0, 0), 100),
        riskScore: Math.min(Math.max(scores.riskScore || 0, 0), 100),
        confidence: Math.min(Math.max(scores.confidence || 50, 0), 100),
        reasoning: 'Analyzed via Gemini Vision API'
      }
    });

  } catch (err: any) {
    console.error('Gemini analysis failed:', err);
    return res.status(500).json({
      error: 'analysis_failed',
      details: err.message
    });
  }
}
