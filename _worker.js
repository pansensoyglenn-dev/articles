const FIREBASE_PROJECT = 'glennpansensoy-12288';
const BASE_URL         = 'https://code-avs.pages.dev';
const DEFAULT_IMAGE    = `${BASE_URL}/assets/img/og-poetic-image.jpg`;
const SITE_NAME        = 'Poetic Codes';

// Social media crawler user-agents
const CRAWLER_RE = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slackbot|redditbot|pinterest|vkShare|W3C_Validator/i;

export default {
  async fetch(request, env) {
    const url        = new URL(request.url);
    const userAgent  = request.headers.get('user-agent') || '';
    const isCrawler  = CRAWLER_RE.test(userAgent);
    const isArticle  = (url.pathname === '/article.html' || url.pathname === '/article')
                       && url.searchParams.has('id');

    // Only do the Firestore injection for social media crawlers
    // Regular users always get the normal static file — no risk of breaking anything
    if (isArticle && isCrawler) {
      const articleId = url.searchParams.get('id');
      try {
        const fsRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/articles/${articleId}`
        );

        if (fsRes.ok) {
          const fsData    = await fsRes.json();
          const fields    = fsData.fields || {};
          const title     = fields.title?.stringValue    || 'Essay';
          const excerpt   = fields.excerpt?.stringValue  || 'Read long-form essays on culture and programming at Poetic Codes.';
          const cover     = fields.coverImage?.stringValue || DEFAULT_IMAGE;
          const category  = fields.category?.stringValue  || 'Essays';
          const author    = fields.author?.stringValue    || 'Glenn Junsay Pansensoy';
          const tagsArr   = fields.tags?.arrayValue?.values?.map(v => v.stringValue).filter(Boolean) || [];
          const fullUrl   = `${BASE_URL}/article.html?id=${articleId}`;
          const titleFull = `${title} – ${SITE_NAME}`;

          const t  = esc(titleFull);
          const ex = esc(excerpt);
          const u  = esc(fullUrl);
          const im = esc(cover);
          const ca = esc(category);
          const tg = esc(tagsArr.join(', '));
          const au = esc(author);

          // Return minimal HTML just for crawlers — all the OG tags they need
          const crawlerHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${t}</title>
<meta name="description" content="${ex}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${ex}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${im}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc('Cover image for: ' + title)}">
<meta property="article:section" content="${ca}">
<meta property="article:tag" content="${tg}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@GlennPansensoy">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${ex}">
<meta name="twitter:image" content="${im}">
<meta name="twitter:data1" content="${au}">
<link rel="canonical" href="${u}">
</head>
<body>
<h1>${t}</h1>
<p>${ex}</p>
<p>Written by ${au} | Category: ${ca}</p>
<a href="${u}">Read the full essay</a>
</body>
</html>`;

          return new Response(crawlerHtml, {
            status: 200,
            headers: {
              'Content-Type': 'text/html;charset=UTF-8',
              'Cache-Control': 'public, max-age=300'
            }
          });
        }
      } catch (e) {
        console.error('Worker crawler error:', e.message);
        // Fall through to normal asset serving
      }
    }

    // ALL regular users and all other paths — serve normally, no interference
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
