/*
  ============================================================
  Poetic Codes – Cloudflare Pages Worker (og-injector)
  File: functions/article.js   (Cloudflare Pages Functions)
  ============================================================
  HOW IT WORKS:
  - Normal visitors → served the regular article.html (JS runs, Firebase loads)
  - Facebook / social crawlers → Worker fetches article data from Firestore
    REST API and returns article.html with REAL og: meta tags pre-injected.
  - No fb:app_id required.

  SETUP INSTRUCTIONS:
  1. In your Cloudflare Pages project, create a folder called "functions"
     at the root of your repo (same level as article.html).
  2. Save this file as:  functions/article.js
  3. In Cloudflare Pages → Settings → Environment Variables, add:
       FIREBASE_PROJECT_ID  =  glennpansensoy-12288
       FIREBASE_API_KEY     =  AIzaSyCPW7D8klItn-r6V-hTqNHrYBQFnMcmElE
  4. Deploy. Done — no fb:app_id needed.
  ============================================================
*/

const SOCIAL_CRAWLERS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'TelegramBot',
  'Slackbot',
  'redditbot',
  'Googlebot',
  'bingbot',
];

const BASE_URL       = 'https://code-avs.pages.dev';
const PROJECT_ID     = 'glennpansensoy-12288';
const COLLECTION     = 'articles';
const DEFAULT_IMAGE  = `${BASE_URL}/assets/img/og-poetic-image.jpg`;

function isSocialCrawler(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SOCIAL_CRAWLERS.some(bot => ua.includes(bot.toLowerCase()));
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function excerpt(text, max = 155) {
  const clean = stripHtml(text);
  return clean.length > max ? clean.substring(0, max).trimEnd() + '…' : clean;
}

function readTime(content) {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtDateISO(firestoreTimestamp) {
  if (!firestoreTimestamp) return '';
  if (firestoreTimestamp._seconds) {
    return new Date(firestoreTimestamp._seconds * 1000).toISOString();
  }
  return '';
}

async function fetchArticleFromFirestore(articleId, apiKey) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${articleId}?key=${apiKey}`;
  const res  = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.fields) return null;

  function val(field) {
    if (!field) return '';
    return field.stringValue
      || field.integerValue
      || field.doubleValue
      || (field.booleanValue !== undefined ? field.booleanValue : '')
      || (field.arrayValue?.values?.map(v => val(v)).join(', ') || '')
      || (field.timestampValue || '');
  }

  const f = json.fields;
  return {
    title:      val(f.title),
    excerpt:    val(f.excerpt),
    content:    val(f.content),
    author:     val(f.author)     || 'Glenn Junsay Pansensoy',
    category:   val(f.category)  || 'Essays',
    coverImage: val(f.coverImage) || DEFAULT_IMAGE,
    tags:       f.tags?.arrayValue?.values?.map(v => val(v)) || [],
    createdAt:  f.createdAt?.timestampValue || '',
  };
}

function injectOGTags(html, article, articleUrl) {
  const title      = escapeHtml(`${article.title} – Poetic Codes`);
  const desc       = escapeHtml(article.excerpt || excerpt(article.content));
  const image      = escapeHtml(article.coverImage || DEFAULT_IMAGE);
  const author     = escapeHtml(article.author);
  const category   = escapeHtml(article.category);
  const tags       = escapeHtml(article.tags.join(', '));
  const dateISO    = article.createdAt
    ? new Date(article.createdAt).toISOString()
    : '';
  const rt         = readTime(article.content);
  const url        = escapeHtml(articleUrl);

  const ogBlock = `
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta name="author" content="${author}">
  <meta name="keywords" content="${tags}">
  <link rel="canonical" href="${url}">

  <meta property="og:type" content="article">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="Poetic Codes">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Cover image for: ${escapeHtml(article.title)}">
  <meta property="og:author" content="${author}">
  <meta property="article:published_time" content="${dateISO}">
  <meta property="article:modified_time" content="${dateISO}">
  <meta property="article:author" content="${BASE_URL}/about.html">
  <meta property="article:section" content="${category}">
  <meta property="article:tag" content="${tags}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@GlennPansensoy">
  <meta name="twitter:creator" content="@GlennPansensoy">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="Cover image for: ${escapeHtml(article.title)}">
  <meta name="twitter:label1" content="Written by">
  <meta name="twitter:data1" content="${author}">
  <meta name="twitter:label2" content="Est. reading time">
  <meta name="twitter:data2" content="${rt} minute${rt !== 1 ? 's' : ''}">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${escapeHtml(article.title)}",
    "description": "${desc}",
    "image": "${image}",
    "url": "${url}",
    "datePublished": "${dateISO}",
    "dateModified": "${dateISO}",
    "author": {
      "@type": "Person",
      "name": "${author}",
      "url": "${BASE_URL}/about.html"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Poetic Codes",
      "url": "${BASE_URL}",
      "logo": { "@type": "ImageObject", "url": "${BASE_URL}/logo.png" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": "${url}" }
  }
  <\/script>`;

  return html
    .replace(/<title[^>]*>.*?<\/title>/is, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+name="author"[^>]*>/gi, '')
    .replace(/<meta\s+name="keywords"[^>]*>/gi, '')
    .replace(/<meta\s+name="robots"[^>]*>/gi, '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+property="article:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+property="fb:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace('<head>', `<head>\n${ogBlock}`);
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const userAgent = request.headers.get('User-Agent') || '';
  const url       = new URL(request.url);
  const articleId = url.searchParams.get('id');

  if (!isSocialCrawler(userAgent) || !articleId) {
    return next();
  }

  try {
    const apiKey  = env.FIREBASE_API_KEY || 'AIzaSyCPW7D8klItn-r6V-hTqNHrYBQFnMcmElE';
    const article = await fetchArticleFromFirestore(articleId, apiKey);

    if (!article || !article.title) {
      return next();
    }

    const pageRes  = await next();
    const html     = await pageRes.text();
    const articleUrl = `${BASE_URL}/article.html?id=${articleId}`;
    const injected = injectOGTags(html, article, articleUrl);

    return new Response(injected, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return next();
  }
}
