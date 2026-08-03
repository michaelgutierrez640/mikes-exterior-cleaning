#!/usr/bin/env node
/**
 * Builds square favicon / app icons from the official transparent logo PNG.
 * Small sizes use a tighter crop (Mike’s + EXTERIOR) for recognition;
 * larger sizes use the full logo centered on brand navy.
 */
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const logoPath = join(root, 'public/images/brand/mikes-exterior-logo.png')
const outDir = join(root, 'public')

const NAVY = { r: 10, g: 22, b: 40, alpha: 1 }

/** Write a multi-size ICO containing PNG payloads (Vista+). */
function writePngIco(entries, outPath) {
  const count = entries.length
  const headerSize = 6
  const dirEntrySize = 16
  const dirSize = headerSize + dirEntrySize * count
  let offset = dirSize
  const offsets = []
  for (const png of entries) {
    offsets.push(offset)
    offset += png.length
  }
  const buf = Buffer.alloc(offset)
  buf.writeUInt16LE(0, 0)
  buf.writeUInt16LE(1, 2)
  buf.writeUInt16LE(count, 4)
  let dirAt = headerSize
  for (let i = 0; i < count; i++) {
    const png = entries[i]
    const meta = sharpMetaSize(png)
    const w = meta === 256 ? 0 : meta
    buf.writeUInt8(w, dirAt)
    buf.writeUInt8(w, dirAt + 1)
    buf.writeUInt8(0, dirAt + 2)
    buf.writeUInt8(0, dirAt + 3)
    buf.writeUInt16LE(1, dirAt + 4)
    buf.writeUInt16LE(32, dirAt + 6)
    buf.writeUInt32LE(png.length, dirAt + 8)
    buf.writeUInt32LE(offsets[i], dirAt + 12)
    png.copy(buf, offsets[i])
    dirAt += dirEntrySize
  }
  writeFileSync(outPath, buf)
}

function sharpMetaSize(pngBuf) {
  // IHDR width at bytes 16-19 of PNG
  return pngBuf.readUInt32BE(16)
}

async function trimmedLogo() {
  return sharp(logoPath).trim({ threshold: 20 }).png().toBuffer()
}

/** Full wordmark for larger icons. */
async function fullLogoBuf() {
  return trimmedLogo()
}

/** Tighter crop: Mike’s script + EXTERIOR (drop fine “CLEANING SERVICES” line). */
async function compactLogoBuf() {
  const trimmed = await sharp(await trimmedLogo()).png().toBuffer({ resolveWithObject: true })
  const h = Math.round(trimmed.info.height * 0.78)
  return sharp(trimmed.data)
    .extract({ left: 0, top: 0, width: trimmed.info.width, height: h })
    .png()
    .toBuffer()
}

async function squareIcon(logoBuf, size, padRatio) {
  const pad = Math.max(1, Math.round(size * padRatio))
  const max = size - pad * 2
  const logo = await sharp(logoBuf)
    .resize({
      width: max,
      height: max,
      fit: 'inside',
      kernel: size <= 48 ? sharp.kernel.lanczos3 : sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer({ resolveWithObject: true })

  const left = Math.round((size - logo.info.width) / 2)
  const top = Math.round((size - logo.info.height) / 2)

  return sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .composite([{ input: logo.data, left, top }])
    .png()
    .toBuffer()
}

mkdirSync(outDir, { recursive: true })

const full = await fullLogoBuf()
const compact = await compactLogoBuf()

const outputs = [
  { file: 'favicon-16x16.png', size: 16, logo: compact, pad: 0.08 },
  { file: 'favicon-32x32.png', size: 32, logo: compact, pad: 0.08 },
  { file: 'favicon-48x48.png', size: 48, logo: compact, pad: 0.09 },
  { file: 'apple-touch-icon.png', size: 180, logo: full, pad: 0.11 },
  { file: 'android-chrome-192x192.png', size: 192, logo: full, pad: 0.11 },
  { file: 'android-chrome-512x512.png', size: 512, logo: full, pad: 0.11 },
]

const pngBySize = {}
for (const spec of outputs) {
  const buf = await squareIcon(spec.logo, spec.size, spec.pad)
  const path = join(outDir, spec.file)
  writeFileSync(path, buf)
  pngBySize[spec.size] = buf
  console.log(`Wrote ${spec.file} (${spec.size}×${spec.size})`)
}

// favicon.ico: 16 + 32 + 48
writePngIco(
  [pngBySize[16], pngBySize[32], pngBySize[48]],
  join(outDir, 'favicon.ico'),
)
console.log('Wrote favicon.ico')

// SVG favicon: navy square + embedded 64px logo mark (no house icon)
const svgPng = await squareIcon(compact, 64, 0.08)
const b64 = svgPng.toString('base64')
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Mike's Exterior Cleaning Services">
  <image href="data:image/png;base64,${b64}" width="64" height="64" />
</svg>
`
writeFileSync(join(outDir, 'favicon.svg'), svg)
console.log('Wrote favicon.svg')

// Master square for reference / future regenerations
writeFileSync(join(outDir, 'images/brand/mikes-exterior-icon-512.png'), pngBySize[512])
console.log('Wrote images/brand/mikes-exterior-icon-512.png')
