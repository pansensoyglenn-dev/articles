const FIREBASE_PROJECT = 'glennpansensoy-12288';
const BASE_URL = 'https://code-avs.pages.dev';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;
const SITE_NAME = 'Poetic Codes';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only intercept article.html?id=...
    if (url.pathname === '/article.html' && url.searchParams.has('id')) {
      const articleId = url.searchParams.get('id');

      try {
        // Fetch article data from Firestore REST API (no auth needed for public rules)
        const firestoreUrl =
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/articles/${articleId}`;
        const fsRes = await fetch(firestoreUrl);

        if (fsRes.ok) {
          const fsData = await fsRes.json();
          const fields = fsData.fields || {};

          const title   = fields.title?.stringValue   || 'Essay';
          const excerpt = fields.excerpt?.stringValue  || 'Read long-form essays on culture, programming, and more.';
          const cover   = fields.coverImage?.stringValue || DEFAULT_IMAGE;
          const articleUrl = `${BASE_URL}/article.html?id=${articleId}`;

          // Fetch the static article.html from Cloudflare Pages assets
          // Use env.ASSETS to avoid recursive Worker self-call (Error 1019)
          const pageRes = await env.ASSETS.fetch(new Request(`${BASE_URL}/article.html`));
          let html = await pageRes.text();

          const t  = esc(title);
          const ex = esc(excerpt);
          const u  = esc(articleUrl);
          const im = esc(cover);

          // Replace <title>
          html = html.replace(
            /<title[^>]*>.*?<\/title>/s,
            `<title>${t} – ${SITE_NAME}</title>`
          );

          // Replace meta description
          html = html.replace(
            /(<meta\s[^>]*id="meta-description"[^>]*content=")[^"]*(")/,
            `$1${ex}$2`
          );
          html = html.replace(
            /(<meta\s[^>]*content=")[^"]*("\s[^>]*id="meta-description"[^>]*)/,
            `$1${ex}$2`
          );

          // Replace og:title
          html = html.replace(
            /(<meta\s[^>]*id="og-title"[^>]*content=")[^"]*(")/,
            `$1${t}$2`
          );
          html = html.replace(
            /(<meta\s[^>]*property="og:title"[^>]*content=")[^"]*(")/,
            `$1${t}$2`
          );

          // Replace og:description
          html = html.replace(
            /(<meta\s[^>]*id="og-description"[^>]*content=")[^"]*(")/,
            `$1${ex}$2`
          );
          html = html.replace(
            /(<meta\s[^>]*property="og:description"[^>]*content=")[^"]*(")/,
            `$1${ex}$2`
          );

          // Replace og:url
          html = html.replace(
            /(<meta\s[^>]*id="og-url"[^>]*content=")[^"]*(")/,
            `$1${u}$2`
          );
          html = html.replace(
            /(<meta\s[^>]*property="og:url"[^>]*content=")[^"]*(")/,
            `$1${u}$2`
          );

          // Replace og:image (first occurrence)
          html = html.replace(
            /(<meta\s[^>]*property="og:image"[^>]*content=")[^"]*(")/,
            `$1${im}$2`
          );

          // Replace twitter:title
          html = html.replace(
            /(<meta\s[^>]*id="twitter-title"[^>]*content=")[^"]*(")/,
            `$1${t}$2`
          );
          html = html.replace(
            /(<meta\s[^>]*name="twitter:title"[^>]*content=")[^"]*(")/,
            `$1${t}$2`
          );

          // Replace twitter:description
          html = html.replace(
            /(<meta\s[^>]*id="twitter-description"[^>]*content=")[^"]*(")/,
            `$1${ex}$2`
          );
          html = html.replace(
            /(<meta\s[^>]*name="twitter:description"[^>]*content=")[^"]*(")/,
            `$1${ex}$2`
          );

          // Replace twitter:image
          html = html.replace(
            /(<meta\s[^>]*name="twitter:image"[^>]*content=")[^"]*(")/,
            `$1${im}$2`
          );

          // CRITICAL: Hide the "Essay Not Found" error-state div from crawlers
          // by replacing its visible content so crawlers don't index or display it
          html = html.replace(
            /id="error-state"[^>]*style="display:none/,
            `id="error-state" style="display:none`
          );

          return new Response(html, {
            status: 200,
            headers: {
              'Content-Type': 'text/html;charset=UTF-8',
              'Cache-Control': 'public, max-age=60, s-maxage=300'
            }
          });
        }
      } catch (e) {
        console.error('Worker error:', e);
        // Fall through to normal page serving
      }
    }

    // All other requests: serve from Cloudflare Pages static assets
    return env.ASSETS.fetch(request);
  }
};

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
