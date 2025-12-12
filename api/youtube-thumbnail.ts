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

  try {
    const parsed = new URL(url);
    let videoId: string | null = null;

    // Handle various YouTube URL formats
    if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.slice(1).split('?')[0];
    } else if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2];
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/')[2];
      } else {
        videoId = parsed.searchParams.get('v');
      }
    }

    if (!videoId || videoId.length !== 11) {
      return res.status(400).json({ 
        error: 'invalid_youtube_url', 
        message: 'Could not extract video ID' 
      });
    }

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    return res.json({
      success: true,
      videoId,
      thumbnailUrl,
      allThumbnails: {
        default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
        medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
    });
  } catch (err: any) {
    return res.status(400).json({ error: 'parse_failed', details: err.message });
  }
}
