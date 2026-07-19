import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { motion } from 'framer-motion'
import { Play, Eye, Clock, Radio, Zap, CheckCircle2, Bookmark } from 'lucide-react'
import { ChannelAvatar } from '../ChannelAvatar'

export interface VideoData {
  id?: string
  youtube_id: string
  title: string
  description?: string
  thumbnail_url?: string
  thumbnail?: string
  view_count?: number
  views?: number
  like_count?: number
  comment_count?: number
  published_at?: string
  ago?: string
  duration?: number
  seconds?: number
  is_live?: boolean
  is_short?: boolean
  is_hd?: boolean
  is_4k?: boolean
  channel?: { title?: string; id?: string; thumbnail_url?: string }
  author?: { title?: string; name?: string; url?: string; image?: string; thumbnail?: string }
}

export function formatViews(n?: number): string {
  if (!n || isNaN(n)) return '0'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatPublished(val?: string): string {
  if (!val) return ''
  if (/ago|day|week|month|year|hour|min/i.test(val)) return val
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`
    return `${Math.floor(diff / 31536000)}y ago`
  } catch {
    return val
  }
}

/** Returns a reliable YouTube CDN thumbnail URL.
 *  yt-search sometimes returns custom filenames (hq720_custom_1.jpg) that 404.
 *  We only accept urls from ytimg.com or img.youtube.com; otherwise use hqdefault. */
function buildThumbSrc(url: string | undefined, vid: string): string {
  if (url && (url.includes('ytimg.com') || url.includes('img.youtube.com'))) {
    // Reject custom filenames that often 404
    if (!url.includes('hq720_custom')) {
      return url
    }
  }
  return `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
}


interface VideoCardProps {
  video: VideoData
  onClick: (video: VideoData) => void
  index?: number
  layout?: 'grid' | 'horizontal'
}

export function VideoCard({ video, onClick, index = 0, layout = 'grid' }: VideoCardProps) {
  const [hovered, setHovered] = useState(false)
  const [thumbIndex, setThumbIndex] = useState(0)

  const vid = video.youtube_id

  // Check if saved in localStorage Watch Later
  const checkIfSaved = () => {
    try {
      const list = JSON.parse(localStorage.getItem('watch_later') || '[]')
      return list.some((item: any) => item.youtube_id === vid)
    } catch {
      return false
    }
  }
  const [isSaved, setIsSaved] = useState(checkIfSaved)

  const handleBookmark = (e: SyntheticEvent<HTMLElement>) => {
    e.stopPropagation()
    try {
      const list = JSON.parse(localStorage.getItem('watch_later') || '[]')
      if (isSaved) {
        const filtered = list.filter((item: any) => item.youtube_id !== vid)
        localStorage.setItem('watch_later', JSON.stringify(filtered))
        setIsSaved(false)
        // Dispatch custom event to trigger real-time UI refresh in YouTubeBrowser if it is active
        window.dispatchEvent(new Event('watch-later-updated'))
      } else {
        // Save the full video details so we can render it without API calls
        list.push(video)
        localStorage.setItem('watch_later', JSON.stringify(list))
        setIsSaved(true)
        window.dispatchEvent(new Event('watch-later-updated'))
      }
    } catch (err) {
      console.error('Failed to toggle watch later:', err)
    }
  }
  const channelName = video.channel?.title || video.author?.title || video.author?.name || 'Unknown'
  const channelAvatar = video.channel?.thumbnail_url || video.author?.image || video.author?.thumbnail || ''
  const channelId = video.channel?.id || video.author?.url || ''


  // Ordered list of fallback thumbnails — all guaranteed YouTube CDN
  const thumbSources = [
    buildThumbSrc(video.thumbnail_url || video.thumbnail, vid),
    `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${vid}/sddefault.jpg`,
  ]
  // Deduplicate consecutive identical entries
  const thumbFallbacks = thumbSources.filter((v, i, arr) => i === 0 || v !== arr[i - 1])
  const thumbnail = thumbFallbacks[Math.min(thumbIndex, thumbFallbacks.length - 1)]
  const handleThumbError = () => setThumbIndex(i => Math.min(i + 1, thumbFallbacks.length - 1))

  const views = video.view_count || video.views || 0
  const duration = video.duration || video.seconds || 0
  const isLive = video.is_live || (duration === 0 && video.title?.toLowerCase().includes('live'))
  const isShort = video.is_short || (duration > 0 && duration <= 60)
  const isHD = video.is_hd !== false && duration > 60
  const is4K = video.is_4k || false

  /* ── Horizontal layout (sidebar/related) ── */
  if (layout === 'horizontal') {
    return (
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        onClick={() => onClick(video)}
        className="w-full text-left flex gap-3 group p-2 rounded-xl hover:bg-muted/50 transition-all"
      >
        <div className="w-40 aspect-video rounded-lg overflow-hidden bg-muted relative shrink-0">
          <img
            src={thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={handleThumbError}
            loading="lazy"
          />
          {duration > 0 && !isLive && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1 rounded">
              {formatDuration(duration)}
            </span>
          )}
          {isLive && (
            <span className="absolute bottom-1 left-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Radio className="w-2.5 h-2.5" /> LIVE
            </span>
          )}
          {/* Bookmark Button */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleBookmark}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleBookmark(e)
              }
            }}
            className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-md transition-all
              ${isSaved
                ? 'bg-youtube text-white shadow-sm'
                : 'bg-black/60 text-white/80 hover:text-white hover:bg-black/80'
              }`}
            title={isSaved ? "Remove from Watch Later" : "Watch Later"}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
          </div>
        </div>
        <div className="flex-1 min-w-0 py-0.5 space-y-1">
          <div className="text-xs font-semibold line-clamp-2 group-hover:text-youtube transition-colors leading-snug">
            {video.title}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{channelName}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Eye className="w-3 h-3" />
            {formatViews(views)}
            {video.published_at && <> · {formatPublished(video.published_at)}</>}
          </div>
        </div>
      </motion.button>
    )
  }

  /* ── Grid layout (main feed) ── */
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3, ease: 'easeOut' }}
      onClick={() => onClick(video)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex flex-col group focus:outline-none focus-visible:ring-2 focus-visible:ring-youtube rounded-xl"
    >
      {/* Thumbnail */}
      <div className="aspect-video rounded-xl overflow-hidden bg-muted relative mb-3">
        <img
          src={thumbnail}
          alt={video.title}
          className={`w-full h-full object-cover transition-transform duration-500 ${hovered ? 'scale-110' : 'scale-100'}`}
          onError={handleThumbError}
          loading="lazy"
        />

        {/* Play overlay */}
        <div className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-12 h-12 rounded-full bg-black/70 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Duration badge */}
        {duration > 0 && !isLive && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            {formatDuration(duration)}
          </span>
        )}

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {isLive && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
              <Radio className="w-2.5 h-2.5" /> LIVE
            </span>
          )}
          {isShort && !isLive && (
            <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" /> SHORT
            </span>
          )}
          {is4K && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">4K</span>
          )}
          {isHD && !is4K && !isShort && (
            <span className="bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">HD</span>
          )}
        </div>

        {/* Bookmark Overlay Button */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleBookmark}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleBookmark(e)
            }
          }}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all z-10
            ${isSaved
              ? 'bg-youtube text-white shadow-md scale-105'
              : 'bg-black/50 text-white/80 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100'
            }`}
          title={isSaved ? "Remove from Watch Later" : "Watch Later"}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
        </div>
      </div>

      {/* Meta */}
      <div className="flex gap-2.5 px-0.5">
        <div className="shrink-0 mt-0.5">
          <ChannelAvatar channelName={channelName} channelAvatarUrl={channelAvatar} channelId={channelId} size={36} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold leading-snug line-clamp-2 group-hover:text-youtube transition-colors mb-1">
            {video.title}
          </div>
          <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
            <span className="truncate">{channelName}</span>
            <CheckCircle2 className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
          <div className="text-[12px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Eye className="w-3 h-3 shrink-0" />
            <span>{formatViews(views)} views</span>
            {video.published_at && (
              <>
                <span>·</span>
                <Clock className="w-3 h-3 shrink-0" />
                <span>{formatPublished(video.published_at)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  )
}
