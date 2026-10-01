import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import process from 'node:process'

const root = new URL('../', import.meta.url)
const scanRoots = ['src', 'public']
const extensions = new Set(['.css', '.tsx', '.ts', '.js', '.svg', '.html'])
const violations = []

for (const scanRoot of scanRoots) {
  await walk(new URL(`${scanRoot}/`, root))
}
await inspect(new URL('index.html', root))

if (violations.length) {
  console.error('[NUMEN] Aurora X hue policy failed')
  for (const violation of violations) console.error(` - ${violation}`)
  process.exit(1)
}

console.log('[NUMEN] Aurora X hue policy OK')

async function walk(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true })
  for (const entry of entries) {
    const target = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directoryUrl)
    if (entry.isDirectory()) {
      await walk(target)
    } else if (extensions.has(extname(entry.name))) {
      await inspect(target)
    }
  }
}

async function inspect(fileUrl) {
  const source = await readFile(fileUrl, 'utf8')
  const path = relative(new URL('.', root).pathname, fileUrl.pathname)

  for (const match of source.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const rgb = parseHex(match[0])
    if (rgb) checkColor(path, match[0], rgb)
  }

  for (const match of source.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi)) {
    checkColor(path, match[0], [Number(match[1]), Number(match[2]), Number(match[3])])
  }

  for (const match of source.matchAll(/hsla?\(\s*(-?\d+(?:\.\d+)?)\s*(?:deg)?\s*[, ]\s*(\d+(?:\.\d+)?)%\s*[, ]\s*(\d+(?:\.\d+)?)%/gi)) {
    const hue = normalizeHue(Number(match[1]))
    const saturation = Number(match[2])
    const lightness = Number(match[3])
    checkWarmRange(path, match[0], hue, saturation, lightness)
  }
}

function checkColor(path, literal, [r, g, b]) {
  if ([r, g, b].some(value => !Number.isFinite(value) || value < 0 || value > 255)) return
  const { hue, saturation, lightness } = rgbToHsl(r, g, b)
  checkWarmRange(path, literal, hue, saturation, lightness)
}

function checkWarmRange(path, literal, hue, saturation, lightness) {
  const warmHue = hue >= 15 && hue <= 50
  const visiblyWarm = saturation >= 8 && lightness >= 8 && lightness <= 97
  if (warmHue && visiblyWarm) {
    violations.push(`${path}: ${literal} resolves to prohibited warm hue ${hue.toFixed(1)}° / ${saturation.toFixed(1)}% saturation`)
  }
}

function parseHex(value) {
  const raw = value.slice(1)
  if (raw.length === 3 || raw.length === 4) {
    return [
      parseInt(raw[0] + raw[0], 16),
      parseInt(raw[1] + raw[1], 16),
      parseInt(raw[2] + raw[2], 16)
    ]
  }
  if (raw.length === 6 || raw.length === 8) {
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16)
    ]
  }
  return undefined
}

function rgbToHsl(r, g, b) {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  const lightness = (max + min) / 2

  let hue = 0
  let saturation = 0

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1))
    if (max === red) hue = 60 * (((green - blue) / delta) % 6)
    else if (max === green) hue = 60 * (((blue - red) / delta) + 2)
    else hue = 60 * (((red - green) / delta) + 4)
  }

  return {
    hue: normalizeHue(hue),
    saturation: saturation * 100,
    lightness: lightness * 100
  }
}

function normalizeHue(value) {
  return ((value % 360) + 360) % 360
}
