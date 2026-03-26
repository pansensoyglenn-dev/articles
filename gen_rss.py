import os
from datetime import datetime

# Configuration
DOMAIN = "https://pansensoyglenn-dev.github.io/articles"
DIRECTORY = "./"  # Run this inside your /articles folder
OUTPUT_FILE = "feed.xml"

rss_template = """<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2000/Atom">
<channel>
    <title>Poetic Codes | Articles</title>
    <link>{domain}</link>
    <description>Professional Python and Web Development Documentation</description>
    <language>en-us</language>
    <atom:link href="{domain}/feed.xml" rel="self" type="application/rss+xml" />
{items}
</channel>
</rss>"""

item_template = """    <item>
        <title>{title}</title>
        <link>{link}</link>
        <guid>{link}</guid>
        <pubDate>{pub_date}</pubDate>
        <description>Technical documentation for {title}</description>
    </item>"""

items_list = []

# Scan for HTML files
for file in os.listdir(DIRECTORY):
    if file.endswith(".html") and file != "index.html":
        title = file.replace(".html", "").replace("-", " ").title()
        link = f"{DOMAIN}/{file}"
        # Use file modification time as publication date
        mtime = os.path.getmtime(os.path.join(DIRECTORY, file))
        pub_date = datetime.fromtimestamp(mtime).strftime('%a, %d %b %Y %H:%M:%S GMT')
        
        items_list.append(item_template.format(title=title, link=link, pub_date=pub_date))

# Write the file
with open(OUTPUT_FILE, "w") as f:
    f.write(rss_template.format(domain=DOMAIN, items="\n".join(items_list)))

print(f"Successfully generated {OUTPUT_FILE} with {len(items_list)} articles.")
