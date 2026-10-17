# kulbir-singh-ahluwalia.com

Source for the personal academic website of Kulbir Singh Ahluwalia (Ph.D. student in Computer Science, UIUC), served at https://kulbir-singh-ahluwalia.com/.

It also hosts the archived course website for CS 498 GC Mobile Robotics, Fall 2025, under `cs498gc/fa25/`.

## Build locally

```bash
bundle install
bundle exec jekyll serve
```

GitHub Pages builds and serves the site directly from the `main` branch (legacy Jekyll build with the `github-pages` gem). The `.github/workflows/cache_control.yml` workflow also builds the site and pushes it to the `gh-pages` branch, but that branch is not the Pages source.
