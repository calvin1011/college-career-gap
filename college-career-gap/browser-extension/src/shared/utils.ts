// Utility functions for extension

export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch {
    return url;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function detectJobBoard(url: string): string | null {
  const jobBoards = {
    'linkedin.com': 'LinkedIn',
    'indeed.com': 'Indeed',
    'handshake.com': 'Handshake',
    'glassdoor.com': 'Glassdoor',
    'monster.com': 'Monster',
    'ziprecruiter.com': 'ZipRecruiter'
  };

  for (const [domain, name] of Object.entries(jobBoards)) {
    if (url.includes(domain)) {
      return name;
    }
  }

  return null;
}

export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}