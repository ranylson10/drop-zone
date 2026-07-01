import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'

type Options = {
  table: string | string[]
  select?: string
  order?: string
  limit?: number
  fallback: any[]
  mapRow?: (row: any) => any
}

export function useRemoteList({ table, select = '*', order = 'created_at', limit = 30, fallback, mapRow }: Options) {
  const [data, setData] = useState<any[]>(fallback)
  const [loading, setLoading] = useState(false)
  const [usingMock, setUsingMock] = useState(!isSupabaseConfigured)

  useEffect(() => {
    let alive = true
    async function load() {
      if (!supabase) return
      setLoading(true)
      const tables = Array.isArray(table) ? table : [table]
      let rows: any[] | null = null

      for (const tableName of tables) {
        const ordered = await supabase.from(tableName).select(select).order(order, { ascending: false }).limit(limit)
        if (!ordered.error && ordered.data?.length) {
          rows = ordered.data
          break
        }

        const unordered = await supabase.from(tableName).select(select).limit(limit)
        if (!unordered.error && unordered.data?.length) {
          rows = unordered.data
          break
        }
      }

      if (!alive) return
      if (rows && rows.length) {
        setData(mapRow ? rows.map(mapRow) : rows)
        setUsingMock(false)
      } else {
        setUsingMock(true)
      }
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [JSON.stringify(table), select, order, limit, mapRow])

  return { data, loading, usingMock }
}
