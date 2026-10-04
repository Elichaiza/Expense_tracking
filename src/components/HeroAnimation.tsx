import { useEffect, useState } from 'react'

// אנימציית "וידאו" בלולאה: משפחה מוסיפה הוצאות והגרף מתמלא.
// הכול CSS + SVG, בלי קובץ וידאו, ולכן קל וחד בכל מסך.

const CYCLE = 9 // שניות
const TOTAL = 4820
const R = 36
const C = 2 * Math.PI * R

const SEGMENTS = [
  { color: '#34d399', label: 'סופר', icon: '🛒', amount: 1832, from: 95 },
  { color: '#60a5fa', label: 'דלק', icon: '⛽', amount: 1301, from: 150 },
  { color: '#fbbf24', label: 'אוכל', icon: '🍽️', amount: 1012, from: 215 },
  { color: '#f472b6', label: 'חשבונות', icon: '💡', amount: 675, from: 270 },
]
const LAND = [12, 28, 44, 60] // באיזה אחוז מהמחזור כל הוצאה נוחתת בגרף
const CX = 95
const CY = 107

const fmt = (n: number) => '₪' + Math.round(n).toLocaleString('en-US')

const keyframes = SEGMENTS.map((s, i) => {
  const l = LAND[i]
  const start = Math.max(0, l - 12)
  const len = (s.amount / TOTAL) * C
  const bar = s.amount / SEGMENTS[0].amount
  return `
@keyframes seg${i}{0%,${l}%{stroke-dasharray:0 ${C}}${l + 10}%,90%{stroke-dasharray:${len} ${C}}96%,100%{stroke-dasharray:0 ${C}}}
@keyframes bar${i}{0%,${l}%{transform:scaleX(0)}${l + 10}%,90%{transform:scaleX(${bar})}96%,100%{transform:scaleX(0)}}
@keyframes chip${i}{0%,${start}%{opacity:0;transform:translate(${s.from}px,228px) scale(.6)}${start + 4}%{opacity:1;transform:translate(${s.from}px,202px) scale(1)}${l - 1}%{opacity:1;transform:translate(${CX}px,${CY + 8}px) scale(.55)}${l + 1}%{opacity:0;transform:translate(${CX}px,${CY}px) scale(.2)}100%{opacity:0;transform:translate(${CX}px,${CY}px) scale(.2)}}`
}).join('')

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)

