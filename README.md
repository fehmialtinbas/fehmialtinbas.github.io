# fehmialtinbas.github.io

My personal site: **https://fehmialtinbas.github.io**

Scroll down and follow a hot slab through a stylised hot strip mill: reheating furnace → roughing mill →
finishing stands → control pulpit → laminar cooling → down coiler. Every station is a part of my career.
English by default, Turkish with the TR button.

## Stack

- [Three.js](https://threejs.org/) for the scene (custom shaders for the hot steel, bloom post-processing)
- TypeScript + [Vite](https://vitejs.dev/), no framework
- GitHub Pages, deployed by GitHub Actions on every push to `main`

The text loads first (about 9 KB gzipped); the 3D scene is loaded after it (about 130 KB gzipped).
Phones get a lighter scene, "reduce motion" turns the animation off, and browsers without WebGL 2 get the
text on a plain background.

## Run locally

```bash
npm install
npm run dev
```

- All copy (EN + TR) is in `src/content.ts`.
- The mill and the camera path are in `src/scene.ts`.
- `/?static` turns animation off, `/?station=3` pins the camera to one station (handy for screenshots),
  `/#pulpit` opens at a station.
