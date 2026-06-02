'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { 
 Save, Loader2, Palette, Layout,
 Maximize2, Layers, MousePointer2, Upload, X
} from 'lucide-react'

const DEFAULT_SETTINGS = {
 primary_color: '#7cfc00',
 text_color: '#000000',
 header_bg_color: '#000000',
 header_text_color: '#ffffff',
 row_alt_bg: true,
 row_bg_primary: '#ffffff',
 row_bg_secondary: '#f9f9f9',
 border_width: 2,
 border_color: '#000000',
 row_height: 45,
 default_tab: 'geral',
 table_width: 100,
 column_widths: {
 pos: 52,
 equipe: 360,
 grupo: 70,
 quedas: 56,
 booyah: 56,
 kill: 70,
 total: 96,
 mvp_logo: 72,
 mvp_foto: 72,
 mvp_nick: 300,
 mvp_bandeira: 86,
 mvp_funcao: 78,
 mvp_kd: 78,
 },
 row_bg_image_url: '',
 row_bg_image_opacity: 100,
}

function pickLayoutSettings(data: any) {
 return {
 primary_color: data?.primary_color ?? DEFAULT_SETTINGS.primary_color,
 text_color: data?.text_color ?? DEFAULT_SETTINGS.text_color,
 header_bg_color: data?.header_bg_color ?? DEFAULT_SETTINGS.header_bg_color,
 header_text_color: data?.header_text_color ?? DEFAULT_SETTINGS.header_text_color,
 row_alt_bg: data?.row_alt_bg ?? DEFAULT_SETTINGS.row_alt_bg,
 row_bg_primary: data?.row_bg_primary ?? DEFAULT_SETTINGS.row_bg_primary,
 row_bg_secondary: data?.row_bg_secondary ?? DEFAULT_SETTINGS.row_bg_secondary,
 border_width: Number(data?.border_width ?? DEFAULT_SETTINGS.border_width),
 border_color: data?.border_color ?? DEFAULT_SETTINGS.border_color,
 row_height: Number(data?.row_height ?? DEFAULT_SETTINGS.row_height),
 default_tab: data?.default_tab ?? DEFAULT_SETTINGS.default_tab,
 table_width: Number(data?.table_width ?? DEFAULT_SETTINGS.table_width),
 column_widths: {
 ...DEFAULT_SETTINGS.column_widths,
 ...(data?.column_widths && typeof data.column_widths === 'object' ? data.column_widths : {}),
 },
 row_bg_image_url: data?.row_bg_image_url ?? DEFAULT_SETTINGS.row_bg_image_url,
 row_bg_image_opacity: Number(data?.row_bg_image_opacity ?? DEFAULT_SETTINGS.row_bg_image_opacity),
 }
}

