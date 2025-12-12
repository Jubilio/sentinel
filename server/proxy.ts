import 'dotenv/config';
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dns from "dns/promises";
import { URL } from "url";

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: 'rate_limit_exceeded', retryAfter: '60s' }
});
app.use(limiter);

// Helper: Validate URL and block private IP ranges (SSRF protection)
async function validateAndResolve(urlStr: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error("Invalid URL format");
  }
  
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP/HTTPS protocols allowed");
  }

  // Resolve DNS and check for private addresses
  const host = parsed.hostname;
  try {
    const ips = await dns.lookup(host, { all: true });
    for (const r of ips) {
      const ip = r.address;
      // Block private IP ranges
      if (
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        ip.startsWith("172.16.") || ip.startsWith("172.17.") || ip.startsWith("172.18.") ||
        ip.startsWith("172.19.") || ip.startsWith("172.20.") || ip.startsWith("172.21.") ||
        ip === "127.0.0.1" || ip === "::1" ||
        ip.startsWith("169.254.") ||
        ip === "0.0.0.0"
      ) {
        throw new Error("Refusing to fetch private IP ranges");
      }
    }
  } catch (err: any) {
    if (err.message.includes("private")) throw err;
    throw new Error(`DNS resolution failed: ${err.message}`);
  }
  
  return parsed;
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    endpoints: ['/proxy', '/youtube-thumbnail', '/gemini/analyze']
  });
});

// Generic proxy endpoint with security measures
app.get('/proxy', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  
  if (!url) {
    return res.status(400).json({ error: 'url query parameter required' });
  }

  try {
    await validateAndResolve(url);
  } catch (err: any) {
    return res.status(400).json({ error: 'validation_failed', details: err.message });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ 
        error: 'upstream_error', 
        status: response.status,
        statusText: response.statusText 
      });
    }

    const contentType = response.headers.get('content-type') || 'text/plain';
    const buffer = await response.arrayBuffer();
    
    // Limit response size to 5MB
    if (buffer.byteLength > 5_000_000) {
      return res.status(413).json({ error: 'response_too_large', maxSize: '5MB' });
    }
    
    res.setHeader('Content-Type', contentType);
    return res.send(Buffer.from(buffer));
    
  } catch (err: any) {
    console.error('Proxy fetch error:', err.message);
    return res.status(502).json({ 
      error: 'fetch_failed', 
      details: err.name === 'AbortError' ? 'Request timeout' : err.message 
    });
  }
});

// Fast path: YouTube thumbnail extraction (no CORS issues)
app.get('/youtube-thumbnail', (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'url query parameter required' });
    }

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
      return res.status(400).json({ error: 'invalid_youtube_url', message: 'Could not extract video ID' });
    }

    // Return thumbnail URL (YouTube thumbnails are publicly accessible)
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
});

