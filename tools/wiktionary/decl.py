"""Prints the Finnish declension table(s) of a word from English Wiktionary (dev-only spot checks)."""
import re, sys, json, urllib.request, urllib.parse
from html.parser import HTMLParser

class TableParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.tables=[]; self.depth=0; self.cur=None; self.row=None; self.cell=None; self.in_fin=False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'h2': self.h2 = True
        if tag == 'table' and 'inflection-table' in (a.get('class') or ''):
            self.cur = []; self.depth = 1; return
        if self.cur is not None:
            if tag == 'table': self.depth += 1
            if tag == 'tr': self.row = []
            if tag in ('td','th'): self.cell = ''
            if tag == 'br' and self.cell is not None: self.cell += ' / '
    def handle_endtag(self, tag):
        if self.cur is None: return
        if tag in ('td','th') and self.cell is not None and self.row is not None:
            self.row.append(re.sub(r'\s+', ' ', self.cell).strip()); self.cell = None
        elif tag == 'tr' and self.row is not None:
            if any(self.row): self.cur.append(self.row)
            self.row = None
        elif tag == 'table':
            self.depth -= 1
            if self.depth == 0: self.tables.append(self.cur); self.cur = None
    def handle_data(self, data):
        if self.cell is not None: self.cell += data

def fetch(word):
    url = 'https://en.wiktionary.org/api/rest_v1/page/html/' + urllib.parse.quote(word)
    req = urllib.request.Request(url, headers={'User-Agent': 'SijaFinnishNounLab-dev-check/0.1 (local verification script)'})
    html = urllib.request.urlopen(req, timeout=30).read().decode('utf-8')
    # Keep only the Finnish section.
    m = re.search(r'<section[^>]*>\s*<h2[^>]*id="Finnish"', html)
    if m:
        start = m.start(); nxt = re.search(r'<section[^>]*>\s*<h2', html[m.end():])
        html = html[start: m.end() + nxt.start()] if nxt else html[start:]
    p = TableParser(); p.feed(html); return p.tables

for word in sys.argv[1:]:
    tables = fetch(word)
    print(f"===== {word}: {len(tables)} table(s)")
    for t in tables:
        for row in t:
            if row and row[0].lower() in ('nominative','genitive','partitive','illative','inessive','essive','accusative','instructive','comitative') or (row and 'declension' in row[0].lower()):
                print('   ', ' | '.join(row))
        print('   ---')
