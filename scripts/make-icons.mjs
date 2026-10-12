// Draws the app icon and saves it as PNG files in public.
// Run with "npm run icons".
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BLUE = [49, 130, 246]
const WHITE = [255, 255, 255]

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const head = Buffer.alloc(4)
  head.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const tail = Buffer.alloc(4)
  tail.writeUInt32BE(crc32(body))
  return Buffer.concat([head, body, tail])
}

// 1 inside the circle, 0 outside, soft on the edge.
function circle(x, y, cx, cy, r) {
  const d = Math.hypot(x - cx, y - cy)
  return Math.min(1, Math.max(0, r - d + 0.5))
}

function makePng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const mid = size / 2
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    for (let x = 0; x < size; x++) {
      // A white ring on blue. It looks like a coin.
      const ring = circle(x, y, mid, mid, size * 0.27) - circle(x, y, mid, mid, size * 0.15)
      const i = row + 1 + x * 4
      for (let c = 0; c < 3; c++) raw[i + c] = Math.round(BLUE[c] + (WHITE[c] - BLUE[c]) * ring)
      raw[i + 3] = 255
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public', { recursive: true })
writeFileSync('public/pwa-192.png', makePng(192))
writeFileSync('public/pwa-512.png', makePng(512))
writeFileSync('public/apple-touch-icon.png', makePng(180))
console.log('Icons saved in public')
