// generate-essays.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs/promises';
import path from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyCPW7D8klItn-r6V-hTqNHrYBQFnMcmElE",
  authDomain: "glennpansensoy-12288.firebaseapp.com",
  projectId: "glennpansensoy-12288",
  storageBucket: "glennpansensoy-12288.firebasestorage.app",
  messagingSenderId: "264252112486",
  appId: "1:264252112486:web:a7c1d2d001815af22377a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const template = await fs.readFile('article.template.html', 'utf-8');

function esc(str) {
  return String(str).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
}

function generateEssayPage(essay) {
  const title = essay.title || 'Untitled Essay';
  const description = (essay.excerpt || essay.content?.substring(0, 160) || '').replace(/\s+/g, ' ').trim();
  const image = essay.coverImage || 'https://code-avs.pages.dev/assets/img/og-poetic-image.jpg';
  const canonical = `https://code-avs.pages.dev/articles/${essay.id}.html`;
  const published = essay.createdAt?.toDate?.().toISOString() || new Date().toISOString();
  const author = essay.author || 'Glenn Junsay Pansensoy';
  const readTime = Math.ceil((essay.content || '').split(/\s+/).length / 200) || 5;

  let html = template;

  html = html.replace(/<title>.*?<\/title>/, `<title>${esc(title)} – Poetic Codes</title>`);
  html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(description)}">`);
  html = html.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(title)} – Poetic Codes">`);
  html = html.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(description)}">`);
  html = html.replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${esc(image)}">`);
  html = html.replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${esc(canonical)}">`);
  html = html.replace(/<meta name="twitter:title" content=".*?">/, `<meta name="twitter:title" content="${esc(title)} – Poetic Codes">`);
  html = html.replace(/<meta name="twitter:description" content=".*?">/, `<meta name="twitter:description" content="${esc(description)}">`);
  html = html.replace(/<meta name="twitter:image" content=".*?">/, `<meta name="twitter:image" content="${esc(image)}">`);
  html = html.replace(/<link rel="canonical" href=".*?">/, `<link rel="canonical" href="${esc(canonical)}">`);
  html = html.replace(/<meta property="article:published_time" content=".*?">/, `<meta property="article:published_time" content="${published}">`);
  html = html.replace(/<meta name="twitter:data1" content=".*?">/, `<meta name="twitter:data1" content="${esc(author)}">`);
  html = html.replace(/<meta name="twitter:data2" content=".*?">/, `<meta name="twitter:data2" content="${readTime} minutes">`);

  const scriptData = `
    <script>
      window.__PRELOADED_ESSAY__ = ${JSON.stringify({
        id: essay.id,
        title: essay.title,
        content: essay.content,
        excerpt: essay.excerpt,
        coverImage: essay.coverImage,
        author: essay.author,
        createdAt: essay.createdAt?.toDate?.().toISOString() || null,
        category: essay.category
      }).replace(/<\/script>/g, '<\\/script>')};
    </script>
  `;
  html = html.replace('</head>', `${scriptData}</head>`);

  return html;
}

async function main() {
  console.log('Fetching essays from Firestore...');
  const snapshot = await getDocs(collection(db, 'articles'));
  const essays = [];
  snapshot.forEach(doc => {
    essays.push({ id: doc.id, ...doc.data() });
  });

  const outputDir = 'articles';
  await fs.mkdir(outputDir, { recursive: true });

  for (const essay of essays) {
    const html = generateEssayPage(essay);
    await fs.writeFile(path.join(outputDir, `${essay.id}.html`), html);
    console.log(`Generated ${essay.id}.html`);
  }

  console.log('Done.');
}

main().catch(console.error);
