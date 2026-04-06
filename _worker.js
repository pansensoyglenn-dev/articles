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
        // Fetch article from Firestore REST API
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/articles/${articleId}`;
        const fsRes = await fetch(firestoreUrl);

        if (fsRes.ok) {
          const fsData = await fsRes.json();
          const fields = fsData.fields || {};
          const title = fields.title?.stringValue || 'Essay';
          const excerpt = fields.excerpt?.stringValue || 'Read long-form essays on culture, programming, and more.';
          const coverImage = fields.coverImage?.stringValue || DEFAULT_IMAGE;
          const articleUrl = `${BASE_URL}/article.html?id=${articleId}`;

          // Fetch the original HTML
          const pageRes = await fetch(request);
          let html = await pageRes.text();

          // Inject correct OG meta values
          html = html
            .replace(/<title id="page-title">.*?<\/title>/, `<title>${escapeHtml(title)} – ${SITE_NAME}</title>`)
            .replace(/(<meta[^>]+id="meta-description"[^>]+content=")[^"]*(")/,  `$1${escapeHtml(excerpt)}$2`)
            .replace(/(<meta[^>]+id="og-title"[^>]+content=")[^"]*(")/,         `$1${escapeHtml(title)}$2`)
            .replace(/(<meta[^>]+id="og-description"[^>]+content=")[^"]*(")/,   `$1${escapeHtml(excerpt)}$2`)
            .replace(/(<meta[^>]+id="og-url"[^>]+content=")[^"]*(")/,           `$1${escapeHtml(articleUrl)}$2`)
            .replace(/(<meta[^>]+id="twitter-title"[^>]+content=")[^"]*(")/,    `$1${escapeHtml(title)}$2`)
            .replace(/(<meta[^>]+id="twitter-description"[^>]+content=")[^"]*(")/,`$1${escapeHtml(excerpt)}$2`)
            // Fix og:image to use cover image if available
            .replace(/(<meta property="og:image" content=")[^"]*(")/,            `$1${escapeHtml(coverImage)}$2`);

          return new Response(html, {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' }
          });
        }
      } catch (e) {
        // Fall through to default behavior
      }
    }

    // All other requests: pass through normally
    return fetch(request);
  }
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
