const FIREBASE_PROJECT = "glennpansensoy-12288";
const FIREBASE_API_KEY  = "AIzaSyCPW7D8klItn-r6V-hTqNHrYBQFnMcmElE";
const BASE_URL          = "https://code-avs.pages.dev";
const DEFAULT_OG_IMAGE  = ${BASE_URL}/og-image.jpg;
const SITE_NAME         = "Poetic Codes";
const firestoreBase =
https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents;
async function fetchArticle(articleId) {
try {
const url = ${firestoreBase}/articles/${articleId}?key=${FIREBASE_API_KEY};
const res  = await fetch(url, { cf: { cacheTtl: 60, cacheEverything: true } });
if (!res.ok) return null;
const json = await res.json();
return parseFirestoreDoc(json);
} catch {
return null;
}
}
function parseFirestoreDoc(doc) {
if (!doc || !doc.fields) return null;
const out = {};
for (const [key, val] of Object.entries(doc.fields)) {
if (val.stringValue  !== undefined) out[key] = val.stringValue;
else if (val.integerValue !== undefined) out[key] = Number(val.integerValue);
else if (val.booleanValue !== undefined) out[key] = val.booleanValue;
else if (val.timestampValue !== undefined) out[key] = val.timestampValue;
else if (val.arrayValue?.values) {
out[key] = (val.arrayValue.values || []).map(v =>
v.stringValue ?? v.integerValue ?? ''
);
}
}
return out;
}
function stripHtml(html = '', maxLen = 160) {
return html.replace(/<[^>]+>/g, ' ')
.replace(/\s+/g, ' ')
.trim()
.substring(0, maxLen);
}
function readTime(content = '') {
const words = content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
return Math.max(1, Math.ceil(words / 200));
}
function buildSchema(data, articleUrl, ogImg, title, desc, dateISO, tags, rt) {
const schema = {
"@context": "https://schema.org",
"@type": "Article",
"headline": title,
"description": desc,
"image": { "@type": "ImageObject", "url": ogImg, "width": 1200, "height": 630 },
"url": articleUrl,
"datePublished": dateISO,
"dateModified": dateISO,
"keywords": tags.join(", "),
"articleSection": data.category || "Essays",
"timeRequired": PT${rt}M,
"inLanguage": "en-PH",
"isAccessibleForFree": true,
"author": {
"@type": "Person",
"name": data.author || "Glenn Junsay Pansensoy",
"url": ${BASE_URL}/about.html,
"sameAs": [
"https://twitter.com/GlennPansensoy",
"https://www.linkedin.com/in/glenn-junsay-pansensoy",
"https://www.facebook.com/GlennJunsayPansensoy"
]
},
"publisher": {
"@type": "Organization",
"name": "Poetic Codes",
"url": ${BASE_URL}/,
"logo": { "@type": "ImageObject", "url": DEFAULT_OG_IMAGE, "width": 1200, "height": 630 }
},
"mainEntityOfPage": { "@type": "WebPage", "@id": articleUrl },
"breadcrumb": {
"@type": "BreadcrumbList",
"itemListElement": [
{ "@type": "ListItem", "position": 1, "name": "Home",   "item": ${BASE_URL}/ },
{ "@type": "ListItem", "position": 2, "name": "Essays", "item": ${BASE_URL}/articles.html },
{ "@type": "ListItem", "position": 3, "name": title,    "item": articleUrl }
]
}
};
return JSON.stringify(schema);
}
class MetaRewriter {
constructor(meta) {
this.meta = meta;
}
title(element) {
element.setInnerContent(this.meta.pageTitle);
}
element(element) {
const id   = element.getAttribute("id");
const attr = element.tagName === "link" ? "href" : "content";
const map  = this.meta.map;
if (id && map[id] !== undefined) {
element.setAttribute(attr, map[id]);
}
if (id === "article-schema") {
element.setInnerContent(this.meta.schema);
}
}
}
export async function onRequestGet(context) {
const { request, next } = context;
const url    = new URL(request.url);
const id     = url.searchParams.get("id");
if (!id) return next();
const data = await fetchArticle(id);
if (!data) return next();
const articleUrl = ${BASE_URL}/article.html?id=${encodeURIComponent(id)};
const ogImg      = data.ogImage || DEFAULT_OG_IMAGE;
const pageTitle  = ${data.title || "Essay"} – ${SITE_NAME};
const desc       = stripHtml(data.excerpt || data.content || "", 160) ||
Read this long-form essay at ${SITE_NAME}.;
const dateISO    = data.createdAt
? (typeof data.createdAt === "string" ? data.createdAt : new Date(data.createdAt).toISOString())
: new Date().toISOString();
const tags       = Array.isArray(data.tags)
? data.tags
: (data.tags || "").split(",").map(t => t.trim()).filter(Boolean);
const rt         = readTime(data.content || "");
const schema     = buildSchema(data, articleUrl, ogImg, data.title || "Essay", desc, dateISO, tags, rt);
const map = {
"page-title":     pageTitle,
"page-desc":      desc,
"page-author":    data.author || "Glenn Junsay Pansensoy",
"page-keywords":  tags.join(", ") || "essays, Poetic Codes",
"page-canonical": articleUrl,
"og-title":       pageTitle,
"og-desc":        desc,
"og-url":         articleUrl,
"og-image":       ogImg,
"og-image-secure":ogImg,
"og-image-url":   ogImg,
"og-image-alt":   pageTitle,
"og-section":     data.category || "Essays",
"og-published":   dateISO,
"og-modified":    dateISO,
"og-tag":         tags.join(", "),
"tw-title":       pageTitle,
"tw-desc":        desc,
"tw-image":       ogImg,
"tw-image-alt":   pageTitle,
"tw-url":         articleUrl,
};
const staticResponse = await next();
return new HTMLRewriter()
.on("title",                     { element: el => el.setInnerContent(pageTitle) })
.on('[id="page-desc"]',          { element: el => el.setAttribute("content", desc) })
.on('[id="page-author"]',        { element: el => el.setAttribute("content", data.author || "Glenn Junsay Pansensoy") })
.on('[id="page-keywords"]',      { element: el => el.setAttribute("content", tags.join(", ") || "essays, Poetic Codes") })
.on('[id="page-canonical"]',     { element: el => el.setAttribute("href", articleUrl) })
.on('[id="og-title"]',           { element: el => el.setAttribute("content", pageTitle) })
.on('[id="og-desc"]',            { element: el => el.setAttribute("content", desc) })
.on('[id="og-url"]',             { element: el => el.setAttribute("content", articleUrl) })
.on('[id="og-image"]',           { element: el => el.setAttribute("content", ogImg) })
.on('[id="og-image-secure"]',    { element: el => el.setAttribute("content", ogImg) })
.on('[id="og-image-url"]',       { element: el => el.setAttribute("content", ogImg) })
.on('[id="og-image-alt"]',       { element: el => el.setAttribute("content", pageTitle) })
.on('[id="og-section"]',         { element: el => el.setAttribute("content", data.category || "Essays") })
.on('[id="og-published"]',       { element: el => el.setAttribute("content", dateISO) })
.on('[id="og-modified"]',        { element: el => el.setAttribute("content", dateISO) })
.on('[id="og-tag"]',             { element: el => el.setAttribute("content", tags.join(", ")) })
.on('[id="tw-title"]',           { element: el => el.setAttribute("content", pageTitle) })
.on('[id="tw-desc"]',            { element: el => el.setAttribute("content", desc) })
.on('[id="tw-image"]',           { element: el => el.setAttribute("content", ogImg) })
.on('[id="tw-image-alt"]',       { element: el => el.setAttribute("content", pageTitle) })
.on('[id="tw-url"]',             { element: el => el.setAttribute("content", articleUrl) })
.on('[id="article-schema"]',     { element: el => el.setInnerContent(schema) })
.transform(staticResponse);
}
