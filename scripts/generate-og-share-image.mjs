#!/usr/bin/env node
/**
 * Builds the default 1200×630 social-sharing image (logo on dark branded navy).
 *
 * Source: official transparent PNG (no SVG in repo).
 * 1) Strip white/gray matte fringe from the logo at native resolution
 * 2) Flatten cleaned logo onto navy (so later upscale AA is blue↔navy, not blue↔white)
 * 3) Lanczos-upscale and center on a fresh 1200×630 canvas
 *
 * Never uses a prior OG composite as the source.
 * Bump VERSION when messaging apps need a fresh cache-busting filename.
 */
import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const VERSION = 'v20260803'
const WIDTH = 1200
const HEIGHT = 630
const BG = { r: 10, g: 22, b: 40 } // #0a1628 navy-900
const BLUE_INK = { r: 3, g: 56, b: 164 }

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const logoPath = join(root, 'public/images/brand/mikes-exterior-logo.png')
const outPath = join(root, `public/images/brand/mikes-exterior-og-share-${VERSION}.png`)

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function chroma(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b)
}

function isWhiteInk(r, g, b) {
  return Math.min(r, g, b) > 175 || (luma(r, g, b) > 205 && chroma(r, g, b) < 55)
}

function isBlueFamily(r, g, b) {
  return b > 110 && b >= g - 5 && b > r + 15 && g > r - 10
}

/**
 * Remove contaminated edge pixels; keep solid blue/white brand ink.
 * White letterforms only in the EXTERIOR vertical band (avoids white halo on “Mike’s”).
 */
function cleanLogoRgba(data, width, height) {
  const out = Buffer.alloc(data.length)
  const exteriorTop = Math.floor(height * 0.36)
  const exteriorBottom = Math.floor(height * 0.74)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a === 0) continue

      const inExteriorBand = y >= exteriorTop && y <= exteriorBottom

      if (isWhiteInk(r, g, b)) {
        if (!inExteriorBand) continue
        // Keep stronger white ink; drop faint white dust.
        if (a < 70) continue
        out[i] = 255
        out[i + 1] = 255
        out[i + 2] = 255
        // Preserve some soft AA for EXTERIOR via alpha; will flatten onto navy next.
        out[i + 3] = a < 180 ? Math.max(a, 120) : 255
        continue
      }

      if (isBlueFamily(r, g, b)) {
        const wash = Math.min(1, Math.max(0, (r - 4) / 200))
        // Drop white-contaminated blue fringe.
        if (wash > 0.16) continue
        if (a < 120) continue
        if (wash < 0.06) {
          out[i] = r
          out[i + 1] = g
          out[i + 2] = b
          out[i + 3] = 255
        } else {
          // Mildly washed but still blue ink → restore brand blue, keep full coverage.
          out[i] = BLUE_INK.r
          out[i + 1] = BLUE_INK.g
          out[i + 2] = BLUE_INK.b
          out[i + 3] = 255
        }
      }
    }
  }

  return out
}

const logoMeta = await sharp(logoPath).metadata()
const { data: rawLogo, info } = await sharp(logoPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const cleaned = cleanLogoRgba(rawLogo, info.width, info.height)

const pad = 8
const nativeW = info.width + pad * 2
const nativeH = info.height + pad * 2

const cleanedPng = await sharp(cleaned, {
  raw: { width: info.width, height: info.height, channels: 4 },
}).png().toBuffer()

// Flatten onto navy at native resolution so upscale AA is against dark navy, not light matte.
const flattenedNative = await sharp({
  create: {
    width: nativeW,
    height: nativeH,
    channels: 3,
    background: BG,
  },
})
  .composite([{ input: cleanedPng, left: pad, top: pad }])
  .png()
  .toBuffer()

const maxLogoW = Math.round(WIDTH * 0.62)
const maxLogoH = Math.round(HEIGHT * 0.58)
const scale = Math.min(maxLogoW / nativeW, maxLogoH / nativeH)
const logoW = Math.round(nativeW * scale)
const logoH = Math.round(nativeH * scale)

const scaledLogo = await sharp(flattenedNative)
  .resize(logoW, logoH, {
    fit: 'fill',
    kernel: sharp.kernel.lanczos3,
  })
  .png()
  .toBuffer()

await sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 3,
    background: BG,
  },
})
  .composite([
    {
      input: scaledLogo,
      left: Math.round((WIDTH - logoW) / 2),
      top: Math.round((HEIGHT - logoH) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(outPath)

const meta = await sharp(outPath).metadata()
console.log(`Source logo: ${logoPath} (${logoMeta.width}×${logoMeta.height}; no SVG available)`)
console.log(`Wrote ${outPath} (${meta.width}×${meta.height} ${meta.format})`)
