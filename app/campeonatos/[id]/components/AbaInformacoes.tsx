'use client'

import { useEffect, useMemo, useState } from 'react'
import {
 Pencil,
 Clock,
 Trophy,
 Shield,
 LayoutGrid,
 Tv,
 Settings2,
 Users,
 PlusCircle,
 Trash2,
 ChevronDown,
 ChevronUp,
} from 'lucide-react'

interface AbaInformacoesProps {
 camp: any
 onSave: (campo: string, valor: any) => Promise<void>
}

type PremioItem = {
 pos: string
 val: string
}

type CriterioItem = {
 id: string
 t: string
}

const opcoesDesempate = [
 { id: 'vitorias', label: 'Total de Vitórias (Booyahs)' },
 { id: 'abates', label: 'Total de Abates (Kills)' },
 { id: 'posicao', label: 'Pontos de Colocação' },
 { id: 'ultima_queda', label: 'Melhor posição na última queda' },
]

function formatarDataHora(valor: any) {
 if (!valor) return '---'
 const data = new Date(valor)
 if (Number.isNaN(data.getTime())) return '---'
 return data.toLocaleString('pt-BR', {
 dateStyle: 'short',
 timeStyle: 'short',
 })
}

function formatarValor(valor: any) {
 if (valor === null || valor === undefined || valor === '') return '---'
 if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
 return String(valor)
}

