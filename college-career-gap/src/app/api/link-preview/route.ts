import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { lookup } from 'dns/promises';
import { checkRateLimit } from '@/lib/rateLimit';

function isAllowedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);

    // Only allow https scheme
    if (parsed.protocol !== 'https:') {
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

/** Resolve a hostname and confirm every returned address is public. */
async function isPublicHostname(hostname: string): Promise<boolean> {
  let addresses: string[];
  try {
    const results = await lookup(hostname, { all: true });
    addresses = results.map(r => r.address);
  } catch {
    return false; // DNS failure — block
  }

  for (const addr of addresses) {
    const parts = addr.split('.').map(Number);
    if (addr === '127.0.0.1' || addr === '::1') return false;
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
      if (parts[0] === 10) return false;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      if (parts[0] === 192 && parts[1] === 168) return false;
      if (parts[0] === 169 && parts[1] === 254) return false;
      if (parts[0] === 0) return false;
    }
  }
  return addresses.length > 0;
}

export async function GET(request: NextRequest) {
  // Rate limit: 30 previews per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const rl = checkRateLimit(`link-preview:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
  }

  // DNS rebinding guard: resolve hostname now and verify it's still public
  const hostname = new URL(url).hostname;
  if (!(await isPublicHostname(hostname))) {
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
