'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { 
 Save, Loader2, Palette, Layout, Type, 
 Maximize2, Layers, MousePointer2, Check
} from 'lucide-react'

export default function TableEditor() {
 const params = useParams()
 const campeonatoId = params?.id as string
 
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 
 const [settings, setSettings] = useState({
 primary_color: '#7cfc00', // Cor da coluna Pontos
 text_color: '#000000',
 header_bg_color: '#000000',
 header_text_color: '#ffffff',
 row_alt_bg: true,
 row_bg_primary: '#ffffff',
 row_bg_secondary: '#f9f9f9',
 border_width: 2,
 border_color: '#000000',
 row_height: 45,
 default_tab: 'geral'
 })

 useEffect(() => {
 if (campeonatoId) carregarConfiguracoes()
 }, [campeonatoId])

 async function carregarConfiguracoes() {
 setLoading(true)
 try {
 const { data, error } = await supabase
 .from('campeonato_layout')
 .select('*')
 .eq('campeonato_id', campeonatoId)
 .maybeSingle()

 if (data) setSettings(data)
 } catch (err) { console.error(err) } finally { setLoading(false) }
 }

 async function salvarLayout() {
 setSaving(true)
 try {
 await supabase.from('campeonato_layout').upsert({
 campeonato_id: campeonatoId,
 ...settings,
 updated_at: new Date().toISOString()
 })
 alert("Layout atualizado!")
 } catch (err) { alert("Erro ao salvar.") } finally { setSaving(false) }
 }

 if (loading) return <div className="p-10 text-center uppercase font-semibold text-[10px] animate-pulse">Carregando Estilos...</div>

 return (
 <div className="flex flex-col gap-6">
 {/* HEADER DO EDITOR */}
 <div className="flex justify-between items-center bg-white border-4 border-zinc-200 p-4">
 <div>
 <h2 className="text-lg font-semibold uppercase flex items-center gap-2">
 <Palette className="text-[#2563eb]" /> Visual da Tabela & MVP
 </h2>
 </div>
 <button
 onClick={salvarLayout}
 disabled={saving}
 className="bg-[#2563eb] text-[#142340] border-4 border-zinc-200 px-6 py-2 font-semibold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all -[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
 >
 {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
 Salvar Design
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-[10px] font-semibold uppercase">
 
 {/* COLUNAS E CABEÇALHO */}
 <section className="bg-white border border-zinc-200 p-4 space-y-4">
 <h3 className="border-b-2 border-zinc-200 pb-1 flex items-center gap-2"><Layout size={14}/> Cabeçalho e Colunas</h3>
 
 <div className="space-y-3">
 <ColorInput label="Fundo Cabeçalho" value={settings.header_bg_color} onChange={(v) => setSettings({...settings, header_bg_color: v})} />
 <ColorInput label="Texto Cabeçalho" value={settings.header_text_color} onChange={(v) => setSettings({...settings, header_text_color: v})} />
 <ColorInput label="Destaque Coluna Pontos" value={settings.primary_color} onChange={(v) => setSettings({...settings, primary_color: v})} />
 <ColorInput label="Cor Geral dos Textos" value={settings.text_color} onChange={(v) => setSettings({...settings, text_color: v})} />
 </div>
 </section>

 {/* LINHAS E COMPORTAMENTO */}
 <section className="bg-white border border-zinc-200 p-4 space-y-4">
 <h3 className="border-b-2 border-zinc-200 pb-1 flex items-center gap-2"><Layers size={14}/> Linhas da Tabela</h3>
 
 <div className="space-y-4">
 <div className="flex items-center justify-between p-2 bg-zinc-100 border border-zinc-200 cursor-pointer" onClick={() => setSettings({...settings, row_alt_bg: !settings.row_alt_bg})}>
 <span>Cores Alternadas?</span>
 <div className={`w-4 h-4 border border-zinc-200 ${settings.row_alt_bg ? 'bg-[#2563eb]' : 'bg-white'}`} />
 </div>

 <ColorInput label="Fundo Linha Principal" value={settings.row_bg_primary} onChange={(v) => setSettings({...settings, row_bg_primary: v})} />
 {settings.row_alt_bg && (
 <ColorInput label="Fundo Linha Alternada" value={settings.row_bg_secondary} onChange={(v) => setSettings({...settings, row_bg_secondary: v})} />
 )}
 
 <div className="space-y-1">
 <label>Altura das Linhas ({settings.row_height}px)</label>
 <input type="range" min="30" max="80" value={settings.row_height} onChange={(e) => setSettings({...settings, row_height: Number(e.target.value)})} className="w-full accent-black" />
 </div>
 </div>
 </section>

 {/* BORDAS E NAVEGAÇÃO */}
 <section className="bg-white border border-zinc-200 p-4 space-y-4">
 <h3 className="border-b-2 border-zinc-200 pb-1 flex items-center gap-2"><Maximize2 size={14}/> Bordas e Navegação</h3>
 
 <div className="space-y-4">
 <div className="space-y-1">
 <label>Espessura do Traçado ({settings.border_width}px)</label>
 <input type="range" min="0" max="10" value={settings.border_width} onChange={(e) => setSettings({...settings, border_width: Number(e.target.value)})} className="w-full accent-black" />
 </div>
 
 <ColorInput label="Cor do Traçado" value={settings.border_color} onChange={(v) => setSettings({...settings, border_color: v})} />

 <div className="space-y-2 pt-2 border-t-2 border-zinc-100">
 <label className="text-blue-600 flex items-center gap-1"><MousePointer2 size={12}/> Aba Padrão ao Abrir</label>
 <select 
 value={settings.default_tab}
 onChange={(e) => setSettings({...settings, default_tab: e.target.value})}
 className="w-full border border-zinc-200 p-2 bg-white"
 >
 <option value="classificacao">Classificação Geral</option>
 <option value="grupos">Tabela de Grupos</option>
 <option value="mvp">Ranking MVP</option>
 </select>
 </div>
 </div>
 </section>
 </div>

 {/* PREVIEW EM TEMPO REAL */}
 <div className="bg-white border-4 border-zinc-200 p-4">
 <p className="text-[9px] font-semibold mb-2 opacity-50">Preview em Tempo Real:</p>
 <div style={{ borderColor: settings.border_color, borderWidth: settings.border_width }} className="border-solid overflow-hidden">
 <div style={{ backgroundColor: settings.header_bg_color, color: settings.header_text_color, height: '35px' }} className="flex items-center px-4 font-semibold">
 <div className="flex-1">EQUIPE</div>
 <div className="w-12 text-center">B!</div>
 <div className="w-16 text-center" style={{ backgroundColor: settings.primary_color, color: '#000' }}>PONTOS</div>
 </div>
 <div style={{ backgroundColor: settings.row_bg_primary, color: settings.text_color, height: `${settings.row_height}px` }} className="flex items-center px-4 border-t" >
 <div className="flex-1 flex items-center gap-2"><div className="w-6 h-6 bg-zinc-200" /> Equipe Exemplo</div>
 <div className="w-12 text-center text-xs">1</div>
 <div className="w-16 text-center font-semibold">150</div>
 </div>
 </div>
 </div>
 </div>
 )
}

function ColorInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
 return (
 <div className="flex flex-col gap-1">
 <label className="text-[9px] text-zinc-500">{label}</label>
 <div className="flex gap-2">
 <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 border border-zinc-200 cursor-pointer bg-white p-0.5" />
 <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 border border-zinc-200 px-2 text-[10px] uppercase font-mono" />
 </div>
 </div>
 )
}