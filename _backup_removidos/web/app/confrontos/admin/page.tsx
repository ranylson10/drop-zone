'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminConfrontosPage() {
 const [lista, setLista] = useState<any[]>([])

 useEffect(() => {
 carregar()
 }, [])

 async function carregar() {
 const { data: userData } = await supabase.auth.getUser()
 const uid = userData.user?.id

 if (!uid) return

 const { data } = await supabase
 .from('confrontos_admins')
 .select(`
 confronto_id,
 confrontos_apostados (
 id,
 titulo,
 status,
 valor_por_lado
 )
 `)
 .eq('admin_user_id', uid)

 setLista(data || [])
 }

 return (
 <div className="p-10">
 <h1 className="text-2xl font-semibold mb-6">Admin - Confrontos</h1>

 {lista.map((item) => (
 <Link
 key={item.confronto_id}
 href={`/confrontos/admin/${item.confronto_id}`}
 className="block border p-4 rounded mb-3 bg-white"
 >
 <p className="font-bold">
 {item.confrontos_apostados?.titulo}
 </p>
 <p className="text-sm text-zinc-500">
 R$ {item.confrontos_apostados?.valor_por_lado}
 </p>
 </Link>
 ))}
 </div>
 )
}