#!/usr/bin/env node
/**
 * Builds the default 1200×630 social-sharing image.
 *
 * Composites the official transparent logo PNG centered on dark navy,
 * preserving proportions. Bump VERSION to bust messaging-app caches.
 */
import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const VERSION = 'v20260806'
const WIDTH = 1200
const HEIGHT = 630
const BG = { r: 10, g: 22, b: 40 } // #0a1628 navy-900

/** Max logo footprint inside the card (safe spacing around edges). */
const MAX_LOGO_WIDTH_RATIO = 0.62
const MAX_LOGO_HEIGHT_RATIO = 0.58

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const logoPath = join(root, 'public/images/brand/mikes-exterior-logo.png')
const outPath = join(root, `public/images/brand/mikes-exterior-og-share-${VERSION}.png`)

const logoMeta = await sharp(logoPath).metadata()
const maxLogoW = Math.round(WIDTH * MAX_LOGO_WIDTH_RATIO)
const maxLogoH = Math.round(HEIGHT * MAX_LOGO_HEIGHT_RATIO)
const scale = Math.min(maxLogoW / logoMeta.width, maxLogoH / logoMeta.height)
const logoW = Math.round(logoMeta.width * scale)
const logoH = Math.round(logoMeta.height * scale)

const logo = await sharp(logoPath)
  .resize(logoW, logoH, {
    fit: 'inside',
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
      input: logo,
      left: Math.round((WIDTH - logoW) / 2),
      top: Math.round((HEIGHT - logoH) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(outPath)

const meta = await sharp(outPath).metadata()
console.log(`Source: ${logoPath} (${logoMeta.width}×${logoMeta.height})`)
console.log(`Wrote ${outPath} (${meta.width}×${meta.height}); logo ${logoW}×${logoH}`)
