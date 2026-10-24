#!/usr/bin/env python3
"""check_claims.py - catch overclaiming on kulbir-singh-ahluwalia.com before it ships.

Rules
  R1  error    A publication whose venue / awards / status says "in preparation", "under review",
               "submitted" or "under submission" is described as accepted / published / to appear /
               in proceedings / presented at: in its own entry, in a news item, the announcement bar,
               the promo card, the bio, any other _data file, index.html or cv.html.
               (R1 as a warning: a news item mentions such a paper and a status word in different
               sentences, so a human should read it.)
  R2  error    "PhD candidate" / "Ph.D. candidate" / "doctoral candidate" in any published or
               build-input file, unless CANDIDACY_CONFIRMED (below) is True.
  R3  warning  Award-type words (best paper, award, oral, spotlight, finalist, invited, keynote) in the
               content files, listed so a human confirms each one is real.
  R4  warning  A news item says "accepted" or "presented" but links to nothing.
  R5  error    News or the announcement bar is not a finished, public result: it states a plan or
               work in progress (started writing, began, in preparation, submitted, under review,
               next step, ...) or internal detail (which machine or day something ran, TA reference
               runs, points or extra credit, tool names).
  R6  error    Placeholder text in a publication entry ("to be finalized", TBD, TODO, xx).
  Y1  error    _config.yml or a _data/*.yml file does not parse.

Put the marker  claims-ok  on a line (YAML comment or HTML comment) to accept a deliberate finding.

Usage
  python3 scripts/check_claims.py                 # whole repo; exit 1 on errors
  python3 scripts/check_claims.py --strict        # warnings fail too
  python3 scripts/check_claims.py --only _data/news.yml --quiet   # one file, errors only (hooks)
  python3 scripts/check_claims.py --src ../other-checkout --github  # GitHub Actions annotations
Exit status: 0 clean, 1 failing findings, 3 PyYAML missing (callers treat 3 as "cannot check").
"""
from __future__ import annotations

# At UIUC a doctoral student becomes a "candidate" only after passing the preliminary exam.
# Keep this False until Kulbir has passed it; then set it to True and R2 stops firing.
CANDIDACY_CONFIRMED = False

import argparse
import fnmatch
import html
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write("check_claims: PyYAML is not installed (pip install pyyaml); skipping\n")
    sys.exit(3)

REPO = Path(__file__).resolve().parent.parent

CONTENT_YAML = ("_config.yml", "_data/news.yml", "_data/publications.yml",
                "_data/announcement.yml", "_data/popup.yml")
CONTENT_HTML = ("index.html", "cv.html")
# _config.yml keys whose values are rendered as prose
CONFIG_TEXT_KEYS = {"title", "name", "position", "description", "bio", "tagline", "subtitle", "headline"}
# publication/project fields that hold paths, ids or lists of keys, not prose
NON_PROSE_FIELDS = {"id2", "image", "image_mouseover", "image_border", "pdf", "paper", "arxiv",
                    "github", "project_page", "webpage", "video", "topics", "authors",
                    "shared_first_authors", "link", "cta_link", "id", "url", "enabled",
                    "delay_ms", "cooldown_days"}
TEXT_EXT = {".html", ".htm", ".md", ".markdown", ".yml", ".yaml", ".json", ".xml", ".txt", ".js"}
SKIP_TOP = {".git", "_site", ".jekyll-cache", ".sass-cache", "vendor", "node_modules", "scripts"}
SUPPRESS = "claims-ok"

PENDING_RE = re.compile(r"\b(?:manuscript\s+)?(?:in preparation|under review|submitted|under submission|in submission)\b", re.I)
FORBIDDEN_RE = re.compile(r"\b(?:accepted|published|to appear|in (?:the )?proceedings(?: of)?|proceedings of|presented (?:at|in))\b", re.I)
NEGATED_RE = re.compile(r"\b(?:not|never|n't|yet to be|pending|awaiting|until|before|once|if|when|unless)\b[^.;:!?]*$", re.I)
CANDIDATE_RE = re.compile(r"\b(?:ph\.?\s?d\.?|doctoral)\s+candidates?\b", re.I)
AWARD_RE = re.compile(r"\b(?:best[ -](?:paper|poster|student paper|demo|presentation|thesis)s?|awards?|awarded|oral|spotlight|finalists?|invited|keynotes?)\b", re.I)
AWARD_HEADING_RE = re.compile(r"(?:(?:honou?rs|achievements?)\s*(?:and|&)\s*)?awards?(?:\s*(?:and|&)\s*(?:honou?rs|achievements?))?\s*:?", re.I)
STATUS_WORD_RE = re.compile(r"\b(?:accepted|presented)\b", re.I)
OFFER_RE = re.compile(r"(?:\s+[\w.&-]+){0,8}?\s+(?:offer|position|role|job|internship|invitation)s?\b", re.I)
NEWS_PLAN_RE = re.compile(
    r"\b(?:started (?:writing|working|drafting)|began|beginning|begin (?:work|writing)|working on|drafting|"
    r"in preparation|in progress|under review|submitted|under submission|plan(?:s|ned)? to|will (?:submit|release|start|publish|present)|"
    r"next steps?|upcoming|coming soon|stay tuned|to be finalized|author list)\b", re.I)
