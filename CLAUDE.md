# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Kulbir Singh Ahluwalia's personal academic website and CS498GC Mobile Robotics course website, built with Jekyll and hosted on GitHub Pages at kulbir-singh-ahluwalia.com.

## Development Commands

```bash
bundle install                          # Install dependencies
bundle exec jekyll serve --trace        # Serve locally on port 4000 (live reload)
bundle exec jekyll build                # Build for production
```

**Note:** Changes to `_config.yml` require restarting the server — Jekyll does not hot-reload config.

## Architecture

### Single-Page Design

The main site is a **single `index.html`** file (layout: null) with no `_layouts/` directory. All sections (about, publications, teaching, experience, projects, research, misc) are inline within this one file, navigated via anchor links.

The only include template is `_includes/section.html`, which renders both publications and projects from their YAML data files using the same markup pattern.

### Data-Driven Content (`_data/`)

| File | Purpose |
|------|---------|
| `publications.yml` | Academic papers with authors, links, images, topics |
| `projects.yml` | Research projects (same rendering pattern as publications) |
| `authors.yml` | Collaborator database (`first_name`, `last_name`, `website`, `is_me` boolean) |
| `navigation.yml` | Site nav menu (name + anchor/link) |
| `misc.yaml` | Awards, certificates |
| `hobbies.yml` | Personal interests (markdown) |

### Publication/Project YAML Fields

Required: `id2`, `title`, `venue`, `description`, `authors`, `topics`

Optional fields: `image`, `image_mouseover` (video for hover effect), `image_border`, `awards`, `pdf`, `paper`, `arxiv` (just the ID, e.g. `"2412.10515"`), `github` (e.g. `"username/repo"`), `project_page`, `webpage`, `video`

**Title link priority** in `section.html`: `project_page` > `webpage` > `paper` > `arxiv` > no link

**Topics** (used for filtering): `mobile_robotics`, `computer_vision`, `deep_learning`, `machine_learning`, `nlp`, `path_planning`, `decision_making`, `3d_vision`

### Topic Filtering System (`js/index.js`)

Publications and projects use a `data-topics` HTML attribute (space-separated topic strings). JavaScript functions `filterPublications(mode)` and `filterProjects(mode)` support three modes: `'all'`, `'selected'` (first 3 pubs / first 5 projects), and `'topic'`. The `filterByTopic(topic)` function matches against the parsed `data-topics` attribute.

### Mouseover Effects

`.publication-mousecell` elements support image-to-video transitions on hover. jQuery-based: on mouseover, hides the static `img` and shows `video` + `.image2`. Touch events are also handled.

### Styling Stack

- **Framework:** Bulma CSS (`css/bulma.min.css`)
- **Custom SCSS:** `css/index.scss` imports `_sass/_base.scss`
- **Fonts:** Google Sans (titles, weight 700), Noto Sans (body)
- **Icons:** Font Awesome 6.5.2, Academicons
- Key classes: `.publication-block`, `.author-me`, `.portrait`, `.publication-mousecell`

### Deployment

Two GitHub Actions workflows in `.github/workflows/`:

1. **`cache_control.yml`** — Builds Jekyll (Ruby 3.1), adds cache control headers, deploys to gh-pages branch via `peaceiris/actions-gh-pages` with `force_orphan: true`
2. **`claude.yml`** — Claude Code assistant triggered by `@claude` mentions in issues/PRs/discussions

### Course Website

CS498GC course content lives under `cs498gc/fa25/` with its own HTML pages, CSS, and images — independent from the main site.

### Cursor Rules

Additional development guidance exists in `.cursor/rules/` (7 files covering Jekyll structure, YAML data, JS functionality, CSS styling, HTML templates, content guidelines, and dev workflow).
