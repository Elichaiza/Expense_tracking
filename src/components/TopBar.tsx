// פס עליון צבעוני - מאחורי שורת המצב של האייפון (שם הטקסט תמיד לבן)
export default function TopBar() {
  return (
    <div className="bg-gradient-to-l from-emerald-500 to-teal-500 text-white pt-[env(safe-area-inset-top)] shadow-md shadow-emerald-500/20">
      <div className="max-w-md mx-auto px-5 py-3 flex items-center gap-2">
        <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/25 font-bold">₪</span>
        <span className="font-bold tracking-tight">הוצאות המשפחה</span>
      </div>
    </div>
  )
}
