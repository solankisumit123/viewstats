import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Plus,
  Check,
  X,
  Send,
  Sparkles
} from 'lucide-react'
import { ChannelAvatar } from '../ChannelAvatar'
import type { VideoData } from './VideoCard'

interface ShortsPlayerProps {
  videos: VideoData[]
  initialIndex?: number
  onClose?: () => void
}

interface CommentItem {
  id: string
  author: string
  avatar: string
  text: string
  time: string
  likes: number
}

export function ShortsPlayer({ videos, initialIndex = 0, onClose }: ShortsPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [newComment, setNewComment] = useState('')
  const [likeCount, setLikeCount] = useState(0)

  const currentVideo = videos[currentIndex] || videos[0]

  useEffect(() => {
    if (currentVideo) {
      setIsLiked(false)
      setIsDisliked(false)
      setLikeCount(currentVideo.like_count || Math.floor((currentVideo.view_count || 10000) * 0.06))
      
      // Mock initial comments for this Short
      setComments([
        {
          id: '1',
          author: 'Alex Rivera',
          avatar: 'https://ui-avatars.com/api/?name=Alex+Rivera&background=FF0000&color=fff',
          text: 'This short is mind blowing! 🔥',
          time: '2 hours ago',
          likes: 42
        },
        {
          id: '2',
          author: 'Tech Enthusiast',
          avatar: 'https://ui-avatars.com/api/?name=Tech+Enthusiast&background=000000&color=fff',
          text: 'Super helpful explanation, thanks for sharing! 👏',
          time: '5 hours ago',
          likes: 18
        }
      ])
    }
  }, [currentIndex, currentVideo])

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleLikeToggle = () => {
    if (isLiked) {
      setIsLiked(false)
      setLikeCount(prev => Math.max(0, prev - 1))
    } else {
      setIsLiked(true)
      if (isDisliked) setIsDisliked(false)
      setLikeCount(prev => prev + 1)
    }
  }

  const handleDislikeToggle = () => {
    if (isDisliked) {
      setIsDisliked(false)
    } else {
      setIsDisliked(true)
      if (isLiked) {
        setIsLiked(false)
        setLikeCount(prev => Math.max(0, prev - 1))
      }
    }
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    const item: CommentItem = {
      id: Date.now().toString(),
      author: 'You',
      avatar: 'https://ui-avatars.com/api/?name=You&background=FF0000&color=fff',
      text: newComment.trim(),
      time: 'Just now',
      likes: 0
    }
    setComments(prev => [item, ...prev])
    setNewComment('')
  }

  const handleShare = () => {
    const url = `https://www.youtube.com/shorts/${currentVideo?.youtube_id}`
    navigator.clipboard.writeText(url)
    alert('Short link copied to clipboard!')
  }

  if (!currentVideo) return null

  const channelName = currentVideo.channel?.title || currentVideo.author?.title || currentVideo.author?.name || 'YouTube Creator'
  const channelAvatar = currentVideo.channel?.thumbnail_url || currentVideo.author?.image || currentVideo.author?.thumbnail || ''

  return (
    <div className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 select-none overflow-hidden">
      
      {/* Top Close / Mute Header */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-youtube animate-pulse" />
          <span>YouTube Shorts</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(prev => !prev)}
            className="p-3 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 transition-transform hover:scale-105"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-3 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 transition-transform hover:scale-105"
              title="Close Shorts Player"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Reel Container */}
      <div className="relative w-full max-w-[420px] h-full sm:h-[88vh] bg-black sm:rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between">
        
        {/* Embedded YouTube Shorts Video Frame */}
        <div className="absolute inset-0 z-0">
          <iframe
            key={currentVideo.youtube_id}
            src={`https://www.youtube.com/embed/${currentVideo.youtube_id}?autoplay=1&controls=0&loop=1&modestbranding=1&rel=0&mute=${isMuted ? 1 : 0}`}
            title={currentVideo.title}
            className="w-full h-full object-cover border-0 scale-[1.05]"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85 pointer-events-none z-10" />

        {/* Bottom Metadata Overlay (Creator & Title) */}
        <div className="relative z-20 mt-auto p-5 space-y-3.5 text-white pr-16">
          
          {/* Channel Info & Subscribe */}
          <div className="flex items-center gap-3">
            <ChannelAvatar
              title={channelName}
              url={channelAvatar}
              className="w-10 h-10 ring-2 ring-youtube shadow-lg"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate text-white drop-shadow-md">
                @{channelName.replace(/\s+/g, '').toLowerCase()}
              </span>
              <span className="text-[11px] text-white/80 font-medium">Original Audio</span>
            </div>

            <button
              onClick={() => setIsSubscribed(prev => !prev)}
              className={`ml-auto px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1 shrink-0
                ${isSubscribed
                  ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'
                  : 'bg-youtube text-white hover:bg-youtube/90 shadow-youtube/30'
                }`}
            >
              {isSubscribed ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Subscribed</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Subscribe</span>
                </>
              )}
            </button>
          </div>

          {/* Short Title */}
          <p className="text-sm font-semibold leading-snug text-white/95 line-clamp-2 drop-shadow-md">
            {currentVideo.title}
          </p>
        </div>

        {/* Right Action Sidebar Overlay */}
        <div className="absolute right-3 bottom-16 z-30 flex flex-col items-center gap-5 text-white">
          
          {/* Like Button */}
          <button
            onClick={handleLikeToggle}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`p-3 rounded-full backdrop-blur-md transition-all duration-200 transform group-hover:scale-110 ${isLiked ? 'bg-youtube text-white shadow-lg shadow-youtube/40' : 'bg-black/50 text-white border border-white/10 hover:bg-black/70'}`}>
              <ThumbsUp className="w-5 h-5 fill-current" />
            </div>
            <span className="text-xs font-bold drop-shadow-md">{likeCount}</span>
          </button>

          {/* Dislike Button */}
          <button
            onClick={handleDislikeToggle}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`p-3 rounded-full backdrop-blur-md transition-all duration-200 transform group-hover:scale-110 ${isDisliked ? 'bg-white text-black shadow-lg' : 'bg-black/50 text-white border border-white/10 hover:bg-black/70'}`}>
              <ThumbsDown className="w-5 h-5 fill-current" />
            </div>
            <span className="text-xs font-bold drop-shadow-md">Dislike</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => setShowComments(prev => !prev)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border border-white/10 transition-transform group-hover:scale-110">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold drop-shadow-md">{comments.length}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border border-white/10 transition-transform group-hover:scale-110">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold drop-shadow-md">Share</span>
          </button>

        </div>

        {/* Up / Down Navigation Controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 hidden sm:flex flex-col gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-3 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Previous Short"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === videos.length - 1}
            className="p-3 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Next Short"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* Slide-out Comments Drawer */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-0 sm:bottom-auto sm:right-10 w-full sm:w-80 h-96 bg-card border border-border sm:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-card-foreground"
          >
            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="font-bold text-sm">Comments ({comments.length})</span>
              <button
                onClick={() => setShowComments(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comment List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5 text-xs">
                  <img src={c.avatar} alt={c.author} className="w-7 h-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{c.author}</span>
                      <span className="text-[10px] text-muted-foreground">{c.time}</span>
                    </div>
                    <p className="text-muted-foreground leading-snug">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleAddComment} className="p-3 border-t border-border flex items-center gap-2 bg-muted/30">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-card border border-border text-xs focus:outline-none focus:border-youtube"
              />
              <button
                type="submit"
                className="p-2 bg-youtube text-white rounded-xl hover:bg-youtube/90 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
