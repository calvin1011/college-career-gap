import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
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