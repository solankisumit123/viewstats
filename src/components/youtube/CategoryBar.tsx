import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  TrendingUp, Music, Film, Trophy, Newspaper, GraduationCap,
  Cpu, BrainCircuit, Code2, DollarSign, Bitcoin, Briefcase,
  Smile, Sparkles, Globe, UtensilsCrossed, Shirt, Heart,
  Dumbbell, Baby, PawPrint, FlaskConical, BookOpen, FileVideo,
  Clapperboard, Radio, Mic2, Car, Camera, Leaf, CookingPot,
  Wrench, Gamepad2, Palette, Clock
} from 'lucide-react'

export const CATEGORIES = [
  { id: 'trending',      name: 'Trending',       icon: TrendingUp      },
  { id: 'gaming',        name: 'Gaming',          icon: Gamepad2        },
  { id: 'music',         name: 'Music',           icon: Music           },
  { id: 'movies',        name: 'Movies',          icon: Film            },
  { id: 'sports',        name: 'Sports',          icon: Trophy          },
  { id: 'news',          name: 'News',            icon: Newspaper       },
  { id: 'education',     name: 'Education',       icon: GraduationCap   },
  { id: 'technology',    name: 'Technology',      icon: Cpu             },
  { id: 'ai',            name: 'AI',              icon: BrainCircuit    },
  { id: 'programming',   name: 'Programming',     icon: Code2           },
  { id: 'finance',       name: 'Finance',         icon: DollarSign      },
  { id: 'crypto',        name: 'Crypto',          icon: Bitcoin         },
  { id: 'business',      name: 'Business',        icon: Briefcase       },
  { id: 'comedy',        name: 'Comedy',          icon: Smile           },
  { id: 'entertainment', name: 'Entertainment',   icon: Sparkles        },
  { id: 'travel',        name: 'Travel',          icon: Globe           },
  { id: 'food',          name: 'Food',            icon: UtensilsCrossed },
  { id: 'fashion',       name: 'Fashion',         icon: Shirt           },
  { id: 'beauty',        name: 'Beauty',          icon: Heart           },
  { id: 'health',        name: 'Health',          icon: Heart           },
  { id: 'fitness',       name: 'Fitness',         icon: Dumbbell        },
  { id: 'kids',          name: 'Kids',            icon: Baby            },
  { id: 'pets',          name: 'Pets',            icon: PawPrint        },
  { id: 'science',       name: 'Science',         icon: FlaskConical    },
  { id: 'history',       name: 'History',         icon: BookOpen        },
  { id: 'documentary',   name: 'Documentary',     icon: FileVideo       },
  { id: 'animation',     name: 'Animation',       icon: Clapperboard    },
  { id: 'live',          name: 'Live Streams',    icon: Radio           },
  { id: 'podcasts',      name: 'Podcasts',        icon: Mic2            },
  { id: 'cars',          name: 'Cars',            icon: Car             },
  { id: 'photography',   name: 'Photography',     icon: Camera          },
  { id: 'nature',        name: 'Nature',          icon: Leaf            },
  { id: 'cooking',       name: 'Cooking',         icon: CookingPot      },
  { id: 'diy',           name: 'DIY',             icon: Wrench          },
  { id: 'art',           name: 'Art',             icon: Palette         },
  { id: 'watch-later',   name: 'Watch Later',     icon: Clock           },
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
