/**
 * Cloudflare Worker — og-worker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Deploy this on Cloudflare Workers and route it in front of:
 *   pansensoyglenn-dev.github.io/articles/article.html
 *
 * What it does:
 *   1. If the request is for article.html WITH an ?id= param AND the
 *      User-Agent looks like a social-media crawler (Facebook, Twitter,
 *      LinkedIn, WhatsApp, Telegram …), it fetches the article data from
 *      Firestore REST API and returns the HTML with correct OG meta tags
 *      already in <head> — no JavaScript needed.
 *
 *   2. For all other requests (real browsers) it passes straight through
 *      to GitHub Pages as normal, so the existing JS still works.
 *
 * Setup steps:
 *   1. In your Cloudflare dashboard create a new Worker and paste this file.
 *   2. Add a Route for:  pansensoyglenn-dev.github.io/articles/article.html*
 *      pointing to this worker.
 *   3. Set the environment variable FIREBASE_API_KEY in the Worker settings
 *      (Workers → your worker → Settings → Variables).
 *      Value: AIzaSyCPW7D8klItn-r6V-hTqNHrYBQFnMcmElE
 * ─────────────────────────────────────────────────────────────────────────────
 */

const GITHUB_ORIGIN  = 'https://pansensoyglenn-dev.github.io';
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/glennpansensoy-12288/databases/(default)/documents/articles';
const DEFAULT_OG_IMG = `${GITHUB_ORIGIN}/articles/og-image.jpg`;
const SITE_NAME      = 'Poetic Codes';
const SITE_BASE      = `${GITHUB_ORIGIN}/articles`;

/** Social-media / link-preview crawlers that read static HTML only */
const CRAWLER_UA = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'TelegramBot',
  'Slackbot',
  'Discordbot',
  'redditbot',
  'quora link preview',
  'vkShare',
  'W3C_Validator',
  'ia_archiver',
];

function isCrawler(userAgent = '') {
  const ua = userAgent.toLowerCase();
  return CRAWLER_UA.some(c => ua.includes(c.toLowerCase()));
}

/**
 * Fetch a single article document from Firestore REST API.
 * Returns null on any error.
 */
async function fetchArticle(articleId, apiKey) {
  const url = `${FIRESTORE_BASE}/${encodeURIComponent(articleId)}?key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return parseFirestoreDoc(json);
  } catch {
    return null;
  }
}

/**
 * Convert Firestore REST document format to a plain object.
 * Handles string, boolean, integer, array, and map value types.
 */
function parseFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const out = {};
  for (const [key, val] of Object.entries(doc.fields)) {
    out[key] = parseFirestoreValue(val);
  }
  return out;
}

function parseFirestoreValue(val) {
  if (val.stringValue  !== undefined) return val.stringValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue  !== undefined) return Number(val.doubleValue);
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.arrayValue) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (val.mapValue) {
    return parseFirestoreDoc({ fields: val.mapValue.fields || {} });
  }
  return null;
}

/** Safely escape a string for use in HTML attribute values */
function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Strip HTML tags to get plain text for descriptions */
function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Build a minimal but complete HTML page that contains all the correct
 * OG / Twitter meta tags and then immediately redirects the browser to
 * the real article page. Crawlers stop at the meta tags; browsers get
 * redirected instantly via JS + meta-refresh.
 */
function buildMetaPage(articleId, data) {
  const articleUrl = `${SITE_BASE}/article.html?id=${encodeURIComponent(articleId)}`;
  const title      = data.title || 'Essay';
  const titleFull  = `${title} – ${SITE_NAME}`;
  const rawExcerpt = data.excerpt || stripHtml(data.content || '').substring(0, 200);
  const desc       = rawExcerpt.substring(0, 160);
  const ogImg      = data.ogImage || DEFAULT_OG_IMG;
  const author     = data.author || 'Glenn Junsay Pansensoy';
  const category   = data.category || 'Essays';
  const tags       = Array.isArray(data.tags)
    ? data.tags
    : (data.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const tagStr     = tags.join(', ');
  const dateISO    = data.createdAt || '';

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${esc(titleFull)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="author" content="${esc(author)}">
  ${tagStr ? `<meta name="keywords" content="${esc(tagStr)}">` : ''}
  <link rel="canonical" href="${esc(articleUrl)}">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${esc(SITE_NAME)}">
  <meta property="og:title" content="${esc(titleFull)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(articleUrl)}">
  <meta property="og:image" content="${esc(ogImg)}">
  <meta property="og:image:secure_url" content="${esc(ogImg)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(titleFull)}">
  <meta property="og:locale" content="en_PH">
  <meta property="og:author" content="${esc(author)}">
  <meta property="article:author" content="${esc(author)}">
  <meta property="article:publisher" content="https://www.facebook.com/GlennJunsayPansensoy">
  <meta property="article:section" content="${esc(category)}">
  ${dateISO ? `<meta property="article:published_time" content="${esc(dateISO)}">` : ''}
  ${tagStr  ? `<meta property="article:tag" content="${esc(tagStr)}">` : ''}

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@GlennPansensoy">
  <meta name="twitter:creator" content="@GlennPansensoy">
  <meta name="twitter:title" content="${esc(titleFull)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(ogImg)}">
  <meta name="twitter:image:alt" content="${esc(titleFull)}">
  <meta name="twitter:url" content="${esc(articleUrl)}">

  <!-- Redirect browsers immediately; crawlers stop here and read the meta tags -->
  <meta http-equiv="refresh" content="0;url=${esc(articleUrl)}">
  <script>window.location.replace("${articleUrl.replace(/"/g, '\\"')}");</script>
</head>
<body>
  <p>Redirecting to <a href="${esc(articleUrl)}">${esc(titleFull)}</a>…</p>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only intercept article.html requests that have an ?id= param
    const isArticlePage = url.pathname.endsWith('/article.html') || url.pathname.endsWith('/articles/article.html');
    const articleId     = url.searchParams.get('id');

    if (!isArticlePage || !articleId) {
      // Pass everything else straight through to GitHub Pages
      return fetch(request);
    }

    const ua = request.headers.get('User-Agent') || '';

    if (isCrawler(ua)) {
      // Crawler: fetch article data and return an OG-injected HTML shell
      const apiKey = env.FIREBASE_API_KEY;
      if (!apiKey) {
        // No API key configured — fall back to GitHub Pages
        return fetch(request);
      }

      const data = await fetchArticle(articleId, apiKey);
      if (!data) {
        // Article not found — fall back to GitHub Pages (will show error state)
        return fetch(request);
      }

      const html = buildMetaPage(articleId, data);
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=300', // cache for 5 min
        },
      });
    }

    // Real browser: pass straight through so the existing JS works normally
    return fetch(request);
  },
};
