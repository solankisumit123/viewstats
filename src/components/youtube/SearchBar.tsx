import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, SlidersHorizontal, Clock, TrendingUp, Radio, Zap, MonitorPlay
} from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (val: string) => void
  onFilterChange?: (filters: SearchFilters) => void
  onClear?: () => void
}

export interface SearchFilters {
  sort: 'relevance' | 'newest' | 'oldest' | 'views'
  duration: 'any' | 'short' | 'medium' | 'long'
  type: 'all' | 'live' | 'hd' | '4k' | 'shorts'
}

const DEFAULT_FILTERS: SearchFilters = {
  sort: 'relevance',
  duration: 'any',
  type: 'all',
}

export function SearchBar({ value, onChange, onFilterChange, onClear }: SearchBarProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch suggestions
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(value)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions || [])
        }
      } catch {
        setSuggestions([])
      }
    }, 250)
    return () => clearTimeout(t)
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
        setShowFilters(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const applyFilter = (patch: Partial<SearchFilters>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    onFilterChange?.(next)
  }

  const activeFilterCount = [
    filters.sort !== 'relevance',
    filters.duration !== 'any',
    filters.type !== 'all',
  ].filter(Boolean).length

  return (
    <div ref={containerRef} className="relative w-full sm:w-96">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground z-10" />
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search YouTube..."
          className="w-full pl-9 pr-20 py-2.5 rounded-xl bg-card border border-input focus:outline-none focus:ring-2 focus:ring-youtube/40 text-sm transition-all"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button
              onClick={() => { onChange(''); onClear?.(); setSuggestions([]); inputRef.current?.focus() }}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`p-1.5 rounded-md transition-colors relative ${showFilters || activeFilterCount > 0 ? 'bg-youtube/10 text-youtube' : 'hover:bg-muted text-muted-foreground'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-youtube text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && value.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onMouseDown={() => { onChange(s); setShowSuggestions(false) }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-sm transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{s}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-xl p-4 space-y-4"
          >
            {/* Sort */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sort By</div>
              <div className="flex flex-wrap gap-1.5">
                {([['relevance', 'Relevance', Search], ['newest', 'Newest', Clock], ['views', 'Most Viewed', TrendingUp]] as const).map(([val, label, Icon]) => (
                  <button
                    key={val}
                    onClick={() => applyFilter({ sort: val })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${filters.sort === val ? 'bg-youtube text-white border-youtube' : 'border-border hover:border-youtube/40'}`}
                  >
                    <Icon className="w-3 h-3" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Duration</div>
              <div className="flex flex-wrap gap-1.5">
                {(['any', 'short', 'medium', 'long'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => applyFilter({ duration: d })}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${filters.duration === d ? 'bg-youtube text-white border-youtube' : 'border-border hover:border-youtube/40'}`}
                  >
                    {d === 'any' ? 'Any' : d === 'short' ? '< 4 min' : d === 'medium' ? '4–20 min' : '> 20 min'}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Type</div>
              <div className="flex flex-wrap gap-1.5">
                {([['all', 'All', MonitorPlay], ['live', 'Live', Radio], ['hd', 'HD', MonitorPlay], ['shorts', 'Shorts', Zap]] as const).map(([val, label, Icon]) => (
                  <button
                    key={val}
                    onClick={() => applyFilter({ type: val })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${filters.type === val ? 'bg-youtube text-white border-youtube' : 'border-border hover:border-youtube/40'}`}
                  >
                    <Icon className="w-3 h-3" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilters(DEFAULT_FILTERS); onFilterChange?.(DEFAULT_FILTERS) }}
                className="text-xs text-youtube hover:underline"
              >
                Reset all filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
