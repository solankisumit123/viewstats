import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { Play, RefreshCw, Star, Search, X, ChevronDown, Loader2 } from 'lucide-react'
import { CategoryBar, CATEGORIES } from '../components/youtube/CategoryBar'
import { VideoCard, type VideoData } from '../components/youtube/VideoCard'
import { VideoPlayer } from '../components/youtube/VideoPlayer'
import { SkeletonCard } from '../components/youtube/SkeletonCard'

import { ChannelAvatar } from '../components/ChannelAvatar'

/* ─── fetch one page of videos and channels from the backend ─── */
async function fetchPage(query: string, page: number): Promise<{ videos: VideoData[], channels: any[] }> {
  const url = `/api/search?q=${encodeURIComponent(query)}&type=all&page=${page}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return {
    videos: (data.videos || []) as VideoData[],
    channels: (data.channels || []) as any[]
  }
}

function formatNumber(n: number) {
  if (!n || isNaN(n)) return '0'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}

/* ─── main component ─── */
export function YouTubeBrowser() {
  /* category & search state */
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCategory = searchParams.get('category') || 'trending'
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch]   = useState('')   // committed search

  /* video feed state */
  const [videos, setVideos]       = useState<VideoData[]>([])
  const [channels, setChannels]   = useState<any[]>([])
  const [page, setPage]           = useState(1)
  const [hasMore, setHasMore]     = useState(true)
  const [loading, setLoading]     = useState(true)        // first page loading
  const [loadingMore, setLoadingMore] = useState(false)   // subsequent pages
  const [error, setError]         = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState(false)

  /* player */
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null)

  /* refs */
  const sentinelRef   = useRef<HTMLDivElement>(null)
  const activeQueryRef = useRef('')                        // tracks current live query
  const isFetchingRef = useRef(false)

  /* ── compute current search query ── */
  const currentQuery = useCallback(() => {
    if (activeSearch.trim()) return activeSearch.trim()
    return CATEGORIES.find(c => c.id === selectedCategory)?.query || 'trending'
  }, [activeSearch, selectedCategory])

  /* ══════════════════════════════════════════════════
     LOAD FIRST PAGE whenever category or search changes
  ══════════════════════════════════════════════════ */
  useEffect(() => {
    const q = currentQuery()
    activeQueryRef.current = q

    setVideos([])
    setChannels([])
    setPage(1)
    setHasMore(true)
    setError(null)
    setLoading(true)

    fetchPage(q, 1)
      .then(res => {
        if (activeQueryRef.current !== q) return   // stale, ignore
        setVideos(res.videos)
        setChannels(res.channels)
        // Keep hasMore=true as long as we got at least 1 video
        setHasMore(res.videos.length > 0)
      })
      .catch(() => {
        if (activeQueryRef.current !== q) return
        setError('Failed to load videos. Please try again.')
      })
      .finally(() => {
        if (activeQueryRef.current !== q) return
        setLoading(false)
      })
  }, [selectedCategory, activeSearch, currentQuery])

  // Sync URL search parameter to local state
  useEffect(() => {
    const q = searchParams.get('search') || ''
    setActiveSearch(q)
    setSearchInput(q)
  }, [searchParams])


  /* ══════════════════════════════════════════════════
     LOAD NEXT PAGE  (called by scroll sentinel OR button)
  ══════════════════════════════════════════════════ */
  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore || loadMoreError || isFetchingRef.current) return

    const q = activeQueryRef.current
    const nextPage = page + 1

    setLoadingMore(true)
    setLoadMoreError(false)
    isFetchingRef.current = true

    fetchPage(q, nextPage)
      .then(res => {
        if (activeQueryRef.current !== q) return   // stale

        if (res.videos.length === 0) {
          // Nothing came back — disable infinite scroll but show button to retry
          setHasMore(false)
        } else {
          // Deduplicate by youtube_id
          setVideos(prev => {
            const seen = new Set(prev.map(v => v.youtube_id))
            const fresh = res.videos.filter(v => !seen.has(v.youtube_id))
            return [...prev, ...fresh]
          })
          setPage(nextPage)
          setHasMore(true)            // always assume more until we get 0
        }
      })
      .catch(err => {
        console.error('loadMore error:', err)
        setLoadMoreError(true)
      })
      .finally(() => {
        setLoadingMore(false)
        isFetchingRef.current = false
      })
  }, [loadingMore, loading, hasMore, page, loadMoreError])

  /* ══════════════════════════════════════════════════
     INTERSECTION OBSERVER — triggers loadMore when
     sentinel enters viewport (with 400px early trigger)
  ══════════════════════════════════════════════════ */
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !loadMoreError && !isFetchingRef.current) {
          loadMore()
        }
      },
      { rootMargin: '400px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, hasMore, loading, loadingMore, loadMoreError])

  /* ── related-video play event from VideoPlayer ── */
  useEffect(() => {
    const handler = (e: Event) => setSelectedVideo((e as CustomEvent<VideoData>).detail)
    window.addEventListener('yt-play', handler)
    return () => window.removeEventListener('yt-play', handler)
  }, [])

  /* ── derived ── */
  const currentCat = CATEGORIES.find(c => c.id === selectedCategory)
  const CatIcon = currentCat?.icon || Play
  const displayTitle = activeSearch
    ? `Results: "${activeSearch}"`
    : (currentCat?.name || 'Trending')

  /* handlers */
  const handleCategoryClick = (id: string) => {
    setSearchParams({ category: id })
    setActiveSearch('')
    setSearchInput('')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveSearch(searchInput.trim())
  }

  const clearSearch = () => {
    setSearchInput('')
    setActiveSearch('')
  }

  const retryFirstPage = () => {
    setError(null)
    setLoading(true)
    setVideos([])
    setChannels([])
    setPage(1)
    setHasMore(true)
    const q = activeQueryRef.current
    fetchPage(q, 1)
      .then(res => {
        setVideos(res.videos)
        setChannels(res.channels)
        setHasMore(res.videos.length > 0)
      })
      .catch(() => setError('Failed to load. Please try again.'))
      .finally(() => setLoading(false))
  }

  /* ══════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════ */
  return (
    <div className="space-y-5 pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-youtube flex items-center justify-center shadow-lg shadow-youtube/30 shrink-0">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">YouTube Browser</h1>
            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Loading videos…'
                : `${videos.length}${hasMore ? '+' : ''} videos · ${displayTitle}`}
            </p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative w-full sm:w-96 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search any topic…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-card border border-input
                         focus:outline-none focus:ring-2 focus:ring-youtube/40 text-sm transition-all"
            />
            {searchInput && (
              <button type="button" onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <button type="submit"
            className="px-4 py-2.5 rounded-xl bg-youtube text-white text-sm font-semibold
                       hover:bg-youtube/90 transition-colors shrink-0">
            Search
          </button>
        </form>
      </div>

      {/* ── Category Bar ── */}
      <CategoryBar selected={selectedCategory} onSelect={handleCategoryClick} />





      {/* ── Active search badge ── */}
      {activeSearch && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="text-muted-foreground">Showing:</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-youtube/10 text-youtube text-xs font-semibold">
            {activeSearch}
            <button onClick={clearSearch}><X className="w-3 h-3" /></button>
          </span>
        </div>
      )}

      {/* ── Channel Result Card ── */}
      {activeSearch && channels.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-2">
          <div className="shrink-0">
            <ChannelAvatar
              channelName={channels[0].title}
              channelId={channels[0].id}
              size={80}
            />
          </div>
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg font-black text-foreground truncate">
                {channels[0].title}
              </h3>
              <span className="inline-flex self-center text-xs bg-youtube/10 text-youtube px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                Channel
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {formatNumber(channels[0].subscriber_count)} subscribers · {channels[0].video_count} videos
            </p>
            {channels[0].description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 max-w-2xl mx-auto sm:mx-0">
                {channels[0].description}
              </p>
            )}
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <a
              href={`https://www.youtube.com/channel/${channels[0].id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-youtube text-white text-sm font-semibold hover:bg-youtube/90 transition-colors shadow-sm"
            >
              Visit Channel
            </a>
          </div>
        </div>
      )}


      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CatIcon className="w-5 h-5 text-youtube" />
          <h2 className="text-lg font-bold">{displayTitle}</h2>
          {!loading && videos.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({videos.length}{hasMore ? '+' : ''})
            </span>
          )}
        </div>
        <button
          onClick={retryFirstPage}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-youtube
                     transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30
                        dark:border-red-900/50 p-4 text-sm text-red-700 dark:text-red-400
                        flex items-center justify-between">
          <span>{error}</span>
          <button onClick={retryFirstPage}
            className="ml-4 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700
                       text-xs font-medium shrink-0">
            Try Again
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          VIDEO GRID
      ══════════════════════════════════════════ */}
      {loading ? (
        /* First-page skeleton */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array(16).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : videos.length === 0 && !error ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Star className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium">No videos found</p>
          <p className="text-xs opacity-60">Try a different category or search term</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {videos.map((v, i) => (
              <VideoCard
                key={`${v.youtube_id}-${i}`}
                video={v}
                onClick={setSelectedVideo}
                index={i % 16}          /* cap delay so late cards don't lag */
              />
            ))}

            {/* Inline skeleton rows while loading more */}
            {loadingMore && Array(8).fill(0).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
          </div>

          {/* ══════════════════════════════════════════
              LOAD MORE AREA
              - sentinel div triggers auto-load via IO
              - spinner shows while fetching
              - button shown as fallback / manual trigger
          ══════════════════════════════════════════ */}
          <div className="flex flex-col items-center gap-3 pt-4">

            {/* Invisible sentinel — sits just below the grid */}
            <div ref={sentinelRef} className="h-1 w-full" />

            {loadingMore && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="w-5 h-5 animate-spin text-youtube" />
                Loading more {activeSearch || currentCat?.name} videos…
              </div>
            )}

            {/* Manual Load More button — always shown when more might exist */}
            {!loadingMore && hasMore && videos.length > 0 && (
              loadMoreError ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm text-muted-foreground">Failed to load more videos.</span>
                  <button
                    onClick={loadMore}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-youtube text-white font-semibold text-sm hover:bg-youtube/90 transition-all shadow-sm"
                  >
                    Click to Retry
                  </button>
                </div>
              ) : (
                <button
                  onClick={loadMore}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-youtube/40
                             text-youtube font-semibold text-sm hover:bg-youtube hover:text-white
                             hover:border-youtube transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <ChevronDown className="w-4 h-4" />
                  Load More Videos
                </button>
              )
            )}

            {!hasMore && videos.length > 0 && (
              <p className="text-xs text-muted-foreground py-2">
                All available videos loaded · Switch category to discover more
              </p>
            )}
          </div>
        </>
      )}

      {/* ── Video Player Modal ── */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayer
            key={selectedVideo.youtube_id}
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
