// /functions/article.html.js

// Your Firebase project configuration (same as client side)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCPW7D8klItn-r6V-hTqNHrYBQFnMcmElE",
  authDomain: "glennpansensoy-12288.firebaseapp.com",
  projectId: "glennpansensoy-12288",
  // ... rest of config
};

// Helper: fetch a single document from Firestore using the REST API
async function fetchArticle(articleId) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/articles/${articleId}?key=${FIREBASE_CONFIG.apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  // Convert Firestore REST format to a plain object
  const fields = data.fields || {};
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    const type = Object.keys(value)[0];
    result[key] = value[type];
  }
  return result;
}

// Detect crawlers by user agent
function isCrawler(userAgent) {
  const bots = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|pinterest|slackbot|discordbot|googlebot|bingbot|applebot/i;
  return bots.test(userAgent || '');
}

// Read the static article.html file from the build output
async function getStaticHTML(env) {
  // In a Pages Function, you can fetch the static asset from the same origin
  const response = await fetch(new URL('/article.html', env.ASSETS_URL || 'https://code-avs.pages.dev'));
  return response.text();
}

// Replace placeholders in the HTML template with actual values
function injectMetadata(html, article) {
  const title = article.title || 'Essay';
  const description = (article.excerpt || article.content || '').substring(0, 160).replace(/\s+/g, ' ').trim();
  const image = article.coverImage || 'https://code-avs.pages.dev/assets/img/og-poetic-image.jpg';
  const canonical = `https://code-avs.pages.dev/article.html?id=${article.id}`;
  const published = article.createdAt ? new Date(article.createdAt).toISOString() : '';

  // Use a simple replace for key meta tags
  return html
    .replace(/<title>.*?<\/title>/, `<title>${title} – Poetic Codes</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${description}">`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${title} – Poetic Codes">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${description}">`)
    .replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${image}">`)
    .replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${canonical}">`)
    .replace(/<meta name="twitter:title" content=".*?">/, `<meta name="twitter:title" content="${title} – Poetic Codes">`)
    .replace(/<meta name="twitter:description" content=".*?">/, `<meta name="twitter:description" content="${description}">`)
    .replace(/<meta name="twitter:image" content=".*?">/, `<meta name="twitter:image" content="${image}">`)
    .replace(/<link rel="canonical" href=".*?">/, `<link rel="canonical" href="${canonical}">`)
    .replace(/<meta property="article:published_time" content=".*?">/, `<meta property="article:published_time" content="${published}">`);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const articleId = url.searchParams.get('id');

  // If no ID, serve the static file (which will show an error message)
  if (!articleId) {
    return env.ASSETS.fetch(request);
  }

  const userAgent = request.headers.get('user-agent') || '';

  // For crawlers, generate a fully populated HTML page
  if (isCrawler(userAgent)) {
    try {
      const article = await fetchArticle(articleId);
      if (!article) {
        // Article not found – return a 404 status but still with error message
        return new Response('Essay not found', { status: 404 });
      }

      // Get the static HTML template
      let html = await getStaticHTML(env);

      // Inject metadata and also pre‑fill the article content for crawlers that might render JS
      // (we can also inject a script to populate the page if we want, but crawlers usually just need meta tags)
      html = injectMetadata(html, { ...article, id: articleId });

      return new Response(html, {
        headers: { 'content-type': 'text/html;charset=UTF-8' }
      });
    } catch (err) {
      // Fallback to static file on error
      return env.ASSETS.fetch(request);
    }
  }

  // For normal browsers, just serve the static article.html (client‑side JS will load the content)
  return env.ASSETS.fetch(request);
}
