import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.query.url as string;

  if (!url) {
    return res.status(400).json({ error: 'url query parameter required' });
  }

  // Validate Facebook URL
  if (!url.includes('facebook.com') && !url.includes('fb.com') && !url.includes('fb.watch')) {
    return res.status(400).json({ error: 'invalid_url', message: 'Not a Facebook URL' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({
        error: 'upstream_error',
        status: response.status,
        message: 'Facebook may require login for this content'
      });
    }

    const html = await response.text();

    // Parse og:image
    let thumbnail =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1];

    // Fallback to video thumbnail
    if (!thumbnail) {
      thumbnail =
        html.match(/<meta[^>]*property=["']og:video:thumbnail_url["'][^>]*content=["']([^"']+)["']/i)?.[1];
    }

    // Extract title
    const title =
      html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      'Facebook Content';

    if (!thumbnail) {
      return res.status(404).json({
        error: 'thumbnail_not_found',
        message: 'Could not extract thumbnail. Post may be private.',
        suggestion: 'Try uploading a screenshot instead.'
      });
    }

    // Unescape HTML entities
    thumbnail = thumbnail.replace(/&amp;/g, '&');

    return res.json({
      success: true,
      platform: 'Facebook',
      thumbnailUrl: thumbnail,
      title: title.replace(/&amp;/g, '&').replace(/&#x27;/g, "'")
    });

  } catch (err: any) {
    console.error('Facebook thumbnail error:', err.message);
    return res.status(502).json({
      error: 'fetch_failed',
      details: err.name === 'AbortError' ? 'Request timeout' : err.message,
      suggestion: 'Try uploading a screenshot instead.'
    });
  }
}
