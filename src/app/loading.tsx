export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-1000 text-ink flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-[0_0_0_1px_rgba(59,130,246,0.08)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
          <div className="h-2.5 w-28 rounded-full bg-zinc-800" />
        </div>
        <div className="space-y-3">
          <div className="h-3 w-3/4 rounded-full bg-zinc-800" />
          <div className="h-3 w-2/3 rounded-full bg-zinc-800" />
          <div className="h-3 w-1/2 rounded-full bg-zinc-800" />
        </div>
      </div>
    </div>
  )
}
