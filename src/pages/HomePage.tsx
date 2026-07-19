import { useState, useEffect, useRef } from 'react'
import {
  Play,
  ArrowRight,
  Flame,
  Sparkles,
  X
} from 'lucide-react'
import { ChannelAvatar } from '../components/ChannelAvatar'
import { VideoCard, type VideoData } from '../components/youtube/VideoCard'
import { VideoPlayer } from '../components/youtube/VideoPlayer'
import { SkeletonCard } from '../components/youtube/SkeletonCard'

const TOP_10_CHANNELS = [
  { id: 'UCX6OQ3DkcsbYNE6H8uQQuVA', title: 'MrBeast', subscriber_count: 360000000, category: 'Entertainment', avatar_url: 'https://unavatar.io/youtube/UCX6OQ3DkcsbYNE6H8uQQuVA' },
  { id: 'UCq-Fj5jknLsUf-MWSy4_brA', title: 'T-Series', subscriber_count: 280000000, category: 'Music', avatar_url: 'https://unavatar.io/youtube/UCq-Fj5jknLsUf-MWSy4_brA' },
  { id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw', title: 'PewDiePie', subscriber_count: 110000000, category: 'Gaming', avatar_url: 'https://unavatar.io/youtube/UC-lHJZR3Gqxm24_Vd_AJ5Yw' },
  { id: 'UCJ5v_1Y8wV8745_vGPELVEw', title: 'WWE', subscriber_count: 100000000, category: 'Sports', avatar_url: 'https://unavatar.io/youtube/UCJ5v_1Y8wV8745_vGPELVEw' },
  { id: 'UCbCmjCuTUZos6Inko4u57UQ', title: 'Cocomelon', subscriber_count: 170000000, category: 'Kids', avatar_url: 'https://unavatar.io/youtube/UCbCmjCuTUZos6Inko4u57UQ' },
  { id: 'UCvgfXK5nDoCz0b3lt8TXG3w', title: 'Vlad and Niki', subscriber_count: 120000000, category: 'Kids', avatar_url: 'https://unavatar.io/youtube/UCvgfXK5nDoCz0b3lt8TXG3w' },
  { id: 'UCjwl2neA1513vO5cM0dK7Dg', title: 'Like Nastya', subscriber_count: 115000000, category: 'Kids', avatar_url: 'https://unavatar.io/youtube/UCjwl2neA1513vO5cM0dK7Dg' },
  { id: 'UCy8Yy5Fp-7XW38XkH5L-FQQ', title: 'Zee Music Company', subscriber_count: 105000000, category: 'Music', avatar_url: 'https://unavatar.io/youtube/UCy8Yy5Fp-7XW38XkH5L-FQQ' },
  { id: 'UCRijo3ddMTht_IHyNSNXpNQ', title: 'Dude Perfect', subscriber_count: 60000000, category: 'Sports', avatar_url: 'https://unavatar.io/youtube/UCRijo3ddMTht_IHyNSNXpNQ' },
  { id: 'UCBJycsmduvYELgTAd88y6yQ', title: 'MKBHD', subscriber_count: 19000000, category: 'Technology', avatar_url: 'https://unavatar.io/youtube/UCBJycsmduvYELgTAd88y6yQ' }
]

function formatNumber(n: number) {
  if (!n || isNaN(n)) return '0'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}

export function HomePage() {
  const [videos, setVideos] = useState<VideoData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null)
  
  // State for active channel filter
  const [activeChannelFilter, setActiveChannelFilter] = useState<string | null>(null)
  const [errorLoadingMore, setErrorLoadingMore] = useState(false)
  
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFetchingRef = useRef(false)

  // 1. Fetch Page 1 (Trending Feed) on mount
  useEffect(() => {
    setLoading(true)
    fetch('/api/trending')
      .then(res => res.json())
      .then(data => {
        const cleanVids: VideoData[] = []
        const seen = new Set<string>()
        for (const v of data.videos || []) {
          if (v.youtube_id && !seen.has(v.youtube_id)) {
            seen.add(v.youtube_id)
            cleanVids.push(v)
          }
        }
        setVideos(cleanVids)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load mixed feed page 1:', err)
        setLoading(false)
      })
  }, [])

  // 2. Fetch subsequent pages when 'page' state increments
  useEffect(() => {
    if (page === 1) return
    setLoadingMore(true)
    setErrorLoadingMore(false)
    isFetchingRef.current = true

    const query = activeChannelFilter ? activeChannelFilter : 'trending'
    const url = `/api/search?q=${encodeURIComponent(query)}&type=all&page=${page}`

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const newVids = data.videos || []
        if (newVids.length === 0) {
          setHasMore(false)
        } else {
          setVideos(prev => {
            const seen = new Set(prev.map(v => v.youtube_id))
            const fresh = newVids.filter((v: VideoData) => v.youtube_id && !seen.has(v.youtube_id))
            return [...prev, ...fresh]
          })
        }
      })
      .catch(err => {
        console.error(`Failed to load page ${page}:`, err)
        setErrorLoadingMore(true)
      })
      .finally(() => {
        setLoadingMore(false)
        isFetchingRef.current = false
      })
  }, [page, activeChannelFilter])

  // 3. Setup IntersectionObserver for Infinite Scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !errorLoadingMore && !isFetchingRef.current) {
        setPage(prev => prev + 1)
      }
    }, { threshold: 0.1 })

    observer.observe(sentinel)
    return () => observer.unobserve(sentinel)
  }, [hasMore, loading, loadingMore, errorLoadingMore])

  // 4. Channel filter handlers
  const filterByChannel = (channelTitle: string) => {
    setLoading(true)
    setPage(1)
    setHasMore(true)
    setActiveChannelFilter(channelTitle)
    fetch(`/api/search?q=${encodeURIComponent(channelTitle)}&type=all&page=1`)
      .then(res => res.json())
      .then(data => {
        const cleanVids: VideoData[] = []
        const seen = new Set<string>()
        for (const v of data.videos || []) {
          if (v.youtube_id && !seen.has(v.youtube_id)) {
            seen.add(v.youtube_id)
            cleanVids.push(v)
          }
        }
        setVideos(cleanVids)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to filter by channel:', err)
        setLoading(false)
      })
  }

  const clearChannelFilter = () => {
    setLoading(true)
    setPage(1)
    setHasMore(true)
    setActiveChannelFilter(null)
    fetch('/api/trending')
      .then(res => res.json())
      .then(data => {
        const cleanVids: VideoData[] = []
        const seen = new Set<string>()
        for (const v of data.videos || []) {
          if (v.youtube_id && !seen.has(v.youtube_id)) {
            seen.add(v.youtube_id)
            cleanVids.push(v)
          }
        }
        setVideos(cleanVids)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to reload trending feed:', err)
        setLoading(false)
      })
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* ── Top Row: Trending Channels ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-youtube fill-youtube animate-pulse" />
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">
            Top 10 Trending Channels
          </h2>
          <span className="text-xs bg-youtube/10 text-youtube px-2 py-0.5 rounded-full font-bold uppercase">
            Live List
          </span>
        </div>

        {/* Responsive grid for channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {TOP_10_CHANNELS.map((channel, index) => {
            const isFilteringThis = activeChannelFilter === channel.title
            return (
              <button
                key={channel.id}
                onClick={() => isFilteringThis ? clearChannelFilter() : filterByChannel(channel.title)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl bg-card border hover:bg-muted transition-all duration-300 w-full shadow-md group text-left
                  ${isFilteringThis ? 'border-youtube bg-youtube/5 ring-1 ring-youtube' : 'border-border/85 hover:border-youtube/30'}`}
              >
                <div className="relative font-black text-sm text-muted-foreground w-5 shrink-0">
                  #{index + 1}
                </div>
                <ChannelAvatar
                  channelName={channel.title}
                  channelAvatarUrl={channel.avatar_url}
                  channelId={channel.id}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-foreground truncate group-hover:text-youtube transition-colors leading-tight">
                    {channel.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatNumber(channel.subscriber_count)} subs · {channel.category}
                  </div>
                </div>
                {isFilteringThis ? (
                  <X className="w-4 h-4 text-youtube shrink-0" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-youtube group-hover:translate-x-1 transition-all" />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Middle Row: Mixed Feed (Infinite Scroll) ── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-youtube" />
            <h2 className="text-xl font-extrabold tracking-tight text-foreground">
              {activeChannelFilter ? `Videos by ${activeChannelFilter}` : 'Recommended Mixed Feed'}
            </h2>
            {activeChannelFilter && (
              <button
                onClick={clearChannelFilter}
                className="flex items-center gap-1 text-xs bg-youtube text-white px-3 py-1 rounded-full font-bold hover:bg-youtube/90 transition-colors shadow-sm"
              >
                Show All <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {loading ? 'Discovering...' : activeChannelFilter ? 'Channel Specific Feed' : 'Scroll Down for Unlimited Videos'}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(12).fill(0).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {videos.map((video, idx) => (
              <VideoCard
                key={`${video.youtube_id}-${idx}`}
                video={video}
                onClick={setSelectedVideo}
              />
            ))}
          </div>
        )}

        {!loading && videos.length === 0 && (
          <div className="p-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
            No recommendations loaded. Please refresh.
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        <div ref={sentinelRef} className="h-16 flex flex-col items-center justify-center mt-6">
          {loadingMore && (
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground font-semibold bg-card px-4 py-2 rounded-xl border border-border shadow-sm">
              <span className="w-5 h-5 rounded-full border-2 border-youtube border-t-transparent animate-spin shrink-0"></span>
              Loading more videos...
            </div>
          )}
          {errorLoadingMore && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-muted-foreground">Failed to load more videos.</span>
              <button
                onClick={() => setPage(prev => prev + 1)}
                className="text-xs bg-youtube text-white px-3 py-1.5 rounded-xl font-bold hover:bg-youtube/90 transition-colors shadow-sm"
              >
                Click to Retry
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Active Video Player Modal ── */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  )
}