function Counter() {
  const [value, setValue] = useState(TOTAL)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t0 = performance.now()
    let raf = 0
    let last = -1
    const tick = (now: number) => {
      const f = (((now - t0) / 1000) % CYCLE) / CYCLE
      let v = 0
      if (f < 0.96) {
        SEGMENTS.forEach((s, i) => {
          v += s.amount * ease((f * 100 - LAND[i]) / 10)
        })
        // יורד יחד עם הגרף ברגע האיפוס (90%-96% מהמחזור)
        if (f > 0.9) v *= 1 - (f - 0.9) / 0.06
      }
      const r = Math.round(v / 5) * 5
      if (r !== last) {
        last = r
        setValue(r)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <text x={CX} y={CY + 4} textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="800">
      {fmt(value)}
    </text>
  )
}

type PersonProps = {
  x: number
  kid?: boolean
  shirt: string
  hair: string
  skin: string
  long?: boolean
  wave?: boolean
  delay: number
}

function Person({ x, kid, shirt, hair, skin, long, wave, delay }: PersonProps) {
  const legs = kid ? 18 : 32
  const body = kid ? 26 : 44
  const bw = kid ? 20 : 28
  const r = kid ? 8 : 11
  const top = -(legs + body)
  const hy = top - r - 1
  return (
    <g transform={`translate(${x} 270)`}>
      <ellipse cx="0" cy="2" rx={kid ? 15 : 22} ry="4" fill="#000" opacity=".25" />
      <g className="hero-bob" style={{ animationDelay: `${delay}s` }}>
        <rect x={-bw / 2 + 3} y={-legs} width={bw / 2 - 4} height={legs} rx="3" fill="#334155" />
        <rect x={1} y={-legs} width={bw / 2 - 4} height={legs} rx="3" fill="#334155" />
        {long && <ellipse cx="0" cy={hy + r * 0.9} rx={r + 2} ry={r + 5} fill={hair} />}
        <rect x={-bw / 2} y={top} width={bw} height={body} rx={kid ? 7 : 10} fill={shirt} />
        <rect x={-bw / 2 - 5} y={top + 4} width="6" height={body * 0.7} rx="3" fill={shirt} />
        <rect
          className={wave ? 'hero-wave' : undefined}
          x={bw / 2 - 1}
          y={top + 4}
          width="6"
          height={body * 0.7}
          rx="3"
          fill={shirt}
        />
        <circle cx="0" cy={hy} r={r} fill={skin} />
        <path d={`M ${-r} ${hy} A ${r} ${r} 0 0 1 ${r} ${hy} Z`} fill={hair} />
        <circle cx={-r * 0.38} cy={hy + 1.5} r="1.2" fill="#0f172a" />
        <circle cx={r * 0.38} cy={hy + 1.5} r="1.2" fill="#0f172a" />
        <path
          d={`M ${-r * 0.35} ${hy + r * 0.5} q ${r * 0.35} ${r * 0.3} ${r * 0.7} 0`}
          stroke="#0f172a"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </g>
  )
}

export default function HeroAnimation() {
  return (
    <svg
      viewBox="0 0 360 290"
      className="hero-svg w-full max-h-[34vh]"
      style={{ direction: 'ltr' }}
      role="img"
      aria-label="משפחה מוסיפה הוצאות ורואה אותן מתחלקות לקטגוריות"
    >
      <style>{keyframes}</style>
      <defs>
        <linearGradient id="hero-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="hero-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#34d399" stopOpacity=".35" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="180" cy="110" r="150" fill="url(#hero-glow)" />

      <g className="hero-card">
        <rect
          x="30"
          y="12"
          width="300"
          height="170"
          rx="26"
          fill="url(#hero-card)"
          stroke="rgba(255,255,255,.14)"
        />
        <text x="180" y="36" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
          הוצאות החודש
        </text>

        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="14" />
        {SEGMENTS.map((s, i) => {
          const before = SEGMENTS.slice(0, i).reduce((a, b) => a + b.amount, 0)
          const angle = (before / TOTAL) * 360 - 90
          return (
            <circle
              key={s.label}
              className="hero-seg"
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeLinecap="butt"
              strokeDasharray={`${(s.amount / TOTAL) * C} ${C}`}
              transform={`rotate(${angle} ${CX} ${CY})`}
              style={{ animation: `seg${i} ${CYCLE}s ease-in-out infinite` }}
            />
          )
        })}
        <Counter />

        {SEGMENTS.map((s, i) => {
          const y = 66 + i * 28
          return (
            <g key={s.label}>
              <circle cx="170" cy={y} r="4" fill={s.color} />
              <text x="182" y={y + 4} fill="#cbd5e1" fontSize="11" fontWeight="600">
                {s.label}
              </text>
              <rect x="232" y={y - 2} width="84" height="5" rx="2.5" fill="rgba(255,255,255,.08)" />
              <rect
                className="hero-bar"
                x="232"
                y={y - 2}
                width="84"
                height="5"
                rx="2.5"
                fill={s.color}
                style={{ animation: `bar${i} ${CYCLE}s ease-in-out infinite` }}
              />
            </g>
          )
        })}
      </g>

      <path d="M 20 272 H 340" stroke="rgba(255,255,255,.12)" strokeWidth="2" strokeLinecap="round" />

      <Person x={95} shirt="#34d399" hair="#7c2d12" skin="#fcd9b6" long wave delay={0} />
      <Person x={150} kid shirt="#fbbf24" hair="#1e293b" skin="#f8c9a0" delay={0.4} />
      <Person x={215} shirt="#60a5fa" hair="#1e293b" skin="#e9b58d" delay={0.2} />
      <Person x={270} kid shirt="#f472b6" hair="#92400e" skin="#fcd9b6" delay={0.6} />

      {SEGMENTS.map((s, i) => (
        <g key={s.label} className="hero-chip" style={{ animation: `chip${i} ${CYCLE}s ease-in-out infinite` }}>
          <rect x="-34" y="-13" width="68" height="26" rx="13" fill="#0f172a" stroke={s.color} strokeWidth="1.5" />
          <text x="0" y="4" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">
            {s.icon} {fmt(s.amount)}
          </text>
        </g>
      ))}
    </svg>
  )
}
