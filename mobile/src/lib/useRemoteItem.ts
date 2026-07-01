import { useEffect, useState } from 'react'
import { supabase } from './supabase'

type Options = {
  table: string
  id?: string
  select?: string
  fallback: any
  mapRow?: (row: any) => any
}

export function useRemoteItem({ table, id, select = '*', fallback, mapRow }: Options) {
  const [data, setData] = useState<any>(fallback)
  const [usingMock, setUsingMock] = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      if (!supabase || !id) return
      const { data: row, error } = await supabase.from(table).select(select).eq('id', id).maybeSingle()
      if (!alive) return
      if (!error && row) {
        setData(mapRow ? mapRow(row) : row)
        setUsingMock(false)
      } else {
        setUsingMock(true)
      }
    }
    load()
    return () => { alive = false }
  }, [table, id, select, mapRow])

  return { data, usingMock }
}
