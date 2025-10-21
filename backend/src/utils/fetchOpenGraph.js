async function fetchOpenGraph(url) {
  try {
    const resp = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'downloader-backend/1.0' }, timeout: 10000 });
    if (!resp.ok) return null;
    const html = await resp.text();
    const og = {};
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) || html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) og.title = titleMatch[1];
    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) || html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    if (imageMatch) og.thumbnailUrl = imageMatch[1];
    return og;
  } catch (e) {
    return null;
  }
}

module.exports = fetchOpenGraph;