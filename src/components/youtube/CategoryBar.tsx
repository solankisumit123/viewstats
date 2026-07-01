import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  TrendingUp, Music, Film, Trophy, Newspaper, GraduationCap,
  Cpu, BrainCircuit, Code2, DollarSign, Bitcoin, Briefcase,
  Smile, Sparkles, Globe, UtensilsCrossed, Shirt, Heart,
  Dumbbell, Baby, PawPrint, FlaskConical, BookOpen, FileVideo,
  Clapperboard, Radio, Mic2, Car, Camera, Leaf, CookingPot,
  Wrench, Gamepad2, Palette
} from 'lucide-react'

export const CATEGORIES = [
  { id: 'trending',      name: 'Trending',       icon: TrendingUp,      query: 'trending 2024' },
  { id: 'gaming',        name: 'Gaming',          icon: Gamepad2,        query: 'gaming' },
  { id: 'music',         name: 'Music',           icon: Music,           query: 'music' },
  { id: 'movies',        name: 'Movies',          icon: Film,            query: 'movies trailer' },
  { id: 'sports',        name: 'Sports',          icon: Trophy,          query: 'sports highlights' },
  { id: 'news',          name: 'News',            icon: Newspaper,       query: 'news today' },
  { id: 'education',     name: 'Education',       icon: GraduationCap,   query: 'education learning' },
  { id: 'technology',    name: 'Technology',      icon: Cpu,             query: 'technology 2024' },
  { id: 'ai',            name: 'AI',              icon: BrainCircuit,    query: 'artificial intelligence AI' },
  { id: 'programming',   name: 'Programming',     icon: Code2,           query: 'programming tutorial' },
  { id: 'finance',       name: 'Finance',         icon: DollarSign,      query: 'finance investing' },
  { id: 'crypto',        name: 'Crypto',          icon: Bitcoin,         query: 'cryptocurrency bitcoin' },
  { id: 'business',      name: 'Business',        icon: Briefcase,       query: 'business entrepreneurship' },
  { id: 'comedy',        name: 'Comedy',          icon: Smile,           query: 'comedy funny' },
  { id: 'entertainment', name: 'Entertainment',   icon: Sparkles,        query: 'entertainment' },
  { id: 'travel',        name: 'Travel',          icon: Globe,           query: 'travel vlog' },
  { id: 'food',          name: 'Food',            icon: UtensilsCrossed, query: 'food recipe' },
  { id: 'fashion',       name: 'Fashion',         icon: Shirt,           query: 'fashion style' },
  { id: 'beauty',        name: 'Beauty',          icon: Heart,           query: 'beauty makeup' },
  { id: 'health',        name: 'Health',          icon: Heart,           query: 'health wellness' },
  { id: 'fitness',       name: 'Fitness',         icon: Dumbbell,        query: 'fitness workout' },
  { id: 'kids',          name: 'Kids',            icon: Baby,            query: 'kids educational' },
  { id: 'pets',          name: 'Pets',            icon: PawPrint,        query: 'pets animals' },
  { id: 'science',       name: 'Science',         icon: FlaskConical,    query: 'science experiment' },
  { id: 'history',       name: 'History',         icon: BookOpen,        query: 'history documentary' },
  { id: 'documentary',   name: 'Documentary',     icon: FileVideo,       query: 'documentary' },
  { id: 'animation',     name: 'Animation',       icon: Clapperboard,    query: 'animation cartoon' },
  { id: 'live',          name: 'Live Streams',    icon: Radio,           query: 'live stream' },
  { id: 'podcasts',      name: 'Podcasts',        icon: Mic2,            query: 'podcast interview' },
  { id: 'cars',          name: 'Cars',            icon: Car,             query: 'cars automotive' },
  { id: 'photography',   name: 'Photography',     icon: Camera,          query: 'photography camera' },
  { id: 'nature',        name: 'Nature',          icon: Leaf,            query: 'nature wildlife' },
  { id: 'cooking',       name: 'Cooking',         icon: CookingPot,      query: 'cooking recipe' },
  { id: 'diy',           name: 'DIY',             icon: Wrench,          query: 'DIY tutorial' },
  { id: 'art',           name: 'Art',             icon: Palette,         query: 'art drawing' },
]

interface CategoryBarProps {
  selected: string
  onSelect: (id: string) => void
}

export function CategoryBar({ selected, onSelect }: CategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' })
  }

  return (
    <div className="relative flex items-center gap-1">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className="hidden lg:flex shrink-0 w-8 h-8 items-center justify-center rounded-full bg-card border border-border hover:bg-muted transition-colors z-10 shadow-sm"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-0.5 flex-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const isActive = selected === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`
                flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold
                whitespace-nowrap border transition-all duration-200 shrink-0
                ${isActive
                  ? 'bg-foreground text-background border-foreground shadow-md scale-105'
                  : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground hover:bg-muted'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className="hidden lg:flex shrink-0 w-8 h-8 items-center justify-center rounded-full bg-card border border-border hover:bg-muted transition-colors z-10 shadow-sm"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
