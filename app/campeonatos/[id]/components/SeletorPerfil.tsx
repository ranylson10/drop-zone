'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, Shuffle, Loader2, Plus, Minus, CheckCircle2 } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

const MAPAS_INICIAIS = [
 { id: 'Bermuda', nome: 'Bermuda', url: '/mapas/bermuda.jpg' },
 { id: 'Purgatório', nome: 'Purgatório', url: '/mapas/purgatorio.jpg' },
 { id: 'Kalahari', nome: 'Kalahari', url: '/mapas/kalahari.jpg' },
 { id: 'Alpes', nome: 'Alpes', url: '/mapas/alpes.jpg' },
 { id: 'Nova Terra', nome: 'Nova Terra', url: '/mapas/nova-terra.jpg' },
 { id: 'Solara', nome: 'Solara', url: '/mapas/solara.jpg' }
]

export default function SorteadorMapas({ campeonatoId, aoFinalizar }: { campeonatoId: string, aoFinalizar: () => void }) {
 const searchParams = useSearchParams()
 const router = useRouter()
 
 // Captura dados do bloco via URL (enviados pelo GerenciarJogos)
 const blocoId = searchParams.get('bloco')
 const nomeBloco = searchParams.get('nome')
 const qtdInicial = parseInt(searchParams.get('qtd') || '5')

 const [mapas, setMapas] = useState(MAPAS_INICIAIS)
 const [qtdQuedas, setQtdQuedas] = useState(qtdInicial)
 const [carregando, setCarregando] = useState(false)
 const [uploadingId, setUploadingId] = useState<string | null>(null)
 const [concluido, setConcluido] = useState(false)

 const handleUploadImg = async (e: React.ChangeEvent<HTMLInputElement>, mapaId: string) => {
 const file = e.target.files?.[0]
 if (!file || !campeonatoId) return

 setUploadingId(mapaId)
 try {
 const fileExt = file.name.split('.').pop()
 const fileName = `${campeonatoId}/mapa_${mapaId}_${Date.now()}.${fileExt}`
 const filePath = `mapas_personalizados/${fileName}`

 const { error: uploadError } = await supabase.storage
 .from('campeonatos')
 .upload(filePath, file)

 if (uploadError) throw uploadError

 const { data: { publicUrl } } = supabase.storage
 .from('campeonatos')
 .getPublicUrl(filePath)

 setMapas(prev => prev.map(m => m.id === mapaId ? { ...m, url: publicUrl } : m))
 } catch (error) {
 console.error('Erro no upload:', error)
 alert('Falha ao carregar imagem personalizada.')
 } finally {
 setUploadingId(null)
 }
 }

 const handleSorteioReal = async () => {
 if (!blocoId) {
 alert("Erro: ID do Bloco não encontrado.")
 return
 }

 setCarregando(true)
 try {
 // 1. Algoritmo de Sorteio (Seleção Aleatória)
 // Criamos uma lista baseada nos mapas disponíveis, permitindo repetição se houver mais quedas que mapas
 let poolMapas = [...mapas]
 const listaFinal: string[] = []

 for (let i = 0; i < qtdQuedas; i++) {
 if (poolMapas.length === 0) poolMapas = [...mapas] // Reset pool se esgotar
 const indexAleatorio = Math.floor(Math.random() * poolMapas.length)
 listaFinal.push(poolMapas[indexAleatorio].id)
 poolMapas.splice(indexAleatorio, 1) // Remove para não repetir na mesma rodada (se possível)
 }

 // 2. Buscar as quedas existentes deste bloco no banco
 const { data: quedasAtuais, error: fetchError } = await supabase
 .from('jogos')
 .select('id')
 .eq('bloco_id', blocoId)
 .order('nome_jogo', { ascending: true })

 if (fetchError) throw fetchError

 // 3. Atualizar cada jogo com o mapa sorteado
 const promises = quedasAtuais.map((jogo, index) => {
 return supabase
 .from('jogos')
 .update({ 
 mapa: listaFinal[index] || 'Bermuda',
 metodo_selecao: 'sorteado'
 })
 .eq('id', jogo.id)
 })

 await Promise.all(promises)
 
 setConcluido(true)
 setTimeout(() => {
 aoFinalizar()
 }, 1500)

 } catch (error) {
 console.error("Erro ao salvar sorteio:", error)
 alert("Erro ao sincronizar sorteio com o banco de dados.")
 } finally {
 setCarregando(false)
 }
 }

 return (
 <div className="w-full bg-white border border-zinc-200 overflow-hidden ">
 {/* Header */}
 <div className="p-8 border-b border-zinc-200 flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-orange-600/10 to-transparent gap-4">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <Shuffle size={16} className="text-orange-500" />
 <h2 className="text-2xl font-semibold text-[#142340] uppercase tracking-tighter ">Sorteador Inteligente</h2>
 </div>
 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
 Configurando: <span className="text-[#142340]">{nomeBloco || 'Bloco de Jogos'}</span>
 </p>
 </div>

 <div className="flex items-center gap-4 bg-white/40 p-3 border border-zinc-200">
 <button 
 onClick={() => setQtdQuedas(Math.max(1, qtdQuedas - 1))} 
 className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-50 text-zinc-500 hover:text-orange-500 transition-all"
 >
 <Minus size={20} />
 </button>
 <div className="flex flex-col items-center min-w-[60px]">
 <span className="text-[9px] font-semibold text-zinc-500 uppercase mb-1">Quedas</span>
 <span className="text-2xl font-semibold text-[#142340] leading-none">{qtdQuedas}</span>
 </div>
 <button 
 onClick={() => setQtdQuedas(Math.min(12, qtdQuedas + 1))} 
 className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-50 text-zinc-500 hover:text-orange-500 transition-all"
 >
 <Plus size={20} />
 </button>
 </div>
 </div>

 {/* Grid de Mapas */}
 <div className="p-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
 {mapas.map((mapa) => (
 <div key={mapa.id} className="group relative">
 <div className="aspect-[4/5] overflow-hidden border border-zinc-200 group-hover:border-orange-500/50 transition-all bg-white relative">
 <img 
 src={mapa.url} 
 alt={mapa.nome} 
 className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-700 scale-110 group-hover:scale-100" 
 />
 
 <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
 {uploadingId === mapa.id ? (
 <Loader2 className="animate-spin text-orange-500" size={28} />
 ) : (
 <>
 <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center mb-2 -orange-600/20">
 <Upload size={20} className="text-[#142340]" />
 </div>
 <span className="text-[10px] font-semibold text-[#142340] uppercase tracking-widest">Customizar</span>
 </>
 )}
 <input 
 type="file" 
 className="hidden" 
 accept="image/*" 
 onChange={(e) => handleUploadImg(e, mapa.id)} 
 />
 </label>

 <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/40 to-transparent">
 <p className="text-xs font-semibold text-[#142340] uppercase text-center tracking-tighter ">
 {mapa.nome}
 </p>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Footer / Ação */}
 <div className="p-8 bg-white/40 border-t border-zinc-200">
 <button
 onClick={handleSorteioReal}
 disabled={carregando || concluido}
 className={`w-full py-5 font-semibold uppercase flex items-center justify-center gap-3 transition-all relative overflow-hidden group ${
 concluido 
 ? 'bg-green-600 text-[#142340]' 
 : 'bg-orange-600 hover:bg-orange-500 text-[#142340] disabled:bg-zinc-800 disabled:text-zinc-600'
 }`}
 >
 {carregando ? (
 <Loader2 className="animate-spin" size={24} />
 ) : concluido ? (
 <>
 <CheckCircle2 size={24} className="animate-bounce" />
 <span>Sorteio Sincronizado com Sucesso!</span>
 </>
 ) : (
 <>
 <Shuffle size={20} className="group-hover:rotate-180 transition-transform duration-700" />
 <span className="tracking-widest">Sortear e Atualizar Cronograma</span>
 </>
 )}
 </button>
 
 <p className="text-center mt-4 text-[9px] text-zinc-600 font-bold uppercase tracking-[0.4em]">
 Este sorteio substituirá os mapas atuais do bloco <span className="text-zinc-500">{nomeBloco}</span>
 </p>
 </div>
 </div>
 )
}