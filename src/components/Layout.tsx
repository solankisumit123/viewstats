import React from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from './ThemeProvider'
import {
  Play,
  Sun,
  Moon,
  Search,
  Download,
  X,
  Sparkles,
  Menu,
  Mic,
  Bell,
  Home,
  Flame,
  Tv,
  History,
  Clock,
  ThumbsUp,
  Compass,
  Film,
  LayoutDashboard
} from 'lucide-react'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'YouTube Browser', path: '/youtube-browser', icon: <Play className="w-4 h-4 text-youtube fill-current" /> },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [updateInfo, setUpdateInfo] = React.useState<{ updateAvailable: boolean; latestVersion: string; releaseUrl: string } | null>(null)
  const [showBanner, setShowBanner] = React.useState(true)

  // Check for software updates on mount
  React.useEffect(() => {
    fetch('/api/check-update')
      .then(res => res.json())
      .then(data => setUpdateInfo(data))
      .catch(() => {})
  }, [])

  // Fetch search autocomplete suggestions
  React.useEffect(() => {
    const clean = searchQuery.trim()
    if (clean.length >= 2) {
      const timer = setTimeout(() => {
        fetch(`/api/suggestions?q=${encodeURIComponent(clean)}`)
          .then(res => res.json())
          .then(data => setSuggestions(data.suggestions || []))
          .catch(() => setSuggestions([]))
      }, 150)
      return () => clearTimeout(timer)
    } else {
      setSuggestions([])
    }
  }, [searchQuery])

  // Sync navbar search input when URL changes
  React.useEffect(() => {
    setSearchQuery(searchParams.get('search') || '')
  }, [searchParams])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanQuery = searchQuery.trim()
    setShowSuggestions(false)
    if (cleanQuery) {
      navigate(`/youtube-browser?search=${encodeURIComponent(cleanQuery)}`)
    } else {
      navigate(`/youtube-browser`)
    }
  }

  const handleSelectSuggestion = (text: string) => {
    setSearchQuery(text)
    setShowSuggestions(false)
    navigate(`/youtube-browser?search=${encodeURIComponent(text)}`)
  }

  const sidebarLinks = [
    { label: 'Home', path: '/', icon: <Home className="w-5 h-5" /> },
    { label: 'Trending', path: '/youtube-browser', icon: <Flame className="w-5 h-5 text-youtube" /> },
    { label: 'Shorts', path: '/youtube-browser?type=shorts', icon: <Film className="w-5 h-5 text-red-500" /> },
    { label: 'Subscriptions', path: '/youtube-browser?tab=subscriptions', icon: <Tv className="w-5 h-5" /> },
    { label: 'Explore', path: '/youtube-browser?tab=explore', icon: <Compass className="w-5 h-5" /> },
  ]

  const libraryLinks = [
    { label: 'History', path: '/youtube-browser?tab=history', icon: <History className="w-4 h-4" /> },
    { label: 'Watch Later', path: '/youtube-browser?tab=watchlater', icon: <Clock className="w-4 h-4" /> },
    { label: 'Liked Videos', path: '/youtube-browser?tab=liked', icon: <ThumbsUp className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center justify-between gap-4">
          
          {/* Left: Menu & Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-youtube flex items-center justify-center shadow-md shadow-youtube/20 group-hover:scale-105 transition-transform">
                <Play className="w-4 h-4 text-white fill-current translate-x-0.5" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-extrabold text-lg tracking-tight text-foreground">
                  ViewStats
                </span>
                <span className="text-[10px] font-bold text-youtube uppercase tracking-wider">
                  Desktop
                </span>
              </div>
            </Link>
          </div>

          {/* Middle: Authentic YouTube Search Bar */}
          <div className="relative flex-1 max-w-2xl mx-2">
            <form onSubmit={handleSearchSubmit} className="flex items-center w-full">
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  placeholder="Search YouTube..."
                  value={searchQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 rounded-l-full bg-muted/70 border border-border focus:outline-none focus:border-youtube text-sm transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 p-1 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-muted border border-l-0 border-border rounded-r-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectSuggestion('Trending Videos 2025')}
                className="ml-2.5 p-2.5 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden sm:flex"
                title="Search with voice"
              >
                <Mic className="w-4 h-4" />
              </button>
            </form>

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-14 mt-1 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onMouseDown={() => handleSelectSuggestion(item)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3 text-foreground transition-colors"
                  >
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {updateInfo?.updateAvailable && (
              <a
                href={updateInfo.releaseUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-youtube/10 text-youtube hover:bg-youtube hover:text-white transition-all text-xs font-bold animate-pulse"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Update v{updateInfo.latestVersion}</span>
              </a>
            )}

            <button
              className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>

            <div className="w-8 h-8 rounded-full bg-youtube text-white font-bold text-xs flex items-center justify-center shadow-sm ml-1 select-none">
              YT
            </div>
          </div>

        </div>
      </header>

      {/* Top Banner */}
      {updateInfo?.updateAvailable && showBanner && (
        <div className="bg-gradient-to-r from-youtube to-red-700 text-white px-4 py-2.5 flex items-center justify-between shadow-sm">
          <div className="max-w-7xl mx-auto flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold">
            <Sparkles className="w-4 h-4 animate-spin shrink-0" />
            <span>🚀 Software Update Available! ViewStats <strong>v{updateInfo.latestVersion}</strong> is ready.</span>
            <a
              href={updateInfo.releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-2 bg-white text-youtube px-3 py-0.5 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-sm text-xs"
            >
              Download Update
            </a>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Body Layout: Sidebar + Main Content */}
      <div className="flex-1 flex w-full max-w-[1920px] mx-auto">
        
        {/* Authentic Left Sidebar */}
        <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} shrink-0 border-r border-border/60 bg-card/50 transition-all duration-200 hidden md:block select-none sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto scrollbar-hide`}>
          <div className="p-2 space-y-4">
            
            {/* Main Nav Links */}
            <div className="space-y-1">
              {sidebarLinks.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={`flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                      ${isActive ? 'bg-youtube/10 text-youtube font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                    title={item.label}
                  >
                    {item.icon}
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>

            {sidebarOpen && <div className="h-[1px] bg-border/60 my-2" />}

            {/* Library Section */}
            {sidebarOpen && (
              <div className="space-y-1">
                <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Library
                </div>
                {libraryLinks.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="flex items-center gap-4 px-3 py-2 rounded-xl text-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}

          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>

      </div>
    </div>
  )
}