NEWS_INTERNAL_RE = re.compile(
    r"\b(?:reference runs?|recorded (?:on|in)|laptop|MSI|DGX|Spark|GB10|RTX ?\d{4}|MacBook|Jetson|Thor|IQ9|"
    r"Tailscale|ollama|Claude|Copilot|pts|points|extra credit|grading|regrades?|Gradescope)\b", re.I)
PLACEHOLDER_RE = re.compile(r"\b(?:to be finalized|to be decided|TBD|TBA|TODO|FIXME|placeholder|lorem|xx)\b", re.I)
LINK_RE = re.compile(r"<a\s[^>]*\bhref\s*=|\]\([^)]+\)|https?://", re.I)

_COMMENT = re.compile(r"<!--.*?-->", re.S)
_LIQUID = re.compile(r"\{%.*?%\}|\{\{.*?\}\}", re.S)
_TAG = re.compile(r"<[^>]+>")
_MDLINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_SENT = re.compile(r"(?<=[.!?;])\s+(?=[A-Z0-9(\[\"'])")
_TRANS = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"',
                        "–": "-", "—": "-", " ": " "})


def visible(s: str) -> str:
    """Rendered-ish text: no comments, Liquid, tags or Markdown link targets; entities decoded."""
    s = _COMMENT.sub(" ", str(s))
    s = _LIQUID.sub(" ", s)
    s = _TAG.sub(" ", s)
    s = _MDLINK.sub(r"\1", s)
    s = html.unescape(s).translate(_TRANS)
    return re.sub(r"\s+", " ", s).strip()


def blank(m: re.Match) -> str:
    """Replace a match with spaces but keep its newlines, so line numbers stay right."""
    return re.sub(r"[^\n]", " ", m.group(0))


def sentences(text: str) -> list[str]:
    return [s for s in _SENT.split(text) if s.strip()]


def is_claim(text: str, m: re.Match) -> bool:
    """False for negated/conditional uses ("not yet accepted", "once published") and for
    accepting something yourself ("Accepted a ... internship offer")."""
    if NEGATED_RE.search(text[max(0, m.start() - 40):m.start()]):
        return False
    if m.group(0).lower() == "accepted" and OFFER_RE.match(text, m.end()):
        return False
    return True


def claim_words(text: str) -> list[str]:
    return [m.group(0) for m in FORBIDDEN_RE.finditer(text) if is_claim(text, m)]


def clip(text: str, n: int = 110) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= n else text[: n - 3] + "..."


# ---------------------------------------------------------------- YAML with line numbers
class LStr(str):
    line = 0
    end_line = 0


def _obj(node):
    if isinstance(node, yaml.ScalarNode):
        s = LStr(node.value)
        s.line, s.end_line = node.start_mark.line + 1, node.end_mark.line + 1
        return s
    if isinstance(node, yaml.SequenceNode):
        return [_obj(n) for n in node.value]
    if isinstance(node, yaml.MappingNode):
        return {str(k.value): _obj(v) for k, v in node.value}
    return None


def walk_strings(obj, keys=()):
    if isinstance(obj, LStr):
        yield keys, obj
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk_strings(v, keys + (i,))
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk_strings(v, keys + (k,))


def as_text(v) -> str:
    if isinstance(v, list):
        return " ".join(as_text(x) for x in v)
    return "" if v is None or isinstance(v, dict) else str(v)


