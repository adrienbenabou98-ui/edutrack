import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

mkdirSync(join(root, 'build'), { recursive: true })

const svg = readFileSync(join(root, 'public', 'app-icon.svg'))

const sizes = [16, 32, 48, 64, 128, 256, 512]
const paths = {}

for (const size of sizes) {
  const out = join(root, 'build', `icon-${size}.png`)
  await sharp(svg).resize(size, size).png().toFile(out)
  paths[size] = out
  console.log(`  generated ${size}x${size}`)
}

// PWA icons for web/iPad
await sharp(svg).resize(512, 512).png().toFile(join(root, 'public', 'icon-512.png'))
await sharp(svg).resize(192, 192).png().toFile(join(root, 'public', 'icon-192.png'))

// Linux/Mac icon
writeFileSync(join(root, 'build', 'icon.png'), readFileSync(paths[512]))

// Windows ICO (multiple sizes baked in)
const icoBuf = await pngToIco([paths[16], paths[32], paths[48], paths[64], paths[128], paths[256]])
writeFileSync(join(root, 'build', 'icon.ico'), icoBuf)

console.log('Icons generated: build/icon.ico  build/icon.png  public/icon-512.png  public/icon-192.png')
