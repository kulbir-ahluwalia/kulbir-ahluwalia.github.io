# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is Kulbir Singh Ahluwalia's personal academic website and CS498GC Mobile Robotics course website, built with Jekyll and hosted on GitHub Pages at kulbir-singh-ahluwalia.com.

## Development Commands

### Local Development
```bash
# Install dependencies
bundle install

# Serve locally with live reload (default port 4000)
bundle exec jekyll serve --trace

# Build site for production
bundle exec jekyll build
```

### Testing
```bash
# Run RSpec tests (if configured)
bundle exec rspec
```

## Architecture & Key Components

### Jekyll Data-Driven Architecture
The site uses a data-driven approach where content is stored in YAML files under `_data/` and rendered through Jekyll templates:

- **Publications**: `_data/publications.yml` - Academic papers with authors, links, and images
- **Projects**: `_data/projects.yml` - Research projects and descriptions  
- **Navigation**: `_data/navigation.yml` - Site navigation structure
- **Misc Content**: `_data/misc.yaml` - Awards, certificates, achievements
- **Authors**: `_data/authors.yml` - Collaborator information

### Styling Architecture
- **Bulma CSS Framework**: Primary styling framework (`css/bulma.min.css`)
- **Custom SCSS**: Site-specific styles in `css/index.scss` importing from `_sass/_base.scss`
- **Responsive Design**: Mobile-first approach with navbar burger menu handled in `js/index.js`

### Deployment Pipeline
GitHub Actions workflow (`.github/workflows/cache_control.yml`) handles automated deployment:
1. Builds Jekyll site on push to main branch
2. Adds cache control headers for proper browser caching
3. Deploys to gh-pages branch
4. Uses Ruby 3.1 with bundler caching for performance

### Course Website Structure
The CS498GC course content is organized under `cs498gc/fa25/` with:
- Separate syllabus, assignments, and logistics pages
- Independent CSS and image assets for course materials
- Gallery and setup instructions for course projects

## Content Guidelines

### Adding Publications
Update `_data/publications.yml` with proper structure including authors array, publication venue, links, and image paths. Images should be 1:1 aspect ratio, minimum 320px.

### Modifying Site Content
- Personal information: Update `_config.yml`
- Section content: Modify corresponding YAML files in `_data/`
- Styling changes: Edit `css/index.scss` or `_sass/_base.scss`
- JavaScript functionality: Update `js/index.js`

### Image Handling
- Publication images: Store in `images/[publication-name]/`
- General images: Place in `images/` root
- Course images: Use `cs498gc/fa25/images/`

## Important Implementation Details

### Publication Mouseover Effects
The site implements custom mouseover effects for publications that transition between static images and videos/GIFs. This is handled in `js/index.js` and requires proper image/video file naming conventions.

### External Link Handling
All external links automatically open in new tabs via JavaScript in `js/index.js`. This applies to links with href starting with "http" but not containing the site's domain.

### Responsive Navigation
The mobile navigation burger menu is implemented using Bulma's navbar component with custom JavaScript handling for toggle functionality.