# ---------------------------------------------------------------- findings
class Report:
    def __init__(self, src: Path):
        self.src = src
        self.items: list[tuple] = []
        self._seen: set = set()
        self._lines: dict[str, list[str]] = {}

    def lines(self, rel: str) -> list[str]:
        if rel not in self._lines:
            try:
                self._lines[rel] = (self.src / rel).read_text(encoding="utf-8", errors="replace").splitlines()
            except OSError:
                self._lines[rel] = []
        return self._lines[rel]

    def add(self, level: str, rule: str, rel: str, line: int, msg: str, snippet: str = ""):
        lines = self.lines(rel)
        if 0 < line <= len(lines) and SUPPRESS in lines[line - 1]:
            return
        key = (level, rule, rel, line, msg)
        if key in self._seen:
            return
        self._seen.add(key)
        self.items.append((level, rule, rel, line, msg, snippet))


def refine_line(report: Report, rel: str, start: int, end: int, needle: str) -> int:
    """Inside a multi-line YAML scalar, point at the line that holds `needle`."""
    if end <= start or not needle:
        return start
    lines = report.lines(rel)
    low = needle.lower()
    for i in range(start, min(end, len(lines)) + 1):
        if low in lines[i - 1].lower():
            return i
    return start


# ---------------------------------------------------------------- publications
class Pub:
    def __init__(self, entry: dict):
        self.entry = entry
        self.title = visible(as_text(entry.get("title")))
        self.line = getattr(entry.get("title"), "line", 0)
        self.prefix = self.title.split(":", 1)[0].strip() if ":" in self.title else ""
        status = " ".join(visible(as_text(entry.get(k))) for k in ("venue", "awards", "status"))
        m = PENDING_RE.search(status)
        self.pending = bool(m)
        self.status_phrase = m.group(0).lower() if m else ""
        self.label = self.prefix or clip(self.title, 40)
        self.refs: list[tuple[str, re.Pattern, bool]] = []  # (kind, regex, case_sensitive)

    def find_ref(self, vis: str):
        low = vis.lower()
        for kind, rx, case in self.refs:
            m = rx.search(vis if case else low)
            if m:
                return kind, m.group(0)
        return None


def _word(term: str) -> re.Pattern:
    return re.compile(r"(?<![\w+-])" + re.escape(term) + r"(?![\w+-])")


def build_refs(pubs: list[Pub]) -> None:
    by_prefix: dict[str, int] = {}
    for p in pubs:
        if p.prefix:
            by_prefix[p.prefix.lower()] = by_prefix.get(p.prefix.lower(), 0) + 1
    for p in pubs:  # "WaypointGen" names two entries: say which one
        if p.prefix and by_prefix[p.prefix.lower()] > 1 and p.entry.get("id2"):
            p.label = f"{p.prefix} [{p.entry['id2']}]"
    settled_venues = " || ".join(visible(as_text(p.entry.get("venue"))).lower() for p in pubs if not p.pending)
    for p in pubs:
        t = p.title.lower()
        if len(t) >= 12:
            p.refs.append(("title", re.compile(re.escape(t)), False))
        if ":" in p.title:
            words = p.title.split(":", 1)[1].lower().split()
            if len(words) >= 4:
                p.refs.append(("subtitle", re.compile(re.escape(" ".join(words[:6]))), False))
        # a short name ("TaP") only counts if no other entry shares it ("WaypointGen" is shared)
        if p.prefix and by_prefix.get(p.prefix.lower()) == 1 and len(p.prefix) >= 3 and " " not in p.prefix:
            p.refs.append(("short name", _word(p.prefix), True))
        for alias in (p.entry.get("aliases") or p.entry.get("short_name") or []):
            if isinstance(alias, str) and alias.strip():
                p.refs.append(("alias", _word(alias.strip()), True))
        if not p.pending:
            continue
        v = visible(as_text(p.entry.get("venue")))
        v = re.sub(r"\s+", " ", PENDING_RE.sub(" ", v))
        v = re.sub(r"\(\s*\)", " ", v).strip(" ,;-()")
        keys: list[tuple[str, bool]] = []
        if len(v) >= 12:
            keys.append((v.lower(), False))
        keys += [(m.group(1), True) for m in re.finditer(r"\(([A-Z][A-Za-z0-9-]{1,12})\)", v)]
        keys += [(m.group(1).lower(), False) for m in re.finditer(r"\b([A-Z][A-Za-z]+(?:\s+\d{4})?\s+Workshop)\b", v)]
        keys += [(m.group(1).lower(), False) for m in re.finditer(r"\b(Transactions on [A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*)", v)]
        for key, case in keys:
            if key.lower() in settled_venues:  # shared with a settled paper: ambiguous, skip
                continue
            p.refs.append(("venue", _word(key) if case else re.compile(re.escape(key)), case))


