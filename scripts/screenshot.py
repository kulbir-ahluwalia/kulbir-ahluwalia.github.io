#!/usr/bin/env python3
"""screenshot.py - desktop and mobile screenshots of a built site, for visual QA.

Serves SITE_DIR on 127.0.0.1 (a free port), opens it in Playwright Chromium and writes
  desktop_index.png / mobile_index.png   full page /         (1440x900 and 390x844)
  desktop_cv.png    / mobile_cv.png      full page /cv.html
  desktop_news.png, mobile_news.png, desktop_publications.png   the News / Publications sections
It also prints console errors and local requests that failed (404s on images, CSS, JS).

External requests (Google Fonts, CDNs, analytics) are blocked by default so pages render fast and the
same way offline; icons and web fonts then fall back. Pass --allow-external to load them.
Uses the pre-installed Chromium ($PLAYWRIGHT_BROWSERS_PATH); it never downloads a browser.

Usage
  bundle exec jekyll build && python3 scripts/screenshot.py _site /tmp/shots
  python3 scripts/screenshot.py _site /tmp/shots --pages / /cv.html /cs498gc/fa25/slaming_mars.html
"""
from __future__ import annotations

import argparse
import functools
import glob
import http.server
import os
import sys
import threading
from pathlib import Path
from urllib.parse import urlsplit

try:
    from playwright.sync_api import Error as PWError
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.stderr.write("screenshot: Python Playwright is missing (pip install playwright; do not download browsers here)\n")
    sys.exit(3)

VIEWPORTS = {
    "desktop": dict(viewport={"width": 1440, "height": 900}, device_scale_factor=1),
    "mobile": dict(viewport={"width": 390, "height": 844}, device_scale_factor=1, is_mobile=True, has_touch=True,
                   user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
                              "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"),
}
# sections captured on their own: (page, css selector of the heading id, file stem, viewports)
SECTIONS = [("/", "news", ("desktop", "mobile")), ("/", "publications", ("desktop",))]
# time- or scroll-triggered overlays that make screenshots non-deterministic
HIDE_CSS = "#promo-modal{display:none !important}"
# fixed/sticky bars (navbar, mobile info bar) get stamped across section shots; hide them for those
HIDE_FIXED_JS = """() => { for (const el of document.querySelectorAll('body *')) {
  const p = getComputedStyle(el).position;
  if (p === 'fixed' || p === 'sticky') { el.dataset.shotHidden = '1'; el.style.visibility = 'hidden'; } } }"""
SHOW_FIXED_JS = """() => { for (const el of document.querySelectorAll('[data-shot-hidden]')) {
  el.style.visibility = ''; delete el.dataset.shotHidden; } }"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(directory: Path) -> http.server.ThreadingHTTPServer:
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(directory)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def launch(p):
    try:
        return p.chromium.launch()
    except PWError:
        # the pip package may expect a different browser build than the one pre-installed
        root = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
        for exe in sorted(glob.glob(f"{root}/chromium-*/chrome-linux*/chrome"), reverse=True):
            return p.chromium.launch(executable_path=exe)
        raise


def stem(path: str) -> str:
    name = path.strip("/").replace("/", "_").removesuffix(".html")
    return name or "index"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("site_dir", type=Path)
    ap.add_argument("out_dir", type=Path)
    ap.add_argument("--pages", nargs="+", default=["/", "/cv.html"])
    ap.add_argument("--allow-external", action="store_true", help="let fonts/CDNs load (needs network)")
    ap.add_argument("--timeout", type=int, default=30000, help="navigation timeout in ms")
    args = ap.parse_args()
    if not (args.site_dir / "index.html").is_file():
        ap.error(f"{args.site_dir} has no index.html; build first (bundle exec jekyll build)")
    args.out_dir.mkdir(parents=True, exist_ok=True)

    httpd = serve(args.site_dir.resolve())
    base = f"http://127.0.0.1:{httpd.server_address[1]}"
    written, problems = [], []
    with sync_playwright() as p:
        browser = launch(p)
        for vp_name, vp in VIEWPORTS.items():
            ctx = browser.new_context(reduced_motion="reduce", **vp)
            if not args.allow_external:
                ctx.route("**/*", lambda route: route.continue_()
                          if urlsplit(route.request.url).hostname in ("127.0.0.1", "localhost")
                          else route.abort())
            page = ctx.new_page()
            page.on("console", lambda m, v=vp_name: problems.append(f"[{v}] console {m.type}: {m.text[:160]}")
                    if m.type == "error" and "net::ERR_FAILED" not in m.text else None)
            page.on("response", lambda r, v=vp_name: problems.append(f"[{v}] HTTP {r.status}: {r.url.replace(base, '')}")
                    if r.status >= 400 and r.url.startswith(base) else None)
            page.on("pageerror", lambda e, v=vp_name: problems.append(f"[{v}] JS exception: {str(e)[:160]}"))
            for path in args.pages:
                page.goto(base + path, wait_until="load", timeout=args.timeout)
                page.add_style_tag(content=HIDE_CSS)
                page.wait_for_timeout(500)
                out = args.out_dir / f"{vp_name}_{stem(path)}.png"
                page.screenshot(path=str(out), full_page=True)
                written.append(out)
                sections = [s for s in SECTIONS if s[0] == path and vp_name in s[2]]
                if sections:
                    page.evaluate(HIDE_FIXED_JS)
                for _, sec_id, _ in sections:
                    loc = page.locator(f"section:has(#{sec_id})").first
                    if loc.count():
                        out = args.out_dir / f"{vp_name}_{sec_id}.png"
                        loc.screenshot(path=str(out))
                        written.append(out)
                    else:
                        problems.append(f"[{vp_name}] no section with #{sec_id} on {path}")
                if sections:
                    page.evaluate(SHOW_FIXED_JS)
            ctx.close()
        browser.close()
    httpd.shutdown()

    for out in written:
        print(f"wrote {out}")
    if problems:
        print(f"{len(problems)} page problem(s):")
        for line in dict.fromkeys(problems):
            print("  " + line)
    if not args.allow_external:
        print("note: external fonts/CDNs were blocked, so icon/web fonts fall back and CDN-loaded jQuery "
              "is absent ('$ is not defined' is expected here, not on the live site)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
