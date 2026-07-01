import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Play, Eye, ExternalLink, Share2, Copy, Check,
  ThumbsUp, MessageSquare, ChevronDown, ChevronUp,
  CheckCircle2, ArrowLeft, Radio, Loader2, Clock,
  Hash, Volume2
} from 'lucide-react'
import type { VideoData } from './VideoCard'
import { formatViews, formatDuration, formatPublished } from './VideoCard'
import { ChannelAvatar } from '../ChannelAvatar'

function safeThumb(url: string | undefined, vid: string) {
  if (url && (url.includes('ytimg.com') || url.includes('img.youtube.com'))) return url
  return `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
}

function formatDate(val?: string) {
  if (!val) return ''
  if (/ago|day|week|month|year|hour|min/i.test(val)) return val
  try {
    return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return val }
}

interface VideoPlayerProps {
  video: VideoData
  onClose: () => void
}

export function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  const [related, setRelated]             = useState<VideoData[]>([])
  const [loadingRelated, setLoadingRelated] = useState(true)
  const [copied, setCopied]               = useState(false)
  const [descExpanded, setDescExpanded]   = useState(false)
  const [activeVideo, setActiveVideo]     = useState<VideoData>(video)
  const [thumbError, setThumbError]       = useState(false)
  const relatedRef = useRef<HTMLDivElement>(null)

  const channelName   = activeVideo.channel?.title || activeVideo.author?.title || activeVideo.author?.name || 'Unknown'
  const channelAvatar  = activeVideo.channel?.thumbnail_url || activeVideo.author?.image || activeVideo.author?.thumbnail || ''
  const channelId = activeVideo.channel?.id || activeVideo.author?.url || ''
  const views    = activeVideo.view_count  || activeVideo.views || 0

  const likes    = activeVideo.like_count  || Math.floor(views * 0.04)
  const comments = activeVideo.comment_count || Math.floor(views * 0.002)
  const duration = activeVideo.duration || activeVideo.seconds || 0
  const youtubeUrl = `https://www.youtube.com/watch?v=${activeVideo.youtube_id}`
  const thumb = safeThumb(activeVideo.thumbnail_url || activeVideo.thumbnail, activeVideo.youtube_id)

  // Fetch full video details (description, likes, real channel avatar, etc.)
  useEffect(() => {
    if (!activeVideo.youtube_id) return;
    fetch(`/api/video-details?id=${activeVideo.youtube_id}`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch');
      })
      .then((data: any) => {
        setActiveVideo(prev => ({
          ...prev,
          description: data.description || prev.description,
          like_count: data.like_count || prev.like_count,
          comment_count: data.comment_count || prev.comment_count,
          duration: data.duration || prev.duration,
          published_at: data.published_at || prev.published_at,
          author: {
            ...prev.author,
            image: data.author?.thumbnail || data.author?.image || prev.author?.image,
            thumbnail: data.author?.thumbnail || prev.author?.thumbnail,
            url: data.author?.url || prev.author?.url
          },
          channel: {
            ...prev.channel,
            thumbnail_url: data.author?.thumbnail || data.author?.image || prev.channel?.thumbnail_url,
            id: data.author?.url || prev.channel?.id
          }
        }));
      })
      .catch(err => console.error('Error fetching details:', err));
  }, [activeVideo.youtube_id]);

  /* fetch related */

  useEffect(() => {
    setLoadingRelated(true)
    setRelated([])
    const q = encodeURIComponent(
      (channelName + ' ' + (activeVideo.title?.split(' ').slice(0, 5).join(' ') || '')).trim()
    )
    fetch(`/api/search?q=${q}&type=all`)
      .then(r => r.json())
      .then(data => {
        const vids = (data.videos || []).filter((v: VideoData) => v.youtube_id !== activeVideo.youtube_id)
        setRelated(vids.slice(0, 15))
      })
      .catch(() => setRelated([]))
      .finally(() => setLoadingRelated(false))
  }, [activeVideo.youtube_id]) // eslint-disable-line react-hooks/exhaustive-deps

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  /* escape key */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  /* play a related video */
  const playVideo = (v: VideoData) => {
    setActiveVideo(v)
    setDescExpanded(false)
    setThumbError(false)
    relatedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(youtubeUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <AnimatePresence>
      {/* ── Backdrop ── */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md overflow-y-auto"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.05 }}
          className="min-h-screen w-full"
          style={{ willChange: 'transform, opacity' }}
        >
          {/* ══════════════════════════════════════
              TOP BAR
          ══════════════════════════════════════ */}
          <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3
                          bg-black/70 backdrop-blur-xl border-b border-white/5">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-white/70 hover:text-white
                         text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Browse</span>
            </button>
            <div className="flex-1 text-white/40 text-xs truncate hidden md:block">
              {activeVideo.title}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20
                         flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* ══════════════════════════════════════
              MAIN CONTENT
          ══════════════════════════════════════ */}
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-5
                          grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

            {/* ─── LEFT: Player + Info ─── */}
            <div className="space-y-4">

              {/* ── Embedded Player ── */}
              <div
                className="aspect-video w-full rounded-2xl overflow-hidden bg-black
                            shadow-[0_0_60px_rgba(255,0,0,0.15)] ring-1 ring-white/5"
                style={{ willChange: 'transform', transform: 'translate3d(0,0,0)' }}
              >
                <iframe
                  key={activeVideo.youtube_id}
                  src={`https://www.youtube.com/embed/${activeVideo.youtube_id}?autoplay=1&modestbranding=1&rel=0&color=red&playsinline=1&enablejsapi=1&iv_load_policy=3&fs=1&origin=${encodeURIComponent(window.location.origin)}`}
                  title={activeVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="eager"
                  className="w-full h-full"
                  style={{ border: 'none' }}
                />
              </div>

              {/* ── Info Card ── */}
              <div className="rounded-2xl bg-white/5 border border-white/8 backdrop-blur-sm p-5 space-y-5">

                {/* Title */}
                <h1 className="text-white text-lg sm:text-xl font-bold leading-snug">
                  {activeVideo.title}
                </h1>

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2
                                text-sm text-white/50 border-b border-white/8 pb-4">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-white/30" />
                    <strong className="text-white/80">{formatViews(views)}</strong> views
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ThumbsUp className="w-4 h-4 text-white/30" />
                    <strong className="text-white/80">{formatViews(likes)}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-white/30" />
                    <strong className="text-white/80">{formatViews(comments)}</strong>
                  </span>
                  {duration > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-white/30" />
                      <strong className="text-white/80">{formatDuration(duration)}</strong>
                    </span>
                  )}
                  {activeVideo.published_at && (
                    <span className="text-white/40 text-xs ml-auto">
                      {formatDate(activeVideo.published_at)}
                    </span>
                  )}
                </div>

                {/* Channel row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <ChannelAvatar channelName={channelName} channelAvatarUrl={channelAvatar} channelId={channelId} size={48} />

                    <div>
                      <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                        {channelName}
                        <CheckCircle2 className="w-3.5 h-3.5 text-white/40" />
                      </div>
                      <div className="text-white/40 text-xs mt-0.5">YouTube Creator</div>
                    </div>
                  </div>
                  <a
                    href={`https://www.youtube.com/@${channelName.replace(/\s+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black
                               text-sm font-bold hover:bg-white/90 transition-colors shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Subscribe
                  </a>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-youtube text-white
                               text-sm font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-youtube/30"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Watch on YouTube
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                  <button
                    onClick={copyUrl}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 text-white/80
                               text-sm font-medium hover:bg-white/15 transition-colors border border-white/10"
                  >
                    {copied
                      ? <><Check className="w-4 h-4 text-green-400" /><span className="text-green-400">Copied!</span></>
                      : <><Copy className="w-4 h-4" />Copy Link</>
                    }
                  </button>
                  <button
                    onClick={() => navigator.share
                      ? navigator.share({ title: activeVideo.title, url: youtubeUrl })
                      : copyUrl()
                    }
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 text-white/80
                               text-sm font-medium hover:bg-white/15 transition-colors border border-white/10"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>

                {/* Description */}
                {activeVideo.description && (
                  <div className="rounded-xl bg-white/4 border border-white/6 p-4">
                    <div className={`text-sm text-white/60 leading-relaxed whitespace-pre-wrap
                                    ${!descExpanded ? 'line-clamp-3' : ''}`}>
                      {activeVideo.description}
                    </div>
                    <button
                      onClick={() => setDescExpanded(e => !e)}
                      className="flex items-center gap-1 text-xs text-youtube hover:underline mt-2 font-medium"
                    >
                      {descExpanded
                        ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                        : <><ChevronDown className="w-3.5 h-3.5" /> Show more</>
                      }
                    </button>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {[channelName, 'YouTube', 'Video',
                    ...(activeVideo.title?.split(' ').slice(0, 3) || [])
                  ].filter(Boolean).slice(0, 6).map((tag, i) => (
                    <span key={i}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full
                                 bg-white/6 text-white/40 text-[11px] border border-white/8">
                      <Hash className="w-2.5 h-2.5" />{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── RIGHT: Related Videos ─── */}
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2 px-1">
                <Radio className="w-4 h-4 text-youtube animate-pulse" />
                <span className="text-white font-bold text-sm">Up Next</span>
                {!loadingRelated && (
                  <span className="text-white/30 text-xs">({related.length})</span>
                )}
              </div>

              {/* List */}
              <div
                ref={relatedRef}
                className="space-y-1 overflow-y-auto pr-1 max-h-[calc(100vh-160px)]
                           scrollbar-hide"
                style={{ scrollbarWidth: 'none' }}
              >
                {loadingRelated
                  ? Array(8).fill(0).map((_, i) => (
                      <div key={i} className="flex gap-3 p-2 animate-pulse">
                        <div className="w-40 aspect-video rounded-lg bg-white/8 shrink-0" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3 bg-white/8 rounded-md w-full" />
                          <div className="h-3 bg-white/8 rounded-md w-4/5" />
                          <div className="h-3 bg-white/8 rounded-md w-3/5" />
                        </div>
                      </div>
                    ))
                  : related.map((v, i) => (
                      <RelatedCard
                        key={`${v.youtube_id}-${i}`}
                        video={v}
                        isActive={v.youtube_id === activeVideo.youtube_id}
                        onClick={() => playVideo(v)}
                      />
                    ))
                }
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ── Related Video Card (dark theme) ── */
function RelatedCard({
  video,
  isActive,
  onClick,
}: {
  video: VideoData
  isActive: boolean
  onClick: () => void
}) {
  const [thumbIdx, setThumbIdx] = useState(0)
  const vid = video.youtube_id
  const thumbs = [
    safeThumb(video.thumbnail_url || video.thumbnail, vid),
    `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
  ]
  const thumb = thumbs[Math.min(thumbIdx, thumbs.length - 1)]
  const channel       = video.channel?.title || video.author?.title || video.author?.name || ''
  const channelAvatar = video.channel?.thumbnail_url || video.author?.image || video.author?.thumbnail || ''
  const channelId     = video.channel?.id || video.author?.url || ''
  const views = video.view_count || video.views || 0

  const duration = video.duration || video.seconds || 0

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex gap-3 p-2 rounded-xl transition-all group
                  ${isActive
                    ? 'bg-youtube/20 border border-youtube/30'
                    : 'hover:bg-white/6 border border-transparent'}`}
    >
      {/* Thumbnail */}
      <div className="w-36 sm:w-40 aspect-video rounded-lg overflow-hidden bg-white/8 shrink-0 relative">
        <img
          src={thumb}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setThumbIdx(i => Math.min(i + 1, thumbs.length - 1))}
          loading="lazy"
        />
        {isActive && (
          <div className="absolute inset-0 bg-youtube/30 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-youtube flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}
        {duration > 0 && !isActive && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1 rounded">
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0 py-0.5 space-y-1">
        <div className={`text-xs font-semibold line-clamp-2 leading-snug transition-colors
                         ${isActive ? 'text-youtube' : 'text-white/85 group-hover:text-white'}`}>
          {video.title}
        </div>
        <div className="flex items-center gap-1.5">
          <ChannelAvatar channelName={channel} channelAvatarUrl={channelAvatar} channelId={channelId} size={14} />

          <span className="text-[11px] text-white/40 truncate">{channel}</span>
        </div>
        <div className="text-[11px] text-white/30 flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {formatViews(views)}
          {video.published_at && <> · {formatPublished(video.published_at)}</>}
        </div>
      </div>
    </button>
  )
}
