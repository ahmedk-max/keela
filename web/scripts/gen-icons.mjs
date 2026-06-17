/* Rasterise public/icon.svg into the PWA / favicon PNGs.
   Requires sharp (dev-only):  npm i -D sharp && node scripts/gen-icons.mjs
   The generated PNGs are committed, so the app builds without sharp installed. */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pub = (name) => fileURLToPath(new URL('../public/' + name, import.meta.url))
const svg = readFileSync(pub('icon.svg'))

const sizes = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
]

for (const [name, size] of sizes) {
  // Oversample then downscale for crisp anti-aliased edges.
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(pub(name))
  console.log('wrote', name, `${size}×${size}`)
}