# ---------------------------------------------------------------- HTML helpers
class _Blocks(HTMLParser):
    """Collect (line, text, mode) for prose blocks; mode 'sentence' or 'block' (whole row)."""
    SENT_TAGS = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "title", "figcaption", "blockquote",
                 "dt", "dd", "caption", "summary"}
    ROW_TAGS = {"li", "tr"}
    ROW_DIV = {"columns", "column", "publication-block", "news-item", "card", "box", "media"}
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param",
            "source", "track", "wbr"}
    META = {"description", "og:description", "twitter:description", "og:title", "twitter:title"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack: list[list] = []
        self.chunks: list[tuple[int, str, str]] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        line = self.getpos()[0]
        if tag == "meta":
            key = (a.get("name") or a.get("property") or "").lower()
            if key in self.META and a.get("content"):
                self.chunks.append((line, a["content"], "sentence"))
            return
        if tag in self.VOID:
            return
        mode = None
        if tag in self.SENT_TAGS:
            mode = "sentence"
        elif tag in self.ROW_TAGS or (tag == "div" and self.ROW_DIV & set(a.get("class", "").split())):
            mode = "block"
        elif tag == "script" and "ld+json" in a.get("type", ""):
            mode = "sentence"
        elif tag in ("script", "style"):
            self.skip += 1
        self.stack.append([tag, mode, line, []])

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for el in reversed(self.stack[i:]):
                    self._close(el)
                del self.stack[i:]
                return

    def _close(self, el):
        tag, mode, line, parts = el
        if tag in ("script", "style") and mode is None:
            self.skip = max(0, self.skip - 1)
        if mode:
            text = " ".join(parts)
            if mode == "block" and len(visible(text)) > 1500:  # page-level wrapper, not a row
                return
            self.chunks.append((line, text, mode))

    def handle_data(self, data):
        if self.skip:
            return
        for el in self.stack:
            if el[1]:
                el[3].append(data)

    def finish(self):
        self.close()
        for el in reversed(self.stack):
            self._close(el)
        self.stack = []
        return self.chunks


class _TextRuns(HTMLParser):
    """(line, text) for every visible text run, skipping script/style."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.runs: list[tuple[int, str]] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)

    def handle_data(self, data):
        if not self.skip and data.strip():
            self.runs.append((self.getpos()[0], data))


def html_source(path: Path) -> str:
    text = path.read_text(encoding="utf-8", errors="replace")
    return _LIQUID.sub(blank, text)


# ---------------------------------------------------------------- the rules
def r1_chunk(report: Report, pending: list[Pub], rel: str, line: int, raw: str, mode: str,
             end_line: int = 0, item_level_warning: bool = False):
    vis = visible(raw)
    units = sentences(vis) if mode == "sentence" else [vis]
    hit = False
    for unit in units:
        words = claim_words(unit)
        if not words:
            continue
        for p in pending:
            ref = p.find_ref(unit)
            if ref:
                hit = True
                ln = refine_line(report, rel, line, end_line, words[0])
                report.add("ERROR", "R1", rel, ln,
                           f'{p.label} is "{p.status_phrase}" but the text says "{words[0]}" (matched by {ref[0]} "{clip(ref[1], 40)}")',
                           clip(unit))
    if item_level_warning and not hit:
        words = claim_words(vis)
        for p in pending:
            ref = p.find_ref(vis)
            if words and ref:
                report.add("WARNING", "R1", rel, line,
                           f'item mentions {p.label} ("{p.status_phrase}") and says "{words[0]}" in another sentence; read it',
                           clip(vis))


def check(src: Path, report: Report, all_data: bool) -> None:
    data: dict[str, object] = {}
    yaml_files = ["_config.yml"] + sorted(p.relative_to(src).as_posix() for p in (src / "_data").glob("*.y*ml"))
    for rel in yaml_files:
        path = src / rel
        if not path.is_file():
            continue
        try:
            node = yaml.compose(path.read_text(encoding="utf-8"), Loader=yaml.SafeLoader)
            data[rel] = _obj(node) if node is not None else None
        except yaml.YAMLError as e:
            mark = getattr(e, "problem_mark", None)
            report.add("ERROR", "Y1", rel, (mark.line + 1) if mark else 0,
                       f"YAML does not parse: {getattr(e, 'problem', None) or e}")

    # ---- R1: publications and every place that talks about them
    pubs_raw = data.get("_data/publications.yml")
    pubs = [Pub(e) for e in pubs_raw if isinstance(e, dict)] if isinstance(pubs_raw, list) else []
    build_refs(pubs)
    pending = [p for p in pubs if p.pending]
    for p in pubs:
        for keys, s in walk_strings(p.entry):
            if keys and (keys[0] in NON_PROSE_FIELDS):
                continue
            if p.pending:  # its own entry may not claim acceptance at all
                words = claim_words(visible(s))
                if words:
                    report.add("ERROR", "R1", "_data/publications.yml", refine_line(report, "_data/publications.yml", s.line, s.end_line, words[0]),
                               f'{p.label} is "{p.status_phrase}" but its own {keys[0]} says "{words[0]}"', clip(visible(s)))
            else:
                r1_chunk(report, [q for q in pending if q is not p], "_data/publications.yml", s.line, s, "sentence", s.end_line)

    news = data.get("_data/news.yml")
    if isinstance(news, list):
        for item in news:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            if isinstance(content, LStr):
                r1_chunk(report, pending, "_data/news.yml", content.line, content, "sentence", content.end_line,
                         item_level_warning=True)
                # R4: an acceptance/presentation claim with nothing to click
                vis = visible(content)
                for m in STATUS_WORD_RE.finditer(vis):
                    if not is_claim(vis, m):
                        continue
                    if not LINK_RE.search(str(content)):
                        report.add("WARNING", "R4", "_data/news.yml", content.line,
                                   f'news item says "{m.group(0)}" but links to nothing', clip(vis))
                    break

    # ---- R5: news and the announcement bar carry finished, public results only
    r5 = []
    if isinstance(news, list):
        r5 += [("_data/news.yml", it.get("content")) for it in news if isinstance(it, dict)]
    ann = data.get("_data/announcement.yml")
    if isinstance(ann, dict) and str(ann.get("enabled", "")).lower() == "true":
        r5 += [("_data/announcement.yml", ann.get(k)) for k in ("text", "link_text")]
    for rel, value in r5:
        if not isinstance(value, LStr):
            continue
        vis = visible(value)
        for regex, why in ((NEWS_PLAN_RE, "a plan or work in progress"), (NEWS_INTERNAL_RE, "internal detail")):
            m = regex.search(vis)
            if m:
                report.add("ERROR", "R5", rel, value.line,
                           f'"{m.group(0)}" is {why}; news lists finished, public results only', clip(vis))

    # ---- R6: placeholder text in a publication entry
    for p in pubs:
        for keys, s in walk_strings(p.entry):
            if keys and keys[0] in NON_PROSE_FIELDS:
                continue
            m = PLACEHOLDER_RE.search(visible(s))
            if m:
                report.add("ERROR", "R6", "_data/publications.yml", s.line,
                           f'{p.label}: placeholder text "{m.group(0)}" in {keys[0]}', clip(visible(s)))

    for rel, obj in data.items():
        if rel in ("_data/publications.yml", "_data/news.yml") or obj is None:
            continue
        for keys, s in walk_strings(obj):
            if rel == "_config.yml":
                if not keys or keys[0] not in CONFIG_TEXT_KEYS:
                    continue
            elif keys and keys[-1] in NON_PROSE_FIELDS:
                continue
            r1_chunk(report, pending, rel, s.line, s, "sentence", s.end_line)

    for rel in CONTENT_HTML:
        path = src / rel
        if not path.is_file():
            continue
        parser = _Blocks()
        parser.feed(html_source(path))
        for line, text, mode in parser.finish():
            r1_chunk(report, pending, rel, line, text, mode)

    # ---- R2: "PhD candidate" anywhere that gets published (or feeds a published page)
    if not CANDIDACY_CONFIRMED:
        excludes = []
        cfg = data.get("_config.yml")
        if isinstance(cfg, dict) and isinstance(cfg.get("exclude"), list):
            excludes = [str(x) for x in cfg["exclude"]]
        for rel, path in published_text_files(src, excludes):
            is_yaml = path.suffix.lower() in (".yml", ".yaml")
            for i, line in enumerate(report.lines(rel), 1):
                if is_yaml and line.lstrip().startswith("#"):
                    continue
                for m in CANDIDATE_RE.finditer(line):
                    report.add("ERROR", "R2", rel, i,
                               f'"{m.group(0)}": candidacy starts after the prelim exam; say "Ph.D. student" (or set CANDIDACY_CONFIRMED = True in scripts/check_claims.py once passed)',
                               clip(visible(line) or line))

    # ---- R3: award-type words for a human to confirm
    r3_yaml = list(CONTENT_YAML) + ([r for r in data if r.startswith("_data/") and r not in CONTENT_YAML] if all_data else [])
    for rel in r3_yaml:
        if not (src / rel).is_file():
            continue
        for i, line in enumerate(report.lines(rel), 1):
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            value = visible(re.sub(r"^-?\s*[\w.-]+\s*:\s*", "", s))
            for m in AWARD_RE.finditer(value):
                report.add("WARNING", "R3", rel, i, f'award-type word "{m.group(0)}": confirm it is real', clip(value))
                break
    for rel in CONTENT_HTML:
        path = src / rel
        if not path.is_file():
            continue
        runs = _TextRuns()
        runs.feed(_COMMENT.sub(blank, html_source(path)))
        runs.close()
        for line, text in runs.runs:
            vis = visible(text)
            if AWARD_HEADING_RE.fullmatch(vis):
                continue
            for m in AWARD_RE.finditer(text):
                ln = line + text[: m.start()].count("\n")
                report.add("WARNING", "R3", rel, ln, f'award-type word "{m.group(0)}": confirm it is real', clip(vis))
                break


def jekyll_excluded(rel: str, patterns: list[str]) -> bool:
    """Mirror Jekyll 3 EntryFilter#glob_include?: fnmatch on source-joined paths, or prefix match."""
    full = "/SRC/" + rel
    for pat in patterns:
        pfull = "/SRC/" + pat.lstrip("/")
        if fnmatch.fnmatchcase(full, pfull) or full.startswith(pfull):
            return True
    return False


def published_text_files(src: Path, excludes: list[str]):
    for path in sorted(src.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXT:
            continue
        rel = path.relative_to(src).as_posix()
        parts = rel.split("/")
        if parts[0] in SKIP_TOP or any(p.startswith(".") for p in parts):
            continue
        is_input = rel == "_config.yml" or parts[0] in ("_data", "_includes", "_layouts", "_sass")
        if not is_input:
            if any(p.startswith(("_", "#", "~")) for p in parts) or jekyll_excluded(rel, excludes):
                continue
        yield rel, path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--src", type=Path, default=REPO, help="site source checkout (default: this repo)")
    ap.add_argument("--only", help="report findings for this one file (path relative to --src, or absolute)")
    ap.add_argument("--strict", action="store_true", help="warnings fail too")
    ap.add_argument("--quiet", action="store_true", help="print errors only")
    ap.add_argument("--all-data", action="store_true", help="R3 also scans every other _data file")
    ap.add_argument("--github", action="store_true", help="also emit GitHub Actions annotations")
    args = ap.parse_args()
    src = args.src.resolve()

    report = Report(src)
    check(src, report, args.all_data)

    items = report.items
    if args.only:
        only = Path(args.only)
        only = only.resolve().relative_to(src).as_posix() if only.is_absolute() else only.as_posix().lstrip("./")
        items = [it for it in items if it[2] == only]
    errors = sorted((it for it in items if it[0] == "ERROR"), key=lambda it: (it[1], it[2], it[3]))
    warnings = sorted((it for it in items if it[0] == "WARNING"), key=lambda it: (it[1], it[2], it[3]))

    shown = errors if args.quiet else errors + warnings
    if shown or not args.quiet:
        print(f"check_claims: {len(errors)} error(s), {len(warnings)} warning(s) in {src}"
              f"{' [' + args.only + ']' if args.only else ''} (CANDIDACY_CONFIRMED={CANDIDACY_CONFIRMED})")
    for level, rule, rel, line, msg, snippet in shown:
        print(f"{level:<7} {rule} {rel}:{line}  {msg}")
        if snippet:
            print(f"          | {snippet}")
        if args.github:
            kind = "error" if level == "ERROR" else "warning"
            print(f"::{kind} file={rel},line={line},title=claims {rule}::{msg}")
    return 1 if errors or (args.strict and warnings) else 0


if __name__ == "__main__":
    sys.exit(main())
