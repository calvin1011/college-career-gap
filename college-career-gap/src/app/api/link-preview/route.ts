import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { lookup } from 'dns';
import { Agent } from 'undici';
import { checkRateLimit } from '@/lib/rateLimit';
import * as ipaddr from 'ipaddr.js';

// Ranges that are never safe to fetch — covers IPv4 and IPv6 uniformly.
const BLOCKED_RANGES = new Set([
  'loopback',       // 127.0.0.0/8, ::1
  'private',        // 10/8, 172.16/12, 192.168/16
  'linkLocal',      // 169.254/16 (cloud metadata), fe80::/10
  'uniqueLocal',    // fc00::/7 (IPv6 ULA)
  'carrierGradeNat',// 100.64.0.0/10 (CGNAT)
  'unspecified',    // 0.0.0.0, ::
]);

/**
 * Return true if `addr` (a resolved IP string) is publicly routable.
 * Handles plain IPv4, plain IPv6, and IPv4-mapped IPv6 (::ffff:x.x.x.x /
 * the hex-compressed form the URL parser emits, e.g. ::ffff:7f00:1).
 */
function isPublicAddress(addr: string): boolean {
  try {
    const parsed = ipaddr.parse(addr);
    const range = parsed.range();

    // IPv4-mapped IPv6 — check the embedded IPv4 range
    if (range === 'ipv4Mapped') {
      return !BLOCKED_RANGES.has(
        (parsed as ipaddr.IPv6).toIPv4Address().range(),
      );
    }

    return !BLOCKED_RANGES.has(range);
  } catch {
    return false; // unparseable → block
  }
}

function isAllowedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);

    // Only allow https scheme
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block "localhost" by name
    if (hostname === 'localhost') {
      return false;
    }

    // If the hostname is a bare IP (IPv4) or a bracketed IPv6 literal,
    // validate it now before DNS ever runs.
    // URL.hostname wraps IPv6 in brackets: "[::1]" — strip them for ipaddr.
    const ipLiteral = hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname;

    if (ipaddr.isValid(ipLiteral)) {
      return isPublicAddress(ipLiteral);
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Build an Undici Agent whose `connect.lookup` validates the resolved IP at
 * connection time — atomically with the TCP handshake — so there is no TOCTOU
 * window between our IP check and the actual socket open.
 */
function makeSafeAgent(): Agent {
  return new Agent({
    connect: {
      lookup(hostname, options, callback) {
        lookup(hostname, { all: false }, (err, address, family) => {
          if (err) return callback(err, '', 4);
          if (!isPublicAddress(address as string)) {
            return callback(
              new Error(`Blocked: resolved IP ${address} is not publicly routable`),
              '',
              4,
            );
          }
          callback(null, address as string, family as number);
        });
      },
    },
  });
}

export async function GET(request: NextRequest) {
  // Rate limit: 30 previews per minute per IP.
  // Prefer request.ip (set by Next.js/Vercel from the trusted socket address)
  // and only fall back to X-Forwarded-For when it is absent — prevents callers
  // from spoofing a fresh bucket by forging the header.
  const ip = (request as NextRequest & { ip?: string }).ip ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
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

  try {
    // DNS validation happens atomically at connection time inside the agent,
    // eliminating the TOCTOU gap that a pre-fetch hostname check leaves open.
    const agent = makeSafeAgent();
    const response = await fetch(url, { dispatcher: agent } as RequestInit);
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
