"""Collect public current-livery sections, with resumable local HTTP cache.

Only explicit current livery sections are imported, never fleet/news registrations.
Uses Python's standard library; no account, browser automation or image downloads.
"""
import argparse
import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://www.xmyzl.com/'
CACHE = ROOT / '.runtime' / 'xmyzl'
OUTPUT = ROOT / 'server' / 'data' / 'xmyzl-liveries.json'
REG = re.compile(r'(?<![A-Z0-9])B\s*[-－–]\s*[A-Z0-9]{3,5}(?![A-Z0-9])', re.I)


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.parts, self.links = [], []
        self.href, self.anchor = None, []
        self.skip = 0
        self.feed(html)
        self.lines = [re.sub(r'\s+', ' ', line).strip() for line in ''.join(self.parts).splitlines()]
        self.lines = [line for line in self.lines if line]

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
        if self.skip:
            return
        if tag in ('br', 'p', 'div', 'tr', 'h1', 'h2', 'h3', 'h4', 'li'):
            self.parts.append('\n')
        if tag == 'a':
            self.href, self.anchor = dict(attrs).get('href'), []

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = max(0, self.skip - 1)
        if self.skip:
            return
        if tag in ('p', 'div', 'tr', 'h1', 'h2', 'h3', 'h4', 'li'):
            self.parts.append('\n')
        if tag == 'a' and self.href:
            self.links.append((urljoin(BASE, self.href), ''.join(self.anchor).strip()))
            self.href = None

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)
            if self.href:
                self.anchor.append(data)


