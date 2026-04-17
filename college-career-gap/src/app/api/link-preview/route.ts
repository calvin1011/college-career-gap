import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

function isAllowedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);

    // Only allow http and https schemes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and loopback
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return false;
    }

    // Block private/internal IP ranges
    const parts = hostname.split('.').map(Number);
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
      // 10.x.x.x
      if (parts[0] === 10) return false;
      // 172.16.x.x - 172.31.x.x
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      // 192.168.x.x
      if (parts[0] === 192 && parts[1] === 168) return false;
      // 169.254.x.x (link-local / cloud metadata)
      if (parts[0] === 169 && parts[1] === 254) return false;
      // 0.x.x.x
      if (parts[0] === 0) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const getMetaTag = (name: string) => {
      return (
        $(`meta[property="og:${name}"]`).attr('content') ||
        $(`meta[name="${name}"]`).attr('content') ||
        ''
      );
    };

    const title = getMetaTag('title') || $('title').text();
    const description = getMetaTag('description');
    const image = getMetaTag('image');
    const domain = new URL(url).hostname;

    return NextResponse.json({
      title,
      description,
      image,
      domain,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: `Failed to get link preview: ${(error as Error).message}` }, { status: 500 });
  }
}
