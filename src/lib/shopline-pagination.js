export function nextPageInfoFromLink(link = '') {
  for (const part of String(link).split(',')) {
    if (!/rel=["']?next["']?/i.test(part)) continue;
    const match = part.match(/<([^>]+)>/);
    if (!match) continue;
    try { return new URL(match[1]).searchParams.get('page_info') || ''; }
    catch { return ''; }
  }
  return '';
}
