const FIREBASE_PROJECT = 'glennpansensoy-12288';
const BASE_URL         = 'https://code-avs.pages.dev';
const DEFAULT_IMAGE    = `${BASE_URL}/assets/img/og-poetic-image.jpg`;
const SITE_NAME        = 'Poetic Codes';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Intercept BOTH /article.html?id=... AND /article?id=...
    const isArticle = (url.pathname === '/article.html' || url.pathname === '/article')
                      && url.searchParams.has('id');

    if (isArticle) {
      const articleId = url.searchParams.get('id');
      try {
        const fsRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/articles/${articleId}`
        );

        if (fsRes.ok) {
          const fsData    = await fsRes.json();
          const fields    = fsData.fields || {};
          const title     = fields.title?.stringValue    || 'Essay';
          const excerpt   = fields.excerpt?.stringValue  || 'Read long-form essays on culture, programming, and more at Poetic Codes.';
          const cover     = fields.coverImage?.stringValue || DEFAULT_IMAGE;
          const category  = fields.category?.stringValue  || 'Essays';
          const author    = fields.author?.stringValue    || 'Glenn Junsay Pansensoy';
          const tagsArr   = fields.tags?.arrayValue?.values?.map(v => v.stringValue).filter(Boolean) || [];
          // Always use article.html as canonical og:url
          const fullUrl   = `${BASE_URL}/article.html?id=${articleId}`;
          const titleFull = `${title} – ${SITE_NAME}`;

          // Fetch static article.html via env.ASSETS (avoids recursive Error 1019)
          const pageRes = await env.ASSETS.fetch(new Request(`${BASE_URL}/article.html`));
          let html = await pageRes.text();

          const t  = esc(titleFull);
          const ex = esc(excerpt);
          const u  = esc(fullUrl);
          const im = esc(cover);
          const ca = esc(category);
          const tg = esc(tagsArr.join(', '));
          const au = esc(author);

          // <title>
          html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/, `<title>${t}</title>`);

          // Helper: replace content/href on meta/link by id attribute
          const setMeta = (id, val) => {
            html = html.replace(
              new RegExp(`(<(?:meta|link)\\b[^>]*\\bid="${id}"[^>]*\\b(?:content|href)=")[^"]*(")`),
              `$1${val}$2`
            );
          };

          setMeta('page-desc',      ex);
          setMeta('page-keywords',  tg);
          setMeta('page-canonical', u);
          setMeta('page-author',    au);
          setMeta('og-title',       t);
          setMeta('og-desc',        ex);
          setMeta('og-url',         u);
          setMeta('og-image',       im);
          setMeta('og-image-alt',   esc(`Cover image for: ${title}`));
          setMeta('og-section',     ca);
          setMeta('og-tag',         tg);
          setMeta('tw-title',       t);
          setMeta('tw-desc',        ex);
          setMeta('tw-image',       im);
          setMeta('tw-image-alt',   esc(`Cover image for: ${title}`));
          setMeta('tw-author-data', au);

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
      }
    }

    // All other requests served from Cloudflare Pages static assets
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
