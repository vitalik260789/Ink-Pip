# Ink & Pip

Production pipeline for the YouTube channel **Ink & Pip** (@inkandpip) — "What if…?" science cartoons.

- `releases/` — finished videos and Shorts are attached to GitHub Releases (public download links used for scheduled publishing).

## Rendering on GitHub Actions
- `studio/` — Razgon 2D Studio + the Ink & Pip 3D "ink world" engine (`engine/world3d.js`), projects in `studio/projects/<slug>`.
- Actions → **Render video** → Run workflow: renders the project on up to 20 machines in parallel (4-second chunks),
  mixes the sound, joins everything and publishes a Release with the MP4.
