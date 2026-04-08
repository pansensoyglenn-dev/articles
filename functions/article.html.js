export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const articleId = url.searchParams.get('id');
  const userAgent = request.headers.get('user-agent') || '';

  console.log(`Request: ${url.toString()}, ID: ${articleId}, UA: ${userAgent}`);

  const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discord|pinterest|slack/i.test(userAgent);

  if (!articleId) {
    console.log('No article ID provided.');
    return env.ASSETS.fetch(request);
  }

  if (!isCrawler) {
    console.log('Not a crawler, serving static file.');
    return env.ASSETS.fetch(request);
  }

  try {
    console.log(`Fetching article ${articleId} from Firestore...`);
    const article = await fetchArticle(articleId, env);
    if (!article) {
      console.log(`Article ${articleId} not found.`);
      // Return a custom error page with 404
      return new Response(`Essay Not Found\n\nThis essay (ID: ${articleId}) was not found in the database.`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    console.log(`Article found: ${article.title}`);

    const assetResponse = await env.ASSETS.fetch(new URL('/article.html', request.url));
    const html = await assetResponse.text();

    const rewritten = new HTMLRewriter()
      .on('title', { element: e => e.setInnerContent(`${article.title} – Poetic Codes`) })
      // ... rest of rewriter as before ...
      .transform(new Response(html));

    return rewritten;
  } catch (err) {
    console.error('Function error:', err);
    return new Response(`Internal Error: ${err.message}`, { status: 500 });
  }
}

async function fetchArticle(articleId, env) {
  const apiKey = env.FIREBASE_API_KEY || 'AIzaSyCPW7D8klItn-r6V-hTqNHrYBQFnMcmElE';
  const projectId = env.FIREBASE_PROJECT_ID || 'glennpansensoy-12288';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/articles/${articleId}?key=${apiKey}`;

  console.log(`REST API URL: ${url}`);

  const resp = await fetch(url);
  if (!resp.ok) {
    console.log(`Firestore responded with ${resp.status}: ${await resp.text()}`);
    return null;
  }

  const data = await resp.json();
  console.log('Firestore data:', JSON.stringify(data, null, 2));

  const fields = data.fields || {};
  const article = { id: articleId };
  for (const [key, val] of Object.entries(fields)) {
    const type = Object.keys(val)[0];
    article[key] = val[type];
  }
  return article;
}
