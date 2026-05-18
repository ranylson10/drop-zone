'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import FormProdutora from '@/app/components/FormProdutora'

export default function ConfigProdutoraPage() {
 const router = useRouter()

 const [loading, setLoading] = useState(true)
 const [produtora, setProdutora] = useState<any>(null)

 useEffect(() => {
 async function carregarProdutoraAtiva() {
 try {
 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (!user) {
 router.push('/login')
 return
 }

 const idAtivo = localStorage.getItem('perfil_ativo_id')

 if (idAtivo) {
 const { data } = await supabase
 .from('produtoras')
 .select('*')
 .eq('id', idAtivo)
 .eq('dono_id', user.id)
 .maybeSingle()

 if (data) {
 setProdutora(data)
 setLoading(false)
 return
 }
 }

 const { data: primeira } = await supabase
 .from('produtoras')
 .select('*')
 .eq('dono_id', user.id)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 if (!primeira) {
 router.push('/produtora/nova')
 return
 }

 localStorage.setItem('perfil_ativo_id', primeira.id)
 setProdutora(primeira)
 } catch (error) {
 console.error('Erro ao carregar produtora para edição:', error)
 } finally {
 setLoading(false)
 }
 }

 carregarProdutoraAtiva()
 }, [router])

 if (loading) {
 return (
 <div className="flex h-screen items-center justify-center bg-[#f7f7f7]">
 <Loader2 className="animate-spin text-[#2563eb]" size={40} />
 </div>
 )
 }

 if (!produtora) return null

 return (
 <FormProdutora
 mode="edit"
 initialData={{
 id: produtora.id,
 nome: produtora.nome,
 descricao: produtora.descricao,
 logo_url: produtora.logo_url,
 capa_url: produtora.capa_url,
 slug: produtora.slug,
 dono_id: produtora.dono_id,
 whatsapp_suporte: produtora.whatsapp_suporte,
 instagram_url: produtora.instagram_url,
 discord_url: produtora.discord_url,
 }}
 onSuccess={(data) => {
 localStorage.setItem('perfil_ativo_id', data.id)
 router.push(`/produtora/${data.id}`)
 }}
 />
 )
}