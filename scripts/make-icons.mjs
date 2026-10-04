// יוצר את אייקוני האפליקציה: דוח ירוק עם גרף עמודות עולה. ללא תלויות חיצוניות.
// הרצה: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

// ---------- עיצוב (מערכת קואורדינטות 512x512) ----------
const BG = { from: [16, 185, 129], to: [15, 118, 110] } // ירוק -> ירוק-טורקיז כהה
const DOC = { x: 136, y: 96, w: 240, h: 320, r: 36 }
const shapes = [
  // צל רך מתחת למסמך
  { x: DOC.x, y: DOC.y + 14, w: DOC.w, h: DOC.h, r: DOC.r, color: [4, 60, 50], alpha: 0.35, soft: 22 },
  // המסמך
  { ...DOC, color: [255, 255, 255], alpha: 1 },
  // כותרת ושורת טקסט
  { x: 168, y: 134, w: 112, h: 16, r: 8, color: [110, 231, 183], alpha: 1 },
  { x: 168, y: 164, w: 72, h: 12, r: 6, color: [209, 250, 229], alpha: 1 },
  // עמודות עולות (פינות עליונות מעוגלות)
  { x: 168, y: 302, w: 40, h: 70, r: [10, 10, 0, 0], color: [110, 231, 183], alpha: 1 },
  { x: 228, y: 262, w: 40, h: 110, r: [10, 10, 0, 0], color: [52, 211, 153], alpha: 1 },
  { x: 288, y: 212, w: 40, h: 160, r: [10, 10, 0, 0], color: [5, 150, 105], alpha: 1 },
  // קו בסיס
  { x: 160, y: 372, w: 192, h: 6, r: 3, color: [209, 250, 229], alpha: 1 },
]

// ---------- רסטר: מרחק מסומן למלבן מעוגל + כיסוי עם החלקה ----------
function sdRoundBox(px, py, s) {
  const cx = s.x + s.w / 2
  const cy = s.y + s.h / 2
  const hx = s.w / 2
  const hy = s.h / 2
  const [tl, tr, br, bl] = Array.isArray(s.r) ? [s.r[0], s.r[1], s.r[2], s.r[3]] : [s.r, s.r, s.r, s.r]
  // רדיוס לפי הרביע שבו הנקודה נמצאת
  const dx = px - cx
  const dy = py - cy
  const r = dx > 0 ? (dy > 0 ? br : tr) : dy > 0 ? bl : tl
  const qx = Math.abs(dx) - hx + r
  const qy = Math.abs(dy) - hy + r
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r
}

// ---------- קידוד PNG ----------
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}

function png(size) {
  const k = size / 512
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / k
      const py = (y + 0.5) / k
      // רקע: גרדיאנט אלכסוני
      const t = (px + py) / 1024
      let col = BG.from.map((v, i) => v + (BG.to[i] - v) * t)
      for (const s of shapes) {
        const d = sdRoundBox(px, py, s)
        const cover = s.soft
          ? Math.max(0, Math.min(1, 0.5 - d / s.soft))
          : Math.max(0, Math.min(1, 0.5 - d * k))
        const a = cover * s.alpha
        if (a > 0) col = col.map((v, i) => v + (s.color[i] - v) * a)
      }
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = Math.round(col[0])
      raw[o + 1] = Math.round(col[1])
      raw[o + 2] = Math.round(col[2])
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // עומק 8 ביט
  ihdr[9] = 2 // RGB (בלי שקיפות, כנדרש ל-apple-touch-icon)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- favicon (SVG באותו עיצוב) ----------
function svg() {
  const rect = (s) => {
    const r = Array.isArray(s.r) ? s.r : [s.r, s.r, s.r, s.r]
    const [tl, tr, br, bl] = r
    const { x, y, w, h } = s
    const path = `M${x + tl} ${y}H${x + w - tr}Q${x + w} ${y} ${x + w} ${y + tr}V${y + h - br}Q${x + w} ${y + h} ${x + w - br} ${y + h}H${x + bl}Q${x} ${y + h} ${x} ${y + h - bl}V${y + tl}Q${x} ${y} ${x + tl} ${y}Z`
    return `<path d="${path}" fill="rgb(${s.color.join(',')})"${s.alpha < 1 ? ` opacity="${s.alpha}"` : ''}${s.soft ? ' filter="url(#blur)"' : ''}/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgb(${BG.from.join(',')})"/><stop offset="1" stop-color="rgb(${BG.to.join(',')})"/></linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="11"/></filter>
</defs>
<rect width="512" height="512" rx="112" fill="url(#bg)"/>
${shapes.map(rect).join('\n')}
</svg>
`
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', png(192))
writeFileSync('public/icon-512.png', png(512))
writeFileSync('public/apple-touch-icon.png', png(180))
writeFileSync('public/favicon.svg', svg())
console.log('icons created')