function valorInputDateTime(valor: any) {
 if (!valor) return ''
 const data = new Date(valor)
 if (Number.isNaN(data.getTime())) return ''
 const yyyy = data.getFullYear()
 const mm = String(data.getMonth() + 1).padStart(2, '0')
 const dd = String(data.getDate()).padStart(2, '0')
 const hh = String(data.getHours()).padStart(2, '0')
 const mi = String(data.getMinutes()).padStart(2, '0')
 return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function valorBoolParaOpcao(valor: any, options: string[]) {
 if (valor === true) {
 if (options.includes('Garantida')) return 'Garantida'
 return 'Sim'
 }
 if (valor === false) {
 if (options.includes('Prevista')) return 'Prevista'
 return 'Não'
 }
 return valor || ''
}

function cardTitleClass() {
 return 'mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-tight text-[#142340]'
}

export default function AbaInformacoes({ camp, onSave }: AbaInformacoesProps) {
 const [showPontuacao, setShowPontuacao] = useState(false)
 const [pontos, setPontos] = useState<number[]>(Array(12).fill(0))
 const [premios, setPremios] = useState<PremioItem[]>([])
 const [criterios, setCriterios] = useState<CriterioItem[]>([
 { id: 'vitorias', t: 'Vitórias' },
 { id: 'abates', t: 'Abates' },
 { id: 'posicao', t: 'Posição' },
 ])

 useEffect(() => {
 if (Array.isArray(camp?.pontos_colocacao)) {
 setPontos(camp.pontos_colocacao)
 } else {
 setPontos(Array(12).fill(0))
 }

 if (Array.isArray(camp?.distribuicao_premios)) {
 setPremios(camp.distribuicao_premios)
 } else if (Array.isArray(camp?.distribuicao_premiacao_json)) {
 setPremios(camp.distribuicao_premiacao_json)
 } else {
 setPremios([
 { pos: '1º LUGAR', val: '' },
 { pos: '2º LUGAR', val: '' },
 { pos: '3º LUGAR', val: '' },
 ])
 }

 if (Array.isArray(camp?.criterios_desempate) && camp.criterios_desempate.length) {
 setCriterios(camp.criterios_desempate)
 }
 }, [camp])

 const linkDiscord = camp?.discord_url || camp?.discord_link || ''
 const whatsapp = camp?.whatsapp_suporte || ''
 const responsavel = camp?.responsavel_nome || camp?.responsavel || 'SIX'
 const linkCanal = camp?.canal_oficial_url || camp?.transmissao_plataforma || ''

 const quantidadePosicoes = useMemo(() => {
 const valor = Number(camp?.equipes_por_jogo || 12)
 return Number.isFinite(valor) && valor > 0 ? valor : 12
 }, [camp?.equipes_por_jogo])


 const aplicarLBFF = async () => {
 const lbff = [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0]
 setPontos(lbff)
 await onSave('pontos_colocacao', lbff)
 }

 const handleCriterioChange = async (index: number, newId: string) => {
 const novos = [...criterios]
 const opcao = opcoesDesempate.find((o) => o.id === newId)
 if (!opcao) return

 novos[index] = { id: opcao.id, t: opcao.label.split(' (')[0] }
 setCriterios(novos)
 await onSave('criterios_desempate', novos)
 }

 const addPremio = async () => {
 const novos = [...premios, { pos: `TOP ${premios.length + 1}`, val: '' }]
 setPremios(novos)
 await onSave('distribuicao_premios', novos)
 }

 const removePremio = async (index: number) => {
 const novos = premios.filter((_, i) => i !== index)
 setPremios(novos)
 await onSave('distribuicao_premios', novos)
 }

 const updatePremio = (index: number, field: 'pos' | 'val', value: string) => {
 const novos = [...premios]
 novos[index][field] = field === 'pos' ? value.toUpperCase() : value
 setPremios(novos)
 }

 const salvarPremios = async () => {
 await onSave('distribuicao_premios', premios)
 }

 return (
 <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-500">
 <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
 <div className="xl:col-span-7 grid grid-cols-1 gap-6">
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
 <InfoCard icon={<Clock size={17} className="text-[#2563eb]" />} title="1. Status e datas" borderColor="border-zinc-200">
 <div className="grid grid-cols-1 gap-x-8 gap-y-1">
 <EditableRow label="Status atual" value={camp?.status} options={['Aberto', 'Inscrições encerradas', 'Em andamento', 'Finalizado', 'Rascunho']} onSave={(v: any) => onSave('status', v)} />
 <EditableRow label="Início do camp" value={camp?.data_inicio} type="datetime-local" onSave={(v: any) => onSave('data_inicio', v)} />
 <EditableRow label="Início inscrições" value={camp?.data_abertura_inscricoes} type="datetime-local" onSave={(v: any) => onSave('data_abertura_inscricoes', v)} />
 <EditableRow label="Fim inscrições" value={camp?.data_encerramento_inscricoes} type="datetime-local" onSave={(v: any) => onSave('data_encerramento_inscricoes', v)} />
 <EditableRow label="Idade mínima" value={camp?.idade_minima} type="number" suffix=" anos" onSave={(v: any) => onSave('idade_minima', v ? Number(v) : null)} />
 <EditableRow label="Horário início" value={camp?.horario_inicio} onSave={(v: any) => onSave('horario_inicio', v)} />
 </div>
 </InfoCard>

 <InfoCard icon={<LayoutGrid size={17} className="text-[#2563eb]" />} title="2. Competição" borderColor="border-[#2563eb]">
 <div className="grid grid-cols-1 gap-x-8 gap-y-1">
 <EditableRow label="Modo" value={camp?.modo_jogo} options={['CS', 'Battle Royale']} onSave={(v: any) => onSave('modo_jogo', v)} />
 <EditableRow label="Formato" value={camp?.formato} options={['Pontos corridos', 'Fases e grupos', 'Mata-mata', 'Liga']} onSave={(v: any) => onSave('formato', v)} />
 <EditableRow label="Qtd. equipes" value={camp?.quantidade_equipes} type="number" onSave={(v: any) => onSave('quantidade_equipes', v ? Number(v) : null)} />
 <EditableRow label="Equipes p/ jogo" value={camp?.equipes_por_jogo} type="number" onSave={(v: any) => onSave('equipes_por_jogo', v ? Number(v) : null)} />
 <EditableRow label="Quedas/rodada" value={camp?.quedas_por_rodada} type="number" onSave={(v: any) => onSave('quedas_por_rodada', v ? Number(v) : null)} />
 <EditableRow label="Qtd. rodadas" value={camp?.quantidade_rodadas} type="number" onSave={(v: any) => onSave('quantidade_rodadas', v ? Number(v) : null)} />
 <EditableRow label="Qtd. total quedas" value={camp?.quantidade_quedas} type="number" onSave={(v: any) => onSave('quantidade_quedas', v ? Number(v) : null)} />
 <EditableRow label="Critério desempate" value={camp?.criterio_desempate} onSave={(v: any) => onSave('criterio_desempate', v)} />
 </div>

 <div className="mt-5 flex flex-wrap gap-3">
 <button onClick={() => setShowPontuacao((v) => !v)} className="bg-white text-[#2563eb] text-[10px] font-semibold px-4 py-2 uppercase flex items-center gap-2 hover:opacity-90 transition-all ">
 {showPontuacao ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
 {showPontuacao ? 'Ocultar pontuação' : 'Configurar pontuação'}
 </button>
 </div>

 {showPontuacao && (
 <div className="mt-6 border-t border-dashed border-zinc-200 pt-6">
 <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
 <div className="xl:col-span-7">
 <div className="mb-4 flex items-center justify-between gap-3">
 <p className="text-[11px] font-semibold uppercase text-zinc-500">Pontos por colocação</p>
 <button onClick={aplicarLBFF} className="text-[10px] font-semibold bg-zinc-100 px-3 py-1 border border-zinc-200 hover:bg-white hover:text-[#2563eb] transition-all">
 Usar LBFF
 </button>
 </div>

 <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
 {Array.from({ length: quantidadePosicoes }).map((_, i) => (
 <div key={`pt-${i}`} className="bg-zinc-50 border border-zinc-100 p-2">
 <span className="mb-1 block text-[8px] font-bold uppercase text-zinc-500">{i + 1}º Lugar</span>
 <input
 type="number"
 className="w-full bg-transparent text-[14px] font-semibold outline-none"
 value={pontos[i] || 0}
 onChange={(e) => {
 const newP = [...pontos]
 newP[i] = parseInt(e.target.value) || 0
 setPontos(newP)
 }}
 onBlur={() => onSave('pontos_colocacao', pontos)}
 />
 </div>
 ))}
 </div>
 </div>

 <div className="xl:col-span-5">
 <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Prioridade de desempate</p>
 <div className="space-y-3">
 {criterios.slice(0, 3).map((c, i) => (
 <div key={`crit-${i}`} className="bg-zinc-50 border-l-[4px] border-zinc-200 p-4 flex items-center justify-between ">
 <div className="flex items-center gap-4">
 <span className="text-[14px] font-semibold ">{i + 1}º</span>
 <select
 className="bg-transparent font-semibold uppercase text-[11px] outline-none cursor-pointer"
 value={c.id}
 onChange={(e) => handleCriterioChange(i, e.target.value)}
 >
 {opcoesDesempate.map((opt) => (
 <option key={opt.id} value={opt.id}>{opt.label}</option>
 ))}
 </select>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}
 </InfoCard>
 </div>

 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
 <InfoCard icon={<Trophy size={17} className="text-[#2563eb]" />} title="3. Premiação" borderColor="border-[#ffd600]">
 <div className="grid grid-cols-1 gap-x-8 gap-y-1">
 <EditableRow label="Premiação total" value={camp?.valor_premiacao} prefix="R$ " type="number" onSave={(v: any) => onSave('valor_premiacao', v ? Number(v) : 0)} />
 <EditableRow label="Tipo de premiação" value={camp?.tipo_premiacao} onSave={(v: any) => onSave('tipo_premiacao', v)} />
 <EditableRow label="Premiação" value={camp?.premiacao_garantida ? 'Garantida' : 'Prevista'} options={['Garantida', 'Prevista']} onSave={(v: any) => onSave('premiacao_garantida', v === 'Garantida')} />
 <EditableRow label="Pagamento" value={camp?.forma_pagamento_premiacao} onSave={(v: any) => onSave('forma_pagamento_premiacao', v)} />
 <EditableRow label="Prazo pagamento" value={camp?.prazo_pagamento_premiacao} onSave={(v: any) => onSave('prazo_pagamento_premiacao', v)} />
 </div>

 <div className="mt-6 border-t border-dashed border-zinc-200 pt-5">
 <div className="mb-4 flex items-center justify-between gap-3">
 <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Distribuição da premiação</p>
 <button onClick={addPremio} className="bg-zinc-100 border border-zinc-200 px-3 py-1 text-[10px] font-semibold uppercase flex items-center gap-2 hover:bg-white hover:text-[#2563eb] transition-all">
 <PlusCircle size={12} />
 Adicionar faixa
 </button>
 </div>

 <div className="space-y-2">
 {premios.map((premio, index) => (
 <div key={`premio-${index}`} className="grid grid-cols-[1.2fr_1fr_auto] gap-2 items-center">
 <input
 value={premio.pos}
 onChange={(e) => updatePremio(index, 'pos', e.target.value)}
 onBlur={salvarPremios}
 className="border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-semibold uppercase outline-none"
 placeholder="POSIÇÃO"
 />
 <input
 value={premio.val}
 onChange={(e) => updatePremio(index, 'val', e.target.value)}
 onBlur={salvarPremios}
 className="border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-semibold uppercase outline-none"
 placeholder="VALOR / ITEM"
 />
 <button onClick={() => removePremio(index)} className="h-10 w-10 flex items-center justify-center bg-red-50 border border-red-200 text-red-500 hover:bg-red-500 hover:text-[#142340] transition-all">
 <Trash2 size={13} />
 </button>
 </div>
 ))}
 </div>
 </div>
 </InfoCard>

 <InfoCard icon={<Shield size={17} className="text-[#2563eb]" />} title="4. Regras rápidas" borderColor="border-zinc-900">
 <div className="grid grid-cols-1 gap-x-8 gap-y-1">
 <EditableRow label="Check-in obrigatório" value={camp?.checkin_obrigatorio ? 'Sim' : 'Não'} options={['Sim', 'Não']} onSave={(v: any) => onSave('checkin_obrigatorio', v === 'Sim')} />
 <EditableRow label="Horário check-in" value={camp?.horario_checkin} onSave={(v: any) => onSave('horario_checkin', v)} />
 <EditableRow label="Jogadores/equipe" value={camp?.jogadores_por_equipe} type="number" onSave={(v: any) => onSave('jogadores_por_equipe', v ? Number(v) : null)} />
 <EditableRow label="Reservas permitidos" value={camp?.reservas_permitidos} type="number" onSave={(v: any) => onSave('reservas_permitidos', v ? Number(v) : null)} />
 <EditableRow label="Substitutos" value={camp?.substitutos_permitidos ? 'Sim' : 'Não'} options={['Sim', 'Não']} onSave={(v: any) => onSave('substitutos_permitidos', v === 'Sim')} />
 <EditableRow label="Pro players" value={camp?.pro_players_proibidos ? 'Proibidos' : 'Permitidos'} options={['Proibidos', 'Permitidos']} onSave={(v: any) => onSave('pro_players_proibidos', v === 'Proibidos')} />
 <EditableRow label="Troca jogadores" value={camp?.troca_jogadores} onSave={(v: any) => onSave('troca_jogadores', v)} />
 <EditableRow label="Penalidade W.O." value={camp?.penalidade_wo} onSave={(v: any) => onSave('penalidade_wo', v)} />
 </div>
 </InfoCard>
 </div>
 </div>

 <div className="xl:col-span-5 grid grid-cols-1 gap-6">
 <InfoCard icon={<Settings2 size={17} className="text-[#2563eb]" />} title="5. Controle do organizador" borderColor="border-[#2563eb]">
 <div className="space-y-5">
 <div>
 <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Bloqueios antes do jogo</p>
 <div className="grid grid-cols-1 gap-y-1">
 <EditableRow label="Ativar bloqueio" value={camp?.bloquear_alteracoes_antes_jogo ? 'Sim' : 'Não'} options={['Sim', 'Não']} onSave={(v: any) => onSave('bloquear_alteracoes_antes_jogo', v === 'Sim')} />
 <EditableRow label="Limite alt. jogadores" value={camp?.limite_minutos_alteracao_jogadores} type="number" suffix=" min" onSave={(v: any) => onSave('limite_minutos_alteracao_jogadores', v ? Number(v) : null)} />
 <EditableRow label="Limite alt. equipes" value={camp?.limite_minutos_alteracao_equipes} type="number" suffix=" min" onSave={(v: any) => onSave('limite_minutos_alteracao_equipes', v ? Number(v) : null)} />
 <EditableRow label="Limite alt. contas" value={camp?.limite_minutos_alteracao_contas} type="number" suffix=" min" onSave={(v: any) => onSave('limite_minutos_alteracao_contas', v ? Number(v) : null)} />
 </div>
 </div>

 <div className="border-t border-dashed border-zinc-200 pt-5">
 <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Troca de grupos</p>
 <div className="grid grid-cols-1 gap-y-1">
 <EditableRow label="Permitir troca" value={camp?.permitir_troca_grupos ? 'Sim' : 'Não'} options={['Sim', 'Não']} onSave={(v: any) => onSave('permitir_troca_grupos', v === 'Sim')} />
 <EditableRow label="Troca livre" value={camp?.permitir_troca_grupos_livre ? 'Sim' : 'Não'} options={['Sim', 'Não']} onSave={(v: any) => onSave('permitir_troca_grupos_livre', v === 'Sim')} />
 <EditableRow label="Troca genérica" value={camp?.permitir_troca_grupos_generica ? 'Sim' : 'Não'} options={['Sim', 'Não']} onSave={(v: any) => onSave('permitir_troca_grupos_generica', v === 'Sim')} />
 <EditableRow label="Exigir aprovação" value={camp?.exigir_aprovacao_organizacao_troca_grupo ? 'Sim' : 'Não'} options={['Sim', 'Não']} onSave={(v: any) => onSave('exigir_aprovacao_organizacao_troca_grupo', v === 'Sim')} />
 </div>
 </div>
 </div>
 </InfoCard>

 <InfoCard icon={<Tv size={17} className="text-[#2563eb]" />} title="6. Suporte e transmissão" borderColor="border-zinc-900">
 <div className="grid grid-cols-1 gap-x-8 gap-y-1">
 <EditableRow label="Transmissão ao vivo" value={camp?.transmissao_ao_vivo ? 'Sim' : 'Não'} options={['Sim', 'Não']} onSave={(v: any) => onSave('transmissao_ao_vivo', v === 'Sim')} />
 <EditableRow label="Plataforma transmissão" value={camp?.plataforma_transmissao} onSave={(v: any) => onSave('plataforma_transmissao', v)} />
 <EditableRow label="Link canal" value={linkCanal} onSave={(v: any) => onSave(camp?.canal_oficial_url !== undefined ? 'canal_oficial_url' : 'transmissao_plataforma', v)} />
 <EditableRow label="Anti-cheat" value={camp?.anti_cheat ? 'Sim' : 'Não'} options={['Sim', 'Não']} onSave={(v: any) => onSave('anti_cheat', v === 'Sim')} />
 <EditableRow label="Discord" value={linkDiscord} onSave={(v: any) => onSave(camp?.discord_url !== undefined ? 'discord_url' : 'discord_link', v)} />
 <EditableRow label="Whats suporte" value={whatsapp} onSave={(v: any) => onSave('whatsapp_suporte', v)} />
 <EditableRow label="Responsável" value={responsavel} onSave={(v: any) => onSave(camp?.responsavel_nome !== undefined ? 'responsavel_nome' : 'responsavel', v)} />
 </div>

 <div className="mt-5 flex flex-wrap gap-3">
 <button onClick={() => linkDiscord && window.open(linkDiscord, '_blank')} className="bg-[#5865F2] text-[#142340] text-[10px] font-semibold px-5 py-2.5 uppercase flex items-center gap-2 hover:opacity-90 ">
 <Shield size={14} />
 Servidor Discord
 </button>

 <button onClick={() => whatsapp && window.open(`https://wa.me/${String(whatsapp).replace(/\D/g, '')}`, '_blank')} className="bg-[#25D366] text-[#142340] text-[10px] font-semibold px-5 py-2.5 uppercase flex items-center gap-2 hover:opacity-90 ">
 <Users size={14} />
 Suporte WhatsApp
 </button>

 <button onClick={() => linkCanal && window.open(linkCanal, '_blank')} className="bg-red-600 text-[#142340] text-[10px] font-semibold px-5 py-2.5 uppercase flex items-center gap-2 hover:bg-red-700 ">
 <Tv size={14} />
 Assistir canal
 </button>
 </div>
 </InfoCard>
 </div>
 </section>
 </div>
 )
}

function InfoCard({ icon, title, borderColor, children }: { icon: React.ReactNode; title: string; borderColor: string; children: React.ReactNode }) {
 return (
 <section className={`bg-white p-5 md:p-6 border-l-4 ${borderColor}`}>
 <h3 className={cardTitleClass()}>
 {icon} {title}
 </h3>
 {children}
 </section>
 )
}

function EditableRow({
 label,
 value,
 onSave,
 options,
 type = 'text',
 prefix = '',
 suffix = '',
}: any) {
 const [isEditing, setIsEditing] = useState(false)

 const handleSave = (newValue: any) => {
 if (type === 'datetime-local' && newValue === '') {
 onSave(null)
 } else if (type === 'number') {
 onSave(newValue === '' ? null : Number(newValue))
 } else {
 onSave(newValue)
 }
 setIsEditing(false)
 }

 const displayValue =
 type === 'datetime-local'
 ? formatarDataHora(value)
 : `${prefix}${formatarValor(value)}${value !== null && value !== undefined && value !== '' ? suffix : ''}`

 return (
 <div className="flex min-h-[42px] items-center justify-between gap-4 border-b border-zinc-100 py-2.5 group">
 <span className="text-[10px] font-semibold uppercase tracking-tight text-zinc-500">{label}</span>

 {isEditing ? (
 options ? (
 <select
 autoFocus
 className="min-w-[170px] bg-zinc-50 text-right text-[11px] font-semibold uppercase outline-none border-b-2 border-[#2563eb]"
 value={valorBoolParaOpcao(value, options)}
 onChange={(e) => handleSave(e.target.value)}
 onBlur={() => setIsEditing(false)}
 >
 <option value="">Selecionar</option>
 {options.map((opt: string) => (
 <option key={opt} value={opt}>{opt}</option>
 ))}
 </select>
 ) : (
 <input
 autoFocus
 type={type}
 className="w-full max-w-[220px] bg-zinc-50 text-right text-[11px] font-semibold uppercase outline-none border-b-2 border-[#2563eb]"
 defaultValue={type === 'datetime-local' ? valorInputDateTime(value) : value ?? ''}
 onBlur={(e) => handleSave(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
 />
 )
 ) : (
 <div onClick={() => setIsEditing(true)} className="flex cursor-pointer items-center gap-2 text-right hover:text-[#2563eb] transition-colors">
 <span className="text-[11px] font-semibold uppercase ">{displayValue || '---'}</span>
 <Pencil size={10} className="opacity-0 group-hover:opacity-100 text-zinc-600" />
 </div>
 )}
 </div>
 )
}
