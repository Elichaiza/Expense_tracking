// רקע זוהר נע בלולאה מאחורי מסכי הכניסה
export default function Aurora({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div aria-hidden className="aurora">
        <span className="aurora-a" />
        <span className="aurora-b" />
        <span className="aurora-c" />
      </div>
      <div className="relative z-10 min-h-full">{children}</div>
    </div>
  )
}
