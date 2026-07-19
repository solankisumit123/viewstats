import { useState, useEffect } from 'react'

interface ChannelAvatarProps {
  channelName?: string
  channelAvatarUrl?: string
  channelId?: string // YouTube channel ID (UC...) or handle (@...)
  size?: number
  className?: string
}

// Generate a premium, consistent color theme based on the channel name
function stringToColor(str: string): { bg: string; fg: string } {
  const PALETTES = [
    { bg: 'linear-gradient(135deg, #FF4B2B, #FF416C)', fg: '#FFFFFF' }, // Vibrant Red-Pink
    { bg: 'linear-gradient(135deg, #7F00FF, #E100FF)', fg: '#FFFFFF' }, // Neon Purple
    { bg: 'linear-gradient(135deg, #00c6ff, #0072ff)', fg: '#FFFFFF' }, // Cool Blue
    { bg: 'linear-gradient(135deg, #11998e, #38ef7d)', fg: '#FFFFFF' }, // Emerald Mint
    { bg: 'linear-gradient(135deg, #f21b3f, #ab001c)', fg: '#FFFFFF' }, // Dark Crimson
    { bg: 'linear-gradient(135deg, #fc00ff, #00dbde)', fg: '#FFFFFF' }, // Cyberpunk Magenta
    { bg: 'linear-gradient(135deg, #f12711, #f5af19)', fg: '#FFFFFF' }, // Sunset Orange
    { bg: 'linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)', fg: '#FFFFFF' }, // Pastel Horizon
    { bg: 'linear-gradient(135deg, #1f4068, #162447)', fg: '#FFFFFF' }, // Deep Navy
    { bg: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', fg: '#FFFFFF' }, // Steel Teal
  ]
  if (!str) return PALETTES[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTES[Math.abs(hash) % PALETTES.length]
}

function getInitials(name?: string): string {
  if (!name) return 'Y'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? 'Y'
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

// Optimizes YouTube avatar URL size depending on display size to save bandwidth
function optimizeAvatarUrl(url: string, size: number): string {
  if (!url) return '';
  const targetSize = Math.max(32, Math.min(256, size * 2));
  
  if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
    if (url.includes('=s')) {
      return url.replace(/=s\d+/, `=s${targetSize}`);
    }
    if (url.match(/\/s\d+-c\//)) {
      return url.replace(/\/s\d+-c\//, `/s${targetSize}-c/`);
    }
    return `${url}=s${targetSize}-c`;
  }
  return url;
}

export function ChannelAvatar({
  channelName,
  channelAvatarUrl,
  channelId,
  size = 40,
  className = '',
}: ChannelAvatarProps) {
  const [currentSrc, setCurrentSrc] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [loadFailed, setLoadFailed] = useState(false)

  const initials = getInitials(channelName)
  const colorTheme = stringToColor(channelName || '')
  const fontSize = size >= 48 ? size * 0.36 : size >= 32 ? size * 0.40 : size * 0.44

  // Set initial source URL
  useEffect(() => {
    setIsLoaded(false)
    setLoadFailed(false)
    setRetryCount(0)

    if (channelAvatarUrl) {
      setCurrentSrc(optimizeAvatarUrl(channelAvatarUrl, size))
    } else if (channelId || channelName) {
      fetchFreshUrl()
    } else {
      setLoadFailed(true)
    }
  }, [channelAvatarUrl, channelId, channelName, size])

  // Fetch fresh avatar from backend
  const fetchFreshUrl = async () => {
    const searchId = channelId || channelName || ''
    if (!searchId) return

    try {
      const res = await fetch(`/api/channel-avatar?channelId=${encodeURIComponent(searchId)}&title=${encodeURIComponent(channelName || '')}`)
      if (res.ok) {
        const data = await res.json()
        if (data.avatarUrl) {
          setCurrentSrc(optimizeAvatarUrl(data.avatarUrl, size))
          setLoadFailed(false)
          return
        }
      }
    } catch {
      /* fallback below */
    }

    // Fallback CDN to unavatar / ui-avatars
    const clean = searchId.replace(/^@/, '')
    setCurrentSrc(`https://unavatar.io/youtube/${encodeURIComponent(clean)}`)
    setLoadFailed(false)
  }

  const handleError = () => {
    if (retryCount === 0 && (channelId || channelName)) {
      setRetryCount(1)
      const name = channelName || 'Channel'
      setCurrentSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF0000&color=fff&bold=true`)
      setLoadFailed(false)
    } else {
      setLoadFailed(true)
    }
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 flex items-center justify-center select-none shadow-inner border border-white/10 ${className}`}
      style={{
        width: size,
        height: size,
        background: colorTheme.bg,
        color: colorTheme.fg,
        fontSize,
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}
    >
      {/* 1. Initials Background (Always visible immediately, serves as instant beautiful skeleton) */}
      <span className="absolute transform translate-y-[0.5px]">{initials}</span>

      {/* 2. Real YouTube Logo (Positioned absolutely on top, fades in smoothly when loaded) */}
      {!loadFailed && currentSrc && (
        <img
          src={currentSrc}
          alt={channelName || 'Channel Logo'}
          className={`absolute inset-0 w-full h-full object-cover rounded-full transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  )
}