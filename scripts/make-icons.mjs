import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const source = 'src/assets/icon.svg'
const targets = [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/apple-touch-icon.png', 180],
]

await mkdir('public', { recursive: true })
for (const [out, size] of targets) {
  await sharp(source).resize(size, size).png().toFile(out)
  console.log(`wrote ${out}`)
}
