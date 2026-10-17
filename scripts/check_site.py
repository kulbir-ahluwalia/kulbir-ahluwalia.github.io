#!/usr/bin/env python3
"""check_site.py - verify a built Jekyll site before it ships.

For every *.html under SITE_DIR it checks that
  * internal links and assets (href, src, srcset, poster, data; own-domain absolute URLs too)
    point at files that exist, using GitHub Pages rules (dir/ -> dir/index.html, /page -> page.html);
  * #fragments exist as id= (or <a name=>) in the target page, same-page and cross-page;
  * no unrendered Liquid leaked into a URL (error) or into visible text (warning);
  * repo tooling and notes (CLAUDE.md, README.md, *.py, *.tex, ...) were not published (warning).
With --src it also parses _config.yml and every _data/*.yml|yaml (a parse error is an error).
With --external it probes external URLs as well (HEAD, then GET; slow, needs network access).

Usage
  bundle exec jekyll build && python3 scripts/check_site.py _site --src .
  python3 scripts/check_site.py --yaml-only --src .
  python3 scripts/check_site.py _site --external          # adds external URL probes
Exit status 1 when something is broken; warnings alone exit 0 unless --strict.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import fnmatch
import os
import posixpath
import ssl
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

URL_ATTRS = {"a": ("href",), "area": ("href",), "link": ("href",), "img": ("src", "srcset"),
             "script": ("src",), "source": ("src", "srcset"), "video": ("src", "poster"),
             "audio": ("src",), "track": ("src",), "iframe": ("src",), "embed": ("src",),
             "object": ("data",), "input": ("src",)}
META_URLS = {"og:image", "og:url", "og:video", "twitter:image"}
SKIP_SCHEMES = {"mailto", "tel", "javascript", "data", "sms", "about", "blob", "file", "ftp",
                "webcal", "geo", "skype", "whatsapp", "zoommtg", "slack", "facetime"}
LINK_REL_SKIP = {"preconnect", "dns-prefetch"}
RAW_TEXT_TAGS = {"script", "style", "code", "pre", "textarea"}
TOOLING_NAMES = {"CLAUDE.md", "AGENTS.md", "README.md", "Gemfile", "Gemfile.lock", ".env"}
TOOLING_SUFFIXES_ANYWHERE = {".tex", ".cls", ".bak", ".mdc"}         # e.g. CV LaTeX sources
TOOLING_SUFFIXES_TOP = {".py", ".sh", ".rb", ".lock"}                 # course files may ship scripts
ALWAYS_OK_FRAGMENTS = {"", "top"}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.refs: list[tuple[int, str, str]] = []  # (line, where, url)
        self.liquid_text: list[tuple[int, str]] = []
        self._raw = 0

    def handle_starttag(self, tag, attrs):
        a = {k: (v if v is not None else "") for k, v in attrs}
        line = self.getpos()[0]
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        if tag in RAW_TEXT_TAGS:
            self._raw += 1
        if tag == "link" and set(a.get("rel", "").lower().split()) & LINK_REL_SKIP:
            return
        if tag == "meta":
            key = (a.get("property") or a.get("name") or "").lower()
            if key in META_URLS and a.get("content"):
                self.refs.append((line, f"meta {key}", a["content"]))
            return
        for attr in URL_ATTRS.get(tag, ()):
            value = a.get(attr)
            if value is None:
                continue
            if attr == "srcset":
                for part in value.split(","):
                    bits = part.strip().split()
                    if bits:
                        self.refs.append((line, f"{tag} srcset", bits[0]))
            else:
                self.refs.append((line, f"{tag} {attr}", value))

    def handle_endtag(self, tag):
        if tag in RAW_TEXT_TAGS and self._raw:
            self._raw -= 1

    def handle_data(self, data):
        if not self._raw and ("{{" in data or "{%" in data):
            self.liquid_text.append((self.getpos()[0], " ".join(data.split())[:80]))


class Site:
    def __init__(self, root: Path, own_hosts: set[str]):
        self.root = root
        self.own_hosts = own_hosts
        self._pages: dict[str, Page] = {}

    def page(self, rel: str) -> Page:
        if rel not in self._pages:
            p = Page()
            p.feed((self.root / rel).read_text(encoding="utf-8", errors="replace"))
            p.close()
            self._pages[rel] = p
        return self._pages[rel]

    def find(self, target: str) -> str | None:
        if target in ("", "/"):
            cands = ["index.html"]
        elif target.endswith("/"):
            cands = [target + "index.html"]
        else:
            cands = [target, target + ".html", target + "/index.html"]
        for c in cands:
            if (self.root / c).is_file():
                return c
        return None

    def classify(self, page_rel: str, url: str):
        """('skip'|'liquid'|'external'|'escape'|'internal', target, fragment)"""
        url = url.strip()
        if not url or url.startswith("#!"):
            return "skip", None, None
        if "{{" in url or "{%" in url:
            return "liquid", url, None
        sp = urlsplit(url)
        scheme = sp.scheme.lower()
        if scheme in SKIP_SCHEMES:
            return "skip", None, None
        if scheme in ("http", "https") or url.startswith("//"):
            host = sp.netloc.lower().rsplit("@", 1)[-1].split(":")[0]
            if host not in self.own_hosts:
                return "external", url, None
            path = sp.path or "/"
        elif scheme:
            return "skip", None, None
        else:
            path = sp.path
        frag = unquote(sp.fragment)
        if path == "":
            return "internal", page_rel, frag
        path = unquote(path)
        joined = path.lstrip("/") if path.startswith("/") else posixpath.join(posixpath.dirname(page_rel), path)
        target = posixpath.normpath(joined) if joined else ""
        if target == ".":
            target = ""
        if target == ".." or target.startswith("../"):
            return "escape", path, frag
        if path.endswith("/") and target:
            target += "/"
        return "internal", target, frag


def own_hosts_for(site_dir: Path, src: Path | None) -> set[str]:
    hosts = set()
    cname = site_dir / "CNAME"
    if cname.is_file():
        hosts.add(cname.read_text().strip().lower())
    if src is not None:
        try:
            import yaml
            cfg = yaml.safe_load((src / "_config.yml").read_text(encoding="utf-8")) or {}
            if cfg.get("url"):
                hosts.add(urlsplit(str(cfg["url"])).netloc.lower())
            if cfg.get("github_username"):
                hosts.add(f"{str(cfg['github_username']).lower()}.github.io")
        except Exception:
            pass
    hosts |= {"www." + h for h in list(hosts) if not h.startswith("www.")}
    return {h for h in hosts if h}


def check_yaml(src: Path, errors: list, warnings: list) -> int:
    try:
        import yaml
    except ImportError:
        warnings.append(("yaml", "-", "PyYAML missing (pip install pyyaml); YAML not checked"))
        return 0
    files = [src / "_config.yml"] + sorted((src / "_data").glob("*.y*ml"))
    n = 0
    for f in files:
        if not f.is_file():
            continue
        n += 1
        try:
            yaml.safe_load(f.read_text(encoding="utf-8"))
        except yaml.YAMLError as e:
            mark = getattr(e, "problem_mark", None)
            where = f"{f.relative_to(src)}:{mark.line + 1}:{mark.column + 1}" if mark else str(f.relative_to(src))
            errors.append(("yaml", where, getattr(e, "problem", None) or str(e).splitlines()[0]))
    return n


def probe(url: str, timeout: float):
    ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
    headers = {"User-Agent": "Mozilla/5.0 (link check for kulbir-singh-ahluwalia.com)"}
    last = (None, "no response")
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
                return r.status, None
        except urllib.error.HTTPError as e:
            last = (e.code, None)
            if method == "HEAD":
                continue
            return last
        except Exception as e:  # DNS, TLS, proxy refusal, timeout
            last = (None, f"{type(e).__name__}: {e}"[:120])
    return last


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("site_dir", nargs="?", type=Path, help="built site, e.g. _site")
    ap.add_argument("--src", type=Path, help="source checkout: parse _config.yml and _data/*.yml")
    ap.add_argument("--yaml-only", action="store_true", help="only parse the YAML under --src")
    ap.add_argument("--external", action="store_true", help="also probe external URLs (slow)")
    ap.add_argument("--timeout", type=float, default=8.0)
    ap.add_argument("--max-external", type=int, default=400)
    ap.add_argument("--skip", action="append", default=[], help="glob of pages not to check (repeatable)")
    ap.add_argument("--strict", action="store_true", help="warnings fail too")
    args = ap.parse_args()

    errors: list[tuple[str, str, str]] = []    # (kind, where, detail)
    warnings: list[tuple[str, str, str]] = []
    summary = []

    if args.src:
        n = check_yaml(args.src, errors, warnings)
        summary.append(f"{n} YAML file(s) parsed")
    if args.yaml_only:
        if not args.src:
            ap.error("--yaml-only needs --src")
    else:
        if not args.site_dir or not args.site_dir.is_dir():
            ap.error("site_dir must be a built site directory (run: bundle exec jekyll build)")
        root = args.site_dir.resolve()
        site = Site(root, own_hosts_for(root, args.src))
        pages = sorted(p.relative_to(root).as_posix() for p in root.rglob("*.html"))
        pages = [p for p in pages if not any(fnmatch.fnmatch(p, g) for g in args.skip)]
        external: dict[str, list[str]] = {}
        seen: dict[tuple, int] = {}
        checked = 0
        for rel in pages:
            page = site.page(rel)
            for line, text in page.liquid_text:
                warnings.append(("liquid in text", f"{rel}:{line}", text))
            for line, where, url in page.refs:
                kind, target, frag = site.classify(rel, url)
                if kind == "skip":
                    continue
                if kind == "external":
                    external.setdefault(target, []).append(f"{rel}:{line}")
                    continue
                checked += 1
                if kind == "liquid":
                    errors.append(("unrendered Liquid in URL", f"{rel}:{line}", url))
                    continue
                if kind == "escape":
                    errors.append(("link escapes site root", f"{rel}:{line}", url))
                    continue
                found = site.find(target)
                if found is None:
                    key = ("missing file", rel, target)
                    seen[key] = seen.get(key, 0) + 1
                    if seen[key] == 1:
                        errors.append(("missing file", f"{rel}:{line}", f"{url}  ({where})"))
                    continue
                if frag in ALWAYS_OK_FRAGMENTS or frag.startswith(":~:") or not found.endswith(".html"):
                    continue
                if frag not in site.page(found).ids:
                    key = ("missing anchor", rel, found, frag)
                    seen[key] = seen.get(key, 0) + 1
                    if seen[key] == 1:
                        errors.append(("missing anchor", f"{rel}:{line}", f"{url}  (no id=\"{frag}\" in {found})"))
        for f in sorted(root.rglob("*")):
            rel = f.relative_to(root).as_posix()
            suffix = f.suffix.lower()
            if f.is_file() and (f.name in TOOLING_NAMES or rel.startswith("scripts/")
                                or suffix in TOOLING_SUFFIXES_ANYWHERE
                                or (suffix in TOOLING_SUFFIXES_TOP and "/" not in rel)):
                warnings.append(("repo tooling published", rel, "add it to exclude: in _config.yml"))
        summary.append(f"{len(pages)} page(s), {checked} internal link/asset reference(s), {len(external)} unique external URL(s)")

        if args.external and external:
            urls = sorted(external)[: args.max_external]
            ok = 0
            with cf.ThreadPoolExecutor(max_workers=8) as pool:
                for url, (status, err) in zip(urls, pool.map(lambda u: probe(u, args.timeout), urls)):
                    origin = external[url][0] + (f" (+{len(external[url]) - 1} more)" if len(external[url]) > 1 else "")
                    if status is not None and status < 400:
                        ok += 1
                    elif status in (404, 410):
                        errors.append((f"external {status}", origin, url))
                    else:
                        warnings.append((f"external {status or 'unreachable'}", origin, f"{url}  {err or ''}".strip()))
            summary.append(f"external: {ok}/{len(urls)} reachable")

    print(f"check_site: {len(errors)} error(s), {len(warnings)} warning(s); " + "; ".join(summary))
    for level, items in (("ERROR", errors), ("WARNING", warnings)):
        for kind, where, detail in items:
            print(f"{level:<7} {kind}: {where} -> {detail}")
    return 1 if errors or (args.strict and warnings) else 0


if __name__ == "__main__":
    sys.exit(main())
