import React from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from './ThemeProvider'
import {
  Play,
  Sun,
  Moon,
  LayoutDashboard,
  Search
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

  // Sync navbar search input when URL changes
  React.useEffect(() => {
    setSearchQuery(searchParams.get('search') || '')
  }, [searchParams])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanQuery = searchQuery.trim()
    if (cleanQuery) {
      navigate(`/youtube-browser?search=${encodeURIComponent(cleanQuery)}`)
    } else {
      navigate(`/youtube-browser`)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full bg-card/90 backdrop-blur-md border-b border-border shadow-sm">
        {/* Main Row */}
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-youtube flex items-center justify-center shadow-md shadow-youtube/10 group-hover:scale-105 transition-transform duration-200">
              <Play className="w-4.5 h-4.5 text-white fill-current" />
            </div>
            <span className="font-black text-xl tracking-tight transition-colors">
              ViewStats
            </span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm sm:max-w-md mx-2 sm:mx-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search YouTube..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-muted/65 border border-border/80 focus:outline-none focus:ring-2 focus:ring-youtube/40 text-sm transition-all"
            />
          </form>

          {/* Nav Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isActive 
                      ? 'bg-youtube/10 text-youtube' 
                      : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )
            })}

            <div className="w-[1px] h-6 bg-border mx-1 sm:mx-2" />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:py-8">
        {children}
      </main>
    </div>
  )
}

