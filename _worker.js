const FIREBASE_PROJECT = 'glennpansensoy-12288';
const BASE_URL         = 'https://code-avs.pages.dev';
const DEFAULT_IMAGE    = `${BASE_URL}/assets/img/og-poetic-image.jpg`;
const SITE_NAME        = 'Poetic Codes';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only intercept article.html?id=...
    if (url.pathname === '/article.html' && url.searchParams.has('id')) {
      const articleId = url.searchParams.get('id');

      try {
        // Fetch article from Firestore REST API (public read rules required)
        const fsRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/articles/${articleId}`
        );

        if (fsRes.ok) {
          const fsData = await fsRes.json();
          const fields = fsData.fields || {};

          const title      = fields.title?.stringValue   || 'Essay';
          const excerpt    = fields.excerpt?.stringValue  || 'Read long-form essays on culture, programming, and more.';
          const cover      = fields.coverImage?.stringValue || DEFAULT_IMAGE;
          const category   = fields.category?.stringValue || 'Essays';
          const tagsArr    = fields.tags?.arrayValue?.values?.map(v => v.stringValue).filter(Boolean) || [];
          const articleUrl = `${BASE_URL}/article.html?id=${articleId}`;
          const titleFull  = `${title} – ${SITE_NAME}`;

          // Fetch static article.html via env.ASSETS (avoids recursive Worker Error 1019)
          const pageRes = await env.ASSETS.fetch(new Request(`${BASE_URL}/article.html`));
          let html = await pageRes.text();

          const t  = esc(titleFull);
          const ex = esc(excerpt);
          const u  = esc(articleUrl);
          const im = esc(cover);
          const ca = esc(category);
          const tg = esc(tagsArr.join(', '));

          // --- <title> ---
          html = html.replace(
            /<title[^>]*>[\s\S]*?<\/title>/,
            `<title>${t}</title>`
          );

          // --- meta name="description" id="page-desc" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="page-desc"[^>]*\bcontent=")[^"]*(")/,
            `$1${ex}$2`
          );

          // --- meta name="keywords" id="page-keywords" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="page-keywords"[^>]*\bcontent=")[^"]*(")/,
            `$1${tg}$2`
          );

          // --- link rel="canonical" id="page-canonical" ---
          html = html.replace(
            /(<link\b[^>]*\bid="page-canonical"[^>]*\bhref=")[^"]*(")/,
            `$1${u}$2`
          );

          // --- og:title id="og-title" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="og-title"[^>]*\bcontent=")[^"]*(")/,
            `$1${t}$2`
          );

          // --- og:description id="og-desc" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="og-desc"[^>]*\bcontent=")[^"]*(")/,
            `$1${ex}$2`
          );

          // --- og:url id="og-url" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="og-url"[^>]*\bcontent=")[^"]*(")/,
            `$1${u}$2`
          );

          // --- og:image id="og-image" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="og-image"[^>]*\bcontent=")[^"]*(")/,
            `$1${im}$2`
          );

          // --- og:image:alt id="og-image-alt" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="og-image-alt"[^>]*\bcontent=")[^"]*(")/,
            `$1${esc('Cover image for: ' + title)}$2`
          );

          // --- article:section id="og-section" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="og-section"[^>]*\bcontent=")[^"]*(")/,
            `$1${ca}$2`
          );

          // --- article:tag id="og-tag" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="og-tag"[^>]*\bcontent=")[^"]*(")/,
            `$1${tg}$2`
          );

          // --- twitter:title id="tw-title" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="tw-title"[^>]*\bcontent=")[^"]*(")/,
            `$1${t}$2`
          );

          // --- twitter:description id="tw-desc" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="tw-desc"[^>]*\bcontent=")[^"]*(")/,
            `$1${ex}$2`
          );

          // --- twitter:image id="tw-image" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="tw-image"[^>]*\bcontent=")[^"]*(")/,
            `$1${im}$2`
          );

          // --- twitter:image:alt id="tw-image-alt" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="tw-image-alt"[^>]*\bcontent=")[^"]*(")/,
            `$1${esc('Cover image for: ' + title)}$2`
          );

          // --- twitter:data1 id="tw-author-data" ---
          html = html.replace(
            /(<meta\b[^>]*\bid="tw-author-data"[^>]*\bcontent=")[^"]*(")/,
            `$1${esc(fields.author?.stringValue || 'Glenn Junsay Pansensoy')}$2`
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
        console.error('Worker error:', e.message);
        // Fall through to normal static file serving
      }
    }

    // All other requests: serve Cloudflare Pages static assets directly
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
