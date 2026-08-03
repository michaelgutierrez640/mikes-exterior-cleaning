#!/usr/bin/env node
/**
 * Builds square favicon / app icons from ONE source file:
 *   scripts/favicon-source/official-logo-favicon-source.jpg
 *
 * That file is the exact user-attached logo export (JPEG on black).
 * Black is keyed to transparency, then the complete logo is centered on
 * brand navy. Does not read or modify the website header logo PNG.
 */
import sharp from 'sharp'
import { createHash } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const sourcePath = join(root, 'scripts/favicon-source/official-logo-favicon-source.jpg')
const outDir = join(root, 'public')

const NAVY = { r: 10, g: 22, b: 40, alpha: 1 }

/** Write a multi-size ICO containing PNG payloads (Vista+). */
function writePngIco(entries, outPath) {
  const count = entries.length
  const headerSize = 6
  const dirEntrySize = 16
  let offset = headerSize + dirEntrySize * count
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
    const meta = png.readUInt32BE(16)
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

function alphaOf(r, g, b) {
  const mx = Math.max(r, g, b)
  const isBlue = b >= r + 15 && b >= g + 10 && b >= 25
  const isNeutral = Math.abs(r - g) <= 18 && Math.abs(g - b) <= 18 && Math.abs(r - b) <= 18
  if (isBlue) return 255
  if (mx <= 6) return 0
  if (isNeutral) {
    if (mx <= 10) return 0
    return Math.min(255, Math.round((mx / 255) * 255))
  }
  if (mx <= 8) return 0
  return 255
}

/** Load attached source only — key black field to alpha, trim, keep full logo. */
async function loadCompleteLogoFromAttachedSource() {
  const raw = readFileSync(sourcePath)
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16)
  const { data, info } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const ch = info.channels
  const out = Buffer.alloc(w * h * 4)

  for (let i = 0, p = 0; i < data.length; i += ch, p += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = alphaOf(r, g, b)
    if (a === 0) {
      out[p] = 0
      out[p + 1] = 0
      out[p + 2] = 0
      out[p + 3] = 0
    } else {
      out[p] = r
      out[p + 1] = g
      out[p + 2] = b
      out[p + 3] = a
    }
  }

  const trimmed = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 5 })
    .png()
    .toBuffer({ resolveWithObject: true })

  console.log(
    `Source: ${sourcePath} (sha256:${hash} ${info.width}×${info.height}) → logo ${trimmed.info.width}×${trimmed.info.height}`,
  )
  return trimmed.data
}

async function squareIcon(logoBuf, size, padRatio) {
  const pad = Math.max(1, Math.round(size * padRatio))
  const max = size - pad * 2
  const logo = await sharp(logoBuf)
    .resize({
      width: max,
      height: max,
      fit: 'inside',
      kernel: sharp.kernel.lanczos3,
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

const completeLogo = await loadCompleteLogoFromAttachedSource()

// Keep the complete logo (Mike's + EXTERIOR + CLEANING SERVICES) at every size.
const outputs = [
  { file: 'favicon-16x16.png', size: 16, pad: 0.06 },
  { file: 'favicon-32x32.png', size: 32, pad: 0.07 },
  { file: 'favicon-48x48.png', size: 48, pad: 0.08 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0.10 },
  { file: 'android-chrome-192x192.png', size: 192, pad: 0.10 },
  { file: 'android-chrome-512x512.png', size: 512, pad: 0.10 },
]

const pngBySize = {}
for (const spec of outputs) {
  const buf = await squareIcon(completeLogo, spec.size, spec.pad)
  writeFileSync(join(outDir, spec.file), buf)
  pngBySize[spec.size] = buf
  console.log(`Wrote ${spec.file} (${spec.size}×${spec.size})`)
}

writePngIco([pngBySize[16], pngBySize[32], pngBySize[48]], join(outDir, 'favicon.ico'))
console.log('Wrote favicon.ico')

const svgPng = await squareIcon(completeLogo, 64, 0.08)
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Mike's Exterior Cleaning Services">
  <image href="data:image/png;base64,${svgPng.toString('base64')}" width="64" height="64" />
</svg>
`
writeFileSync(join(outDir, 'favicon.svg'), svg)
console.log('Wrote favicon.svg')

writeFileSync(join(outDir, 'images/brand/mikes-exterior-icon-512.png'), pngBySize[512])
console.log('Wrote images/brand/mikes-exterior-icon-512.png')
