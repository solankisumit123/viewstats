/**
 * useRealtimeQuery
 *
 * A generic hook that:
 *  1. Fetches data from a Supabase table on mount.
 *  2. Subscribes to postgres_changes (INSERT / UPDATE / DELETE) on that table.
 *  3. Re-fetches automatically whenever the database changes.
 *  4. Returns { data, loading, error, lastUpdated, isLive } so the UI can
 *     display a "LIVE" badge and a "last updated" timestamp.
 *
 * Usage:
 *   const { data, loading, lastUpdated, isLive } = useRealtimeQuery({
 *     table: 'channels',
 *     orderBy: { column: 'subscriber_count', ascending: false },
 *     limit: 8,
 *   })
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export interface RealtimeQueryOptions {
  /** Table name in the public schema */
  table: string
  /** Columns / joins to select (default: '*') */
  select?: string
  /** Optional eq filter */
  filter?: { column: string; value: string | number | boolean }
  /** Optional order */
  orderBy?: { column: string; ascending?: boolean }
  /** Optional row limit */
  limit?: number
  /** Poll interval in ms as fallback when WS is unavailable (default: 30_000) */
  pollInterval?: number
}

export interface RealtimeQueryResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  /** Timestamp of the most recent successful fetch */
  lastUpdated: Date | null
  /** True when the Supabase realtime channel is SUBSCRIBED */
  isLive: boolean
  /** Manually re-fetch */
  refetch: () => Promise<void>
}

export function useRealtimeQuery<T = any>(
  options: RealtimeQueryOptions
): RealtimeQueryResult<T> {
  const {
    table,
    select = '*',
    filter,
    orderBy,
    limit,
    pollInterval = 30_000,
  } = options

  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isLive, setIsLive] = useState(false)

  // Stable ref so the channel callback always uses fresh options
  const optionsRef = useRef(options)
  optionsRef.current = options

  const fetchData = useCallback(async () => {
    const { table, select = '*', filter, orderBy, limit } = optionsRef.current
    try {
      let q = supabase.from(table).select(select)
      if (filter) q = q.eq(filter.column, filter.value) as any
      if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false }) as any
      if (limit) q = q.limit(limit) as any

      const { data: rows, error: err } = await q
      if (err) {
        setError(err.message)
      } else {
        setData((rows as T[]) ?? [])
        setError(null)
        setLastUpdated(new Date())
      }
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let mounted = true
    let pollTimer: ReturnType<typeof setInterval>

    // Initial fetch
    fetchData()

    // Real-time channel
    const channelName = `realtime:${table}:${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        () => {
          if (mounted) fetchData()
        }
      )
      .subscribe((status: string) => {
        if (!mounted) return
        setIsLive(status === 'SUBSCRIBED')
        if (status !== 'SUBSCRIBED') {
          // Fallback: poll every pollInterval ms if WS fails
          pollTimer = setInterval(() => {
            if (mounted) fetchData()
          }, pollInterval)
        }
      })

    return () => {
      mounted = false
      clearInterval(pollTimer)
      supabase.removeChannel(channel)
    }
  }, [table, select, filter?.column, filter?.value, orderBy?.column, limit, pollInterval, fetchData])

  return { data, loading, error, lastUpdated, isLive, refetch: fetchData }
}
