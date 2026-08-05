import { readdirSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])
const moduleDir = dirname(fileURLToPath(import.meta.url))

export default async () => {
  const dir = join(moduleDir, '../../assets/images/louseiro')

  let entries = []
  try {
    entries = readdirSync(dir)
  } catch (err) {
    entries = []
  }

  const images = entries
    .filter((name) => IMAGE_EXTENSIONS.has(extname(name).toLowerCase()))
    .sort()
    .map((name) => `/assets/images/louseiro/${encodeURIComponent(name)}`)

  return Response.json(images)
}