// Facebook thumbnail extraction (fetch + parse og:image)
app.get('/facebook-thumbnail', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  
  if (!url) {
    return res.status(400).json({ error: 'url query parameter required' });
  }

  // Validate it's a Facebook URL
  if (!url.includes('facebook.com') && !url.includes('fb.com') && !url.includes('fb.watch')) {
    return res.status(400).json({ error: 'invalid_url', message: 'Not a Facebook URL' });
  }

  try {
    await validateAndResolve(url);
  } catch (err: any) {
    return res.status(400).json({ error: 'validation_failed', details: err.message });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ 
        error: 'upstream_error', 
        status: response.status,
        message: 'Facebook returned an error. The post may be private or require login.'
      });
    }

    const html = await response.text();
    
    // Parse Open Graph meta tags using regex (cheerio alternative for simple parsing)
    // Look for og:image first
    let thumbnail = 
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1];
    
    // Fallback to og:video:thumbnail or video poster
    if (!thumbnail) {
      thumbnail = 
        html.match(/<meta[^>]*property=["']og:video:thumbnail_url["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]*property=["']og:video:secure_url["'][^>]*content=["']([^"']+)["']/i)?.[1];
    }

    // Extract title
    const title = 
      html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
      'Facebook Content';

    // Extract description
    const description = 
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      '';

    if (!thumbnail) {
      return res.status(404).json({ 
        error: 'thumbnail_not_found',
        message: 'Could not extract thumbnail. The post may be private, require login, or have no image.',
        suggestion: 'Try having the user upload a screenshot instead.'
      });
    }

    // Unescape HTML entities in thumbnail URL
    thumbnail = thumbnail
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    return res.json({
      success: true,
      platform: 'Facebook',
      thumbnailUrl: thumbnail,
      title: title.replace(/&amp;/g, '&').replace(/&#x27;/g, "'"),
      description: description.substring(0, 200)
    });

  } catch (err: any) {
    console.error('Facebook thumbnail error:', err.message);
    return res.status(502).json({ 
      error: 'fetch_failed', 
      details: err.name === 'AbortError' ? 'Request timeout' : err.message,
      suggestion: 'The Facebook page could not be accessed. Try having the user upload a screenshot.'
    });
  }
});

// Proxy endpoint for images (returns base64 for direct embedding)
app.get('/proxy/image', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  
  if (!url) {
    return res.status(400).json({ error: 'url query parameter required' });
  }

  try {
    await validateAndResolve(url);
  } catch (err: any) {
    return res.status(400).json({ error: 'validation_failed', details: err.message });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: 'image_fetch_failed', status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    
    // Limit image size to 10MB
    if (buffer.byteLength > 10_000_000) {
      return res.status(413).json({ error: 'image_too_large', maxSize: '10MB' });
    }
    
    const base64 = Buffer.from(buffer).toString('base64');
    
    return res.json({
      success: true,
      contentType,
      size: buffer.byteLength,
      data: base64,
      dataUrl: `data:${contentType};base64,${base64}`
    });
    
  } catch (err: any) {
    console.error('Image proxy error:', err.message);
    return res.status(502).json({ 
      error: 'image_fetch_failed', 
      details: err.name === 'AbortError' ? 'Request timeout' : err.message 
    });
  }
});

// Server-side Gemini API call (keeps API key secure)
app.post('/gemini/analyze', async (req: Request, res: Response) => {
  const { imageUrl, imageBase64 } = req.body;
  
  if (!imageUrl && !imageBase64) {
    return res.status(400).json({ error: 'imageUrl or imageBase64 required' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'api_key_not_configured',
      message: 'Set GEMINI_API_KEY environment variable'
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
        reasoning: 'Analyzed via Gemini Vision API (server-side)'
      }
    });

  } catch (err: any) {
    console.error('Gemini analysis failed:', err);
    return res.status(500).json({ 
      error: 'analysis_failed', 
      details: err.message 
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal_server_error', message: err.message });
});

// Start server
// Advanced Scan: Use Puppeteer to screenshot page (bypass bot detection/CORS)
import puppeteer from 'puppeteer';

app.get('/advanced-scan', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set stealthy user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      // Try to click "I am 18" or "Enter" buttons if they exist
      const entrySelectors = ['#enter', '.enter-button', '[name="submit"]', 'button.age-verification'];
      for (const sel of entrySelectors) {
          if (await page.$(sel)) {
              await page.click(sel).catch(() => {});
              await new Promise(r => setTimeout(r, 1000));
          }
      }

    } catch (e) {
      // Continue even if timeout, page might be partially loaded
    }

    // Take screenshot of the view
    const screenshotBuffer = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 80 });
    
    // Get page title
    const title = await page.title();
    
    await browser.close();

    return res.json({
      success: true,
      title,
      screenshot: screenshotBuffer, // Base64 string
      platform: 'Advanced Scanner'
    });

  } catch (err: any) {
    console.error('Puppeteer scan failed:', err);
    return res.status(500).json({ error: 'scan_failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🛡️  Sentinel Proxy Server running on http://localhost:${PORT}`);
  console.log(`\n   Endpoints:`);
  console.log(`   ├─ GET  /health                         Health check`);
  console.log(`   ├─ GET  /proxy?url=<url>                Generic URL proxy`);
  console.log(`   ├─ GET  /advanced-scan?url=<url>        Puppeteer Scanner`);
  console.log(`   ├─ GET  /youtube-thumbnail?url=<url>    YouTube thumbnail`);
  console.log(`   ├─ GET  /facebook-thumbnail?url=<url>   Facebook thumbnail`);
  console.log(`   └─ POST /gemini/analyze                 AI content analysis`);
  console.log(`\n   Environment:`);
  console.log(`   └─ GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ configured' : '✗ not set'}`);
  console.log('');
});
