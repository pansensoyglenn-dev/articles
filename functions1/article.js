export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id  = url.searchParams.get('id');
  const ua  = context.request.headers.get('user-agent') || '';

  // Only intercept Facebook/social crawlers
  const isCrawler = /facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|TelegramBot/i.test(ua);

  if (!id || !isCrawler) {
    return context.next();
  }

  // Fetch article data from Firestore REST API
  const projectId = 'glennpansensoy-12288';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/articles/${id}`;

  try {
    const res  = await fetch(firestoreUrl);
    const data = await res.json();
    const fields = data.fields || {};

    const title   = fields.title?.stringValue   || 'Essay – Poetic Codes';
    const excerpt = fields.excerpt?.stringValue  || 'Read long-form essays at Poetic Codes.';
    const cover   = fields.coverImage?.stringValue || 'https://code-avs.pages.dev/assets/img/og-poetic-image.jpg';
    const artUrl  = `https://code-avs.pages.dev/article.html?id=${id}`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} – Poetic Codes</title>
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title} – Poetic Codes">
  <meta property="og:description" content="${excerpt}">
  <meta property="og:url" content="${artUrl}">
  <meta property="og:image" content="${cover}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Poetic Codes">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${excerpt}">
  <meta name="twitter:image" content="${cover}">
  <meta http-equiv="refresh" content="0;url=${artUrl}">
</head>
<body><a href="${artUrl}">Click here if not redirected.</a></body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });

  } catch (e) {
    return context.next();
  }
}
