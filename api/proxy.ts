import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS headers for all requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper: Validate URL format and protocol
function validateUrl(urlStr: string): URL {
  const parsed = new URL(urlStr);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP/HTTPS protocols allowed');
  }
  return parsed;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const url = req.query.url as string;

  if (!url) {
    return res.status(400).json({ error: 'url query parameter required' });
  }

  try {
    validateUrl(url);
  } catch (err: any) {
    return res.status(400).json({ error: 'validation_failed', details: err.message });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({
        error: 'upstream_error',
        status: response.status
      });
    }

    const contentType = response.headers.get('content-type') || 'text/plain';
    const buffer = await response.arrayBuffer();

    // Limit to 4MB (Vercel response limit)
    if (buffer.byteLength > 4_000_000) {
      return res.status(413).json({ error: 'response_too_large', maxSize: '4MB' });
    }

    res.setHeader('Content-Type', contentType);
    return res.send(Buffer.from(buffer));

  } catch (err: any) {
    console.error('Proxy error:', err.message);
    return res.status(502).json({
      error: 'fetch_failed',
      details: err.name === 'AbortError' ? 'Request timeout' : err.message
    });
  }
}
