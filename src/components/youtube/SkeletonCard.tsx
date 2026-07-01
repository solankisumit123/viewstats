export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {/* Thumbnail */}
      <div className="aspect-video rounded-xl bg-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      </div>
      {/* Meta row */}
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          {/* Title lines */}
          <div className="h-3.5 bg-muted rounded-md w-full" />
          <div className="h-3.5 bg-muted rounded-md w-4/5" />
          {/* Channel + meta */}
          <div className="h-3 bg-muted rounded-md w-3/5" />
          <div className="h-3 bg-muted rounded-md w-2/5" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonCardHorizontal() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-40 aspect-video rounded-lg bg-muted shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      </div>
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3.5 bg-muted rounded-md w-full" />
        <div className="h-3.5 bg-muted rounded-md w-4/5" />
        <div className="h-3 bg-muted rounded-md w-3/5" />
        <div className="h-3 bg-muted rounded-md w-2/5" />
      </div>
    </div>
  )
}
