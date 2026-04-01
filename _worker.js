const WORKER_ORIGIN   = 'https://poetic-codes.pansensoyglenn.workers.dev';
const FIREBASE_PROJECT = 'glennpansensoy-12288';
const FIREBASE_API_KEY = 'AIzaSyCPW7D8klItn-r6V-hTqNHrYBQFnMcmElE';
const FIRESTORE_URL    = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/articles`;
const DEFAULT_OG_IMG   = `${WORKER_ORIGIN}/og-image.jpg`;
const SITE_NAME        = 'Poetic Codes';

const CRAWLER_SIGNATURES = [
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'slackbot',
  'discordbot',
  'redditbot',
  'quora link preview',
  'vkshare',
  'w3c_validator',
  'ia_archiver',
  'googlebot',
  'bingbot',
];

function isCrawler(ua = '') {
  const lower = ua.toLowerCase();
  return CRAWLER_SIGNATURES.some(sig => lower.includes(sig));
}

async function fetchArticle(articleId) {
  const url = `${FIRESTORE_URL}/${encodeURIComponent(articleId)}?key=${FIREBASE_API_KEY}`;
  try {
    const res = await fetch(url, { cf: { cacheEverything: true, cacheTtl: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return firestoreToObject(json);
  } catch {
    return null;
  }
}

function firestoreToObject(doc) {
  if (!doc || !doc.fields) return null;
  const out = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    out[k] = firestoreValue(v);
  }
  return out;
}

function firestoreValue(v) {
  if (v.stringValue  !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue  !== undefined) return Number(v.doubleValue);
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.nullValue    !== undefined) return null;
  if (v.arrayValue)  return (v.arrayValue.values  || []).map(firestoreValue);
  if (v.mapValue)    return firestoreToObject({ fields: v.mapValue.fields || {} });
  return null;
}

function esc(s = '') {
  return String(s)
    .replace(/&/g,  '&amp;')
    .replace(/"/g,  '&quot;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;');
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function injectOGTags(html, articleId, data) {
  const articleUrl = `${WORKER_ORIGIN}/article.html?id=${encodeURIComponent(articleId)}`;
  const title      = data.title   || 'Essay';
  const titleFull  = `${title} – ${SITE_NAME}`;
  const excerpt    = data.excerpt || stripHtml(data.content || '').substring(0, 200);
  const desc       = excerpt.substring(0, 160);
  const ogImg      = data.ogImage || DEFAULT_OG_IMG;
  const author     = data.author  || 'Glenn Junsay Pansensoy';
  const category   = data.category || 'Essays';
  const tags       = Array.isArray(data.tags)
    ? data.tags
    : (data.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const tagStr  = tags.join(', ');
  const dateISO = typeof data.createdAt === 'string' ? data.createdAt : '';

  function setContent(src, elId, value) {
    return src
      .replace(
        new RegExp(`(<(?:meta|link)[^>]*id="${elId}"[^>]*(?:content|href)=")[^"]*(")`,'i'),
        `$1${esc(value)}$2`
      )
      .replace(
        new RegExp(`(<(?:meta|link)[^>]*(?:content|href)=")[^"]*("[^>]*id="${elId}")`, 'i'),
        `$1${esc(value)}$2`
      );
  }

  let h = html;

  h = h.replace(
    /(<title[^>]*id="page-title"[^>]*>)[^<]*(<\/title>)/i,
    `$1${esc(titleFull)}$2`
  );
  h = h.replace(
    /(<title[^>]*>)[^<]*(<\/title>)/i,
    `$1${esc(titleFull)}$2`
  );

  h = setContent(h, 'page-canonical', articleUrl);

  h = setContent(h, 'page-desc',      desc);
  h = setContent(h, 'og-title',       titleFull);
  h = setContent(h, 'og-desc',        desc);
  h = setContent(h, 'og-url',         articleUrl);
  h = setContent(h, 'og-image',       ogImg);
  h = setContent(h, 'og-image-secure',ogImg);
  h = setContent(h, 'og-image-url',   ogImg);
  h = setContent(h, 'og-image-alt',   titleFull);
  h = setContent(h, 'og-section',     category);
  h = setContent(h, 'og-published',   dateISO);
  h = setContent(h, 'og-modified',    dateISO);
  h = setContent(h, 'og-tag',         tagStr);

  h = setContent(h, 'tw-title',     titleFull);
  h = setContent(h, 'tw-desc',      desc);
  h = setContent(h, 'tw-image',     ogImg);
  h = setContent(h, 'tw-image-alt', titleFull);
  h = setContent(h, 'tw-url',       articleUrl);

  return h;
}

export default {
  async fetch(request, env, ctx) {
    const url      = new URL(request.url);
    const pathname = url.pathname;
    const ua       = request.headers.get('User-Agent') || '';

    const isArticlePage = pathname === '/article.html' || pathname.endsWith('/article.html');
    const articleId     = url.searchParams.get('id');

    if (isArticlePage && articleId && isCrawler(ua)) {
      const assetRequest  = new Request(new URL('/article.html', request.url).toString());
      const assetResponse = await env.ASSETS.fetch(assetRequest);

      if (!assetResponse.ok) {
        return env.ASSETS.fetch(request);
      }

      const articleData = await fetchArticle(articleId);

      if (!articleData) {
        return assetResponse;
      }

      const rawHtml      = await assetResponse.text();
      const injectedHtml = injectOGTags(rawHtml, articleId, articleData);

      return new Response(injectedHtml, {
        headers: {
          'Content-Type':  'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=300',
          'X-OG-Injected': 'true',
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
