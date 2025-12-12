import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }

  let browser = null;
  try {
    // Determine executable path based on environment
    // For Vercel/AWS Lambda: use @sparticuz/chromium
    // For Local: We assume this runs in Vercel env, but we can try to find local chrome if needed
    // However, locally the user runs the Express server (server/proxy.ts), so this file is mostly for Production.
    
    // Configure for Vercel Serverless
    chromium.setGraphicsMode = false;
    
    browser = await puppeteer.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    } as any);

    const page = await browser.newPage();
    
    // Stealth & Viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 8000 }); // 8s navigation timeout due to serverless limits

    // Try basic age gate handling
    const entrySelectors = ['#enter', '.enter-button', '[name="submit"]', 'button.age-verification'];
    try {
        for (const sel of entrySelectors) {
            if (await page.$(sel)) {
                await page.click(sel).catch(() => {});
                await new Promise(r => setTimeout(r, 500));
            }
        }
    } catch (e) {
        // ignore interaction errors
    }

    // Capture Screenshot
    const screenshotBuffer = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 75 });
    const title = await page.title();

    await browser.close();
    browser = null;

    return res.json({
      success: true,
      title,
      screenshot: screenshotBuffer,
      platform: 'Vercel Serverless Scanner'
    });

  } catch (error: any) {
    console.error('Serverless Scan Error:', error);
    if (browser) await browser.close();
    return res.status(500).json({ 
        error: 'scan_failed', 
        details: error.message,
        hint: 'This function requires Vercel Serverless environment with increased memory.' 
    });
  }
}
