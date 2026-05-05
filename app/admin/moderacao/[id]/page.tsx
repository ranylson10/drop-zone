'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CasoPage() {
 const { id } = useParams()
 const supabase = createClient()

 const [caso, setCaso] = useState<any>(null)
 const [mensagem, setMensagem] = useState('')
 const [prova, setProva] = useState('')

 useEffect(() => {
 carregar()
 }, [])

 async function carregar() {
 const { data } = await supabase
 .from('moderacao_casos')
 .select('*')
 .eq('id', id)
 .single()

 setCaso(data)
 }

 async function enviarMensagem() {
 await supabase.from('moderacao_mensagens').insert({
 caso_id: id,
 mensagem
 })
 setMensagem('')
 }

 async function enviarProva() {
 await supabase.from('moderacao_provas').insert({
 caso_id: id,
 arquivo_url: prova
 })
 setProva('')
 }

 async function mudarStatus(status: string) {
 await supabase
 .from('moderacao_casos')
 .update({ status })
 .eq('id', id)

 carregar()
 }

 if (!caso) return <div>Carregando...</div>

 return (
 <div className="p-6">
 <h1 className="text-xl font-bold">{caso.titulo}</h1>
 <p>{caso.descricao}</p>

 <div className="mt-4 flex gap-2">
 <button onClick={() => mudarStatus('em_analise')}>Em análise</button>
 <button onClick={() => mudarStatus('resolvido')}>Resolver</button>
 <button onClick={() => mudarStatus('recusado')}>Recusar</button>
 </div>

 <div className="mt-6">
 <h2>Mensagem</h2>
 <input value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
 <button onClick={enviarMensagem}>Enviar</button>
 </div>

 <div className="mt-6">
 <h2>Prova (URL)</h2>
 <input value={prova} onChange={(e) => setProva(e.target.value)} />
 <button onClick={enviarProva}>Enviar</button>
 </div>
 </div>
 )
}