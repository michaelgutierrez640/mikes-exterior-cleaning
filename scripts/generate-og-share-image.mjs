#!/usr/bin/env node
/**
 * Builds the default 1200×630 social-sharing image (logo on dark branded navy).
 * Bump VERSION when messaging apps need a fresh cache-busting filename.
 */
import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const VERSION = 'v20260802'
const WIDTH = 1200
const HEIGHT = 630

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const logoPath = join(root, 'public/images/brand/mikes-exterior-logo.png')
const outPath = join(root, `public/images/brand/mikes-exterior-og-share-${VERSION}.png`)

const bg = await sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 3,
    background: { r: 10, g: 22, b: 40 }, // #0a1628 navy-900
  },
})
  .png()
  .toBuffer()

const logoMeta = await sharp(logoPath).metadata()
const maxLogoW = Math.round(WIDTH * 0.62)
const maxLogoH = Math.round(HEIGHT * 0.58)
const scale = Math.min(maxLogoW / logoMeta.width, maxLogoH / logoMeta.height)
const logoW = Math.round(logoMeta.width * scale)
const logoH = Math.round(logoMeta.height * scale)

const logo = await sharp(logoPath)
  .resize(logoW, logoH, { fit: 'inside' })
  .png()
  .toBuffer()

await sharp(bg)
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
console.log(`Wrote ${outPath} (${meta.width}×${meta.height} ${meta.format})`)
