const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const EDITOR_PASSWORD = 'poetic-codes2026'; // same as in your HTML

exports.submitArticle = functions.https.onCall(async (data, context) => {
  // 1. Verify password
  if (data.password !== EDITOR_PASSWORD) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid editor password');
  }

  // 2. Validate required fields
  const { title, author, category, excerpt, content, tags, slug, coverImage } = data;
  if (!title || !category || !excerpt || !content) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  // 3. Write to Firestore using Admin SDK (bypasses security rules)
  const docRef = await admin.firestore().collection('articles').add({
    title,
    author: author || 'Glenn Junsay Pansensoy',
    category,
    excerpt,
    content,
    tags: tags || [],
    slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
    coverImage: coverImage || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { id: docRef.id, success: true };
});