export default function TableEditor({ canEdit = false }: { canEdit?: boolean } = {}) {
 const params = useParams()
 const campeonatoId = params?.id as string
 
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [uploadingBg, setUploadingBg] = useState(false)
 
 const [settings, setSettings] = useState(DEFAULT_SETTINGS)

 function setColumnWidth(key: string, value: number) {
 setSettings({
 ...settings,
 column_widths: {
 ...settings.column_widths,
 [key]: value,
 },
 })
 }

 async function uploadRowBackground(event: React.ChangeEvent<HTMLInputElement>) {
 const file = event.currentTarget.files?.[0]
 if (!file || !campeonatoId) return

 setUploadingBg(true)
 try {
 const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
 const fileName = `${campeonatoId}/table-rows/${Date.now()}.${ext}`
 const { error } = await supabase.storage.from('avatars').upload(fileName, file, {
 upsert: true,
 cacheControl: '3600',
 contentType: file.type || undefined,
 })
 if (error) throw error

 const {
 data: { publicUrl },
 } = supabase.storage.from('avatars').getPublicUrl(fileName)

 setSettings({ ...settings, row_bg_image_url: publicUrl })
 } catch (error: any) {
 alert(error?.message || 'Erro ao enviar imagem de fundo.')
 } finally {
 setUploadingBg(false)
 event.currentTarget.value = ''
 }
 }

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
 .order('updated_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 if (error) {
 console.error('Erro ao carregar layout:', {
 message: error.message,
 details: error.details,
 hint: error.hint,
 code: error.code,
 })
 setSettings(DEFAULT_SETTINGS)
 return
 }

 setSettings(pickLayoutSettings(data))
 } catch (err) {
 console.error('Erro inesperado ao carregar layout:', err)
 setSettings(DEFAULT_SETTINGS)
 } finally {
 setLoading(false)
 }
 }

 async function salvarLayout() {
 if (!campeonatoId) return alert('Campeonato não encontrado.')

 setSaving(true)
 try {
 const payload = {
 campeonato_id: campeonatoId,
 ...pickLayoutSettings(settings),
 updated_at: new Date().toISOString(),
 }

 const { data: existente, error: findError } = await supabase
 .from('campeonato_layout')
 .select('id')
 .eq('campeonato_id', campeonatoId)
 .order('updated_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 if (findError) {
 console.error('Erro ao buscar layout existente:', {
 message: findError.message,
 details: findError.details,
 hint: findError.hint,
 code: findError.code,
 })
 throw findError
 }

 if (existente?.id) {
 const { error: updateError } = await supabase
 .from('campeonato_layout')
 .update(payload)
 .eq('id', existente.id)

 if (updateError) {
 console.error('Erro ao atualizar layout:', {
 message: updateError.message,
 details: updateError.details,
 hint: updateError.hint,
 code: updateError.code,
 })
 throw updateError
 }
 } else {
 const { error: insertError } = await supabase
 .from('campeonato_layout')
 .insert([payload])

 if (insertError) {
 console.error('Erro ao inserir layout:', {
 message: insertError.message,
 details: insertError.details,
 hint: insertError.hint,
 code: insertError.code,
 })
 throw insertError
 }
 }

 setSettings(pickLayoutSettings(payload))
 alert('Layout atualizado!')
 } catch (err: any) {
 alert(err?.message || 'Erro ao salvar layout.')
 } finally {
 setSaving(false)
 }
 }

 if (loading) return <div className="p-10 text-center uppercase font-semibold text-[10px] animate-pulse">Carregando Estilos...</div>

 if (!canEdit) {
  return (
   <div className="border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Ajuste manual bloqueado</div>
    <p className="mt-2 leading-6">A tabela pode ser visualizada, mas editar layout e ajustes manuais é permitido apenas para o dono do campeonato ou ajudantes autorizados.</p>
   </div>
  )
 }

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

 <div className="space-y-2 border-t border-zinc-100 pt-3">
 <label className="text-[9px] text-zinc-500">Imagem de Fundo das Linhas</label>
 <div className="flex flex-wrap gap-2">
 <label className="inline-flex cursor-pointer items-center gap-2 border border-zinc-200 px-3 py-2 text-[9px] font-semibold uppercase">
 {uploadingBg ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
 Enviar Imagem
 <input type="file" accept="image/*" className="hidden" onChange={uploadRowBackground} />
 </label>
 {settings.row_bg_image_url ? (
 <button
 type="button"
 onClick={() => setSettings({ ...settings, row_bg_image_url: '' })}
 className="inline-flex items-center gap-2 border border-red-200 px-3 py-2 text-[9px] font-semibold uppercase text-red-600"
 >
 <X size={13} />
 Remover
 </button>
 ) : null}
 </div>
 {settings.row_bg_image_url ? (
 <div className="h-16 overflow-hidden border border-zinc-200 bg-zinc-100">
 <img src={settings.row_bg_image_url} alt="" className="h-full w-full object-cover" />
 </div>
 ) : null}
 <div className="space-y-1">
 <label>Intensidade da Imagem ({settings.row_bg_image_opacity}%)</label>
 <input type="range" min="0" max="100" value={settings.row_bg_image_opacity} onChange={(e) => setSettings({...settings, row_bg_image_opacity: Number(e.target.value)})} className="w-full accent-black" />
 </div>
 </div>
 
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

 <NumberInput label="Largura Total da Tabela (%)" value={settings.table_width} min={55} max={100} onChange={(v) => setSettings({...settings, table_width: v})} />

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

 <section className="bg-white border border-zinc-200 p-4 space-y-4 lg:col-span-3">
 <h3 className="border-b-2 border-zinc-200 pb-1 flex items-center gap-2"><Layout size={14}/> Largura das Colunas</h3>
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
 <NumberInput label="Pos" value={settings.column_widths.pos} min={36} max={120} onChange={(v) => setColumnWidth('pos', v)} />
 <NumberInput label="Equipe" value={settings.column_widths.equipe} min={180} max={620} onChange={(v) => setColumnWidth('equipe', v)} />
 <NumberInput label="Grupo" value={settings.column_widths.grupo} min={46} max={140} onChange={(v) => setColumnWidth('grupo', v)} />
 <NumberInput label="Quedas" value={settings.column_widths.quedas} min={42} max={120} onChange={(v) => setColumnWidth('quedas', v)} />
 <NumberInput label="Booyah" value={settings.column_widths.booyah} min={42} max={120} onChange={(v) => setColumnWidth('booyah', v)} />
 <NumberInput label="Kill" value={settings.column_widths.kill} min={46} max={140} onChange={(v) => setColumnWidth('kill', v)} />
 <NumberInput label="Total" value={settings.column_widths.total} min={58} max={180} onChange={(v) => setColumnWidth('total', v)} />
 <NumberInput label="MVP Logo" value={settings.column_widths.mvp_logo} min={48} max={140} onChange={(v) => setColumnWidth('mvp_logo', v)} />
 <NumberInput label="MVP Foto" value={settings.column_widths.mvp_foto} min={48} max={140} onChange={(v) => setColumnWidth('mvp_foto', v)} />
 <NumberInput label="MVP Nick" value={settings.column_widths.mvp_nick} min={160} max={620} onChange={(v) => setColumnWidth('mvp_nick', v)} />
 <NumberInput label="Bandeira" value={settings.column_widths.mvp_bandeira} min={56} max={150} onChange={(v) => setColumnWidth('mvp_bandeira', v)} />
 <NumberInput label="Função" value={settings.column_widths.mvp_funcao} min={54} max={140} onChange={(v) => setColumnWidth('mvp_funcao', v)} />
 <NumberInput label="MVP K.D" value={settings.column_widths.mvp_kd} min={54} max={140} onChange={(v) => setColumnWidth('mvp_kd', v)} />
 </div>
 </section>
 </div>

 {/* PREVIEW EM TEMPO REAL */}
 <div className="bg-white border-4 border-zinc-200 p-4">
 <p className="text-[9px] font-semibold mb-2 opacity-50">Preview em Tempo Real:</p>
 <div style={{ borderColor: settings.border_color, borderWidth: settings.border_width, width: `${settings.table_width}%` }} className="border-solid overflow-hidden">
 <div style={{ backgroundColor: settings.header_bg_color, color: settings.header_text_color, height: '35px' }} className="flex items-center px-4 font-semibold">
 <div style={{ width: settings.column_widths.equipe }}>EQUIPE</div>
 <div className="text-center" style={{ width: settings.column_widths.booyah }}>B!</div>
 <div className="text-center" style={{ width: settings.column_widths.total, backgroundColor: settings.primary_color, color: '#000' }}>PONTOS</div>
 </div>
 <div
 style={{
 backgroundColor: settings.row_bg_primary,
 color: settings.text_color,
 height: `${settings.row_height}px`,
 backgroundImage: settings.row_bg_image_url ? `url(${settings.row_bg_image_url})` : undefined,
 backgroundSize: 'cover',
 backgroundPosition: 'center',
 opacity: settings.row_bg_image_url ? Math.max(0.2, settings.row_bg_image_opacity / 100) : 1,
 }}
 className="flex items-center px-4 border-t"
 >
 <div style={{ width: settings.column_widths.equipe }} className="flex items-center gap-2"><div className="w-6 h-6 bg-zinc-200" /> Equipe Exemplo</div>
 <div className="text-center text-xs" style={{ width: settings.column_widths.booyah }}>1</div>
 <div className="text-center font-semibold" style={{ width: settings.column_widths.total }}>150</div>
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

function NumberInput({ label, value, min, max, onChange }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void }) {
 return (
 <div className="flex flex-col gap-1">
 <label className="text-[9px] text-zinc-500">{label}</label>
 <input
 type="number"
 min={min}
 max={max}
 value={Number(value || 0)}
 onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value || min))))}
 className="border border-zinc-200 px-2 py-2 text-[10px] font-mono"
 />
 </div>
 )
}
