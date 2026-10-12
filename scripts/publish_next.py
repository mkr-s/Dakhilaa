#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dakhilaa blog drip-publisher.
Runs from the repo root (via GitHub Actions). On each run it publishes every
queued post whose go-live date has arrived: it moves the post from drafts/ to
the repo root, adds its card to blog.html and its URL to sitemap.xml, and marks
it published in queue.json. It is safe to run repeatedly (idempotent).
Override the date for testing with the DRIP_TODAY env var (YYYY-MM-DD).
"""
import os, json, datetime, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE = os.path.join(ROOT, "queue.json")
BLOG  = os.path.join(ROOT, "blog.html")
SITEMAP = os.path.join(ROOT, "sitemap.xml")
MARKER = "<!--DRIP-POSTS-->"
BASE = "https://www.dakhilaa.com/"
COLOR = {"Scores & Ranks":"#38bdf8","Syllabus":"#a78bfa","Strategy":"#fb923c","Exam Info":"#22c55e"}

def today():
    v = os.environ.get("DRIP_TODAY")
    return datetime.date.fromisoformat(v) if v else datetime.date.today()

def card_html(p):
    col = COLOR.get(p["cat"], "#fb923c")
    return ('      <a class="bcard" data-cat="{cat}" href="{file}">\n'
            '        <span class="badge" style="color:{col};border-color:{col}55;background:{col}14">{cat}</span>\n'
            '        <h3>{title}</h3>\n'
            '        <p>{blurb}</p>\n'
            '        <div class="meta"><span>Mukesh Singh</span><span>{date}</span></div>\n'
            '        <span class="read-more">Read article &rarr;</span>\n'
            '      </a>\n').format(cat=p["cat"], file=p["file"], col=col,
                                   title=p["title"], blurb=p["blurb"], date=p["date"])

def sitemap_row(p):
    return ('  <url>\n    <loc>{base}{file}</loc>\n    <lastmod>{d}</lastmod>\n'
            '    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n'
            ).format(base=BASE, file=p["file"], d=p["golive"])

def main():
    with open(QUEUE, encoding="utf-8") as f:
        q = json.load(f)
    t = today()
    blog = open(BLOG, encoding="utf-8").read()
    if MARKER not in blog:
        print("ERROR: marker not found in blog.html — aborting."); sys.exit(1)
    sm = open(SITEMAP, encoding="utf-8").read()
    published_now = []

    for p in sorted(q, key=lambda x: x["golive"]):
        if p.get("published"):
            continue
        if datetime.date.fromisoformat(p["golive"]) > t:
            continue
        # 1) move the post file from drafts/ to root
        src = os.path.join(ROOT, "drafts", p["file"])
        dst = os.path.join(ROOT, p["file"])
        if os.path.exists(src):
            shutil.move(src, dst)
        elif not os.path.exists(dst):
            print("WARN: neither draft nor live file for", p["file"], "- skipping"); continue
        # 2) add card to blog.html (newest first, just after the marker)
        if 'href="%s"' % p["file"] not in blog:
            blog = blog.replace(MARKER, MARKER + "\n" + card_html(p), 1)
        # 3) add to sitemap.xml
        if BASE + p["file"] not in sm:
            sm = sm.replace("</urlset>", sitemap_row(p) + "</urlset>")
        p["published"] = True
        published_now.append(p["file"])
        print("PUBLISHED:", p["file"], "(go-live", p["golive"] + ")")

    if published_now:
        open(BLOG, "w", encoding="utf-8").write(blog)
        open(SITEMAP, "w", encoding="utf-8").write(sm)
        with open(QUEUE, "w", encoding="utf-8") as f:
            json.dump(q, f, indent=2, ensure_ascii=False)
        print("Done. Published %d post(s)." % len(published_now))
    else:
        print("Nothing due today (%s)." % t.isoformat())

if __name__ == "__main__":
    main()