def extract(page):
    records, sections, warnings = [], [], []
    active = False
    for line in page.lines:
        if re.search(r'(当前|现役).*?(彩绘|特别涂装|特殊涂装).*?(情况|飞机)', line):
            active = True
            sections.append({'heading': line, 'lines': []})
            continue
        if not active:
            continue
        if re.search(r'近期|机队消息|历史|退役|退出|机队列表|机队详情|注册号.*机型|飞机号.*机型|留言|备案号', line):
            active = False
            continue
        # Section bodies consist of a livery name followed by registration numbers.
        sections[-1]['lines'].append(line)
        if line.startswith(('不包括：', '不包括:', '注：', '注:')):
            continue
        matches = list(REG.finditer(line))
        if not matches:
            if re.search(r'[：:]|^无$|^暂无', line):
                if not re.search(r'^无|暂无|^[-—]+$', line):
                    warnings.append('栏目内未解析行: ' + line[:180])
            else:
                warnings.append('栏目内未知格式: ' + line[:180])
            continue
        name = line[:matches[0].start()].strip(' :：、;；')
        # Some airlines (e.g. China United) list the registration first.
        if not name and len(matches) == 1:
            name = line[matches[0].end():].strip(' :：、;；')
        if not name or re.search(r'^\d{4}年|引进|退出', name):
            warnings.append('需人工确认: ' + line[:180])
            continue
        for i, match in enumerate(matches):
            registration = re.sub(r'\s+', '', match.group()).upper().replace('－', '-').replace('–', '-')
            suffix = line[match.end():matches[i+1].start() if i+1 < len(matches) else len(line)].strip(' 、,，;；')
            note = suffix if suffix.startswith(('(', '（')) and match.start() > 0 else ''
            records.append({'registration': registration, 'name': name + note, 'evidence': line})
    return records, sections, warnings


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--cached', action='store_true', help='parse only cached responses, no network')
    parser.add_argument('--refresh', action='store_true', help='download again instead of resuming cache')
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    last_request = 0
    robot = RobotFileParser()
    robot.parse([])
    if not args.cached:
        try:
            with urlopen(Request(BASE + 'robots.txt', headers={'User-Agent': 'SpecialAircrafts-LiveryCatalog/1.0'}), timeout=25) as r:
                robot.parse(r.read().decode('utf-8', errors='replace').splitlines())
        except HTTPError as error:
            if error.code != 404:
                raise

    def fetch(url):
        nonlocal last_request
        path = CACHE / (hashlib.sha256(url.encode()).hexdigest() + '.json')
        if path.exists() and not args.refresh:
            return json.loads(path.read_text(encoding='utf-8'))
        if args.cached:
            raise RuntimeError('Missing cache: ' + url)
        if not robot.can_fetch('SpecialAircrafts-LiveryCatalog', url):
            raise RuntimeError('robots.txt disallows: ' + url)
        interval = max(1.1, robot.crawl_delay('SpecialAircrafts-LiveryCatalog') or 0)
        time.sleep(max(0, interval - (time.monotonic() - last_request)))
        last_request = time.monotonic()
        with urlopen(Request(url, headers={'User-Agent': 'SpecialAircrafts-LiveryCatalog/1.0', 'Accept': 'text/html'}), timeout=25) as r:
            if urlparse(r.url).hostname not in ('www.xmyzl.com', 'xmyzl.com'):
                raise RuntimeError('Unexpected redirect host')
            html = r.read().decode('utf-8-sig')
        result = {'url': url, 'fetchedAt': datetime.now(timezone.utc).isoformat(), 'html': html}
        path.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
        return result

    pending, seen, airlines, failures = [BASE + '?mod=jidui'], set(), {}, []
    while pending:
        url = pending.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            page = Page(fetch(url)['html'])
            if not any('共有' in line and '页' in line for line in page.lines):
                raise RuntimeError('Directory pagination missing; unexpected response')
            for link, label in page.links:
                query = parse_qs(urlparse(link).query)
                if urlparse(link).hostname != 'www.xmyzl.com':
                    continue
                if query.get('mod') == ['jidui_show'] and query.get('id'):
                    ident = query['id'][0]
                    if label:
                        airlines[ident] = {'airline': label, 'url': BASE + '?mod=jidui_show&id=' + ident}
                if query.get('mod') == ['jidui'] and 'page' in query and 'typeid' not in query:
                    if query['page'] == ['1']:
                        link = BASE + '?mod=jidui'
                    if link not in seen and link not in pending:
                        pending.append(link)
            print(f'Directory {len(seen)}: {len(airlines)} detail links', flush=True)
        except Exception as error:
            failures.append({'url': url, 'error': str(error)})

    pages, records = [], []
    for ident, airline in airlines.items():
        try:
            response = fetch(airline['url'])
            page = Page(response['html'])
            if not any('当前位置：' in line and '机队' in line for line in page.lines):
                raise RuntimeError('Fleet page marker missing; unexpected response')
            entries, sections, warnings = extract(page)
            notices = []
            for section in sections:
                count = re.search(r'[（(]([\d+]+)[）)]', section['heading'])
                if count and len(sections) == 1:
                    declared = sum(int(n) for n in count[1].split('+'))
                    actual = len({r['registration'] for r in entries})
                    if actual != declared:
                        notices.append(f'网站标题标注 {declared} 架，正文实际列出 {actual} 个注册号；按正文保留，不补造或删减。')
                    if declared > 0 and actual == 0:
                        warnings.append('栏目声明有彩绘飞机但未解析到注册号，需人工复核。')
            pages.append({**airline, 'fetchedAt': response['fetchedAt'], 'sections': sections, 'warnings': warnings, 'notices': notices, 'count': len(entries)})
            for entry in entries:
                records.append({**entry, 'airline': airline['airline'], 'sourceUrl': airline['url'], 'observedAt': response['fetchedAt']})
            print(f'{len(pages)}/{len(airlines)} {airline["airline"]}: {len(entries)} registrations, {len(warnings)} warnings', flush=True)
        except Exception as error:
            failures.append({**airline, 'error': str(error)})

    report = {'source': '民航休闲小站', 'sourceUrl': BASE + '?mod=jidui', 'generatedAt': datetime.now(timezone.utc).isoformat(),
              'directoryPages': len(seen), 'discoveredAirlines': len(airlines), 'pages': pages, 'failures': failures, 'records': records}
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    (ROOT / '.runtime' / 'xmyzl-last-report.json').write_text(encoded, encoding='utf-8')
    print(json.dumps({'records': len(records), 'uniqueRegistrations': len({r['registration'] for r in records}), 'pages': len(pages), 'failures': len(failures)}, ensure_ascii=False), flush=True)
    if failures or any(p['warnings'] for p in pages):
        raise SystemExit(1)
    OUTPUT.write_text(encoded, encoding='utf-8')


if __name__ == '__main__':
    main()
