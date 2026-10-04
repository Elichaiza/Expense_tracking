import { useEffect } from 'react'

// רקע בהיר עם כתמי צבע רכים נעים, למסכי הכניסה וההצטרפות
export default function Aurora({ children }: { children: React.ReactNode }) {
  // צבע שורת המצב/הדפדפן באנדרואיד תואם למסך הבהיר
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const prev = meta?.getAttribute('content')
    meta?.setAttribute('content', '#10b981')
    return () => {
      if (prev) meta?.setAttribute('content', prev)
    }
  }, [])

  return (
    <div className="relative min-h-full overflow-hidden bg-gradient-to-b from-emerald-50 via-sky-50 to-white text-slate-900">
      <div aria-hidden className="aurora">
        <span className="aurora-a" />
        <span className="aurora-b" />
        <span className="aurora-c" />
      </div>
      <div className="relative z-10 min-h-full">{children}</div>
    </div>
  )
}
