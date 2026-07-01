'use client'
import { Pencil, Map as MapIcon, Calendar, Trophy, Settings, Users, DollarSign } from 'lucide-react'
import { useState } from 'react'

interface AbaInformacoesProps {
 camp: any;
 onSave: (campo: string, valor: any) => void;
}

export default function AbaInformacoes({ camp, onSave }: AbaInformacoesProps) {
 return (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
 
 {/* BLOCO: INFORMAÇÕES GERAIS E STATUS */}
 <section className="bg-white p-6 border-l-4 border-zinc-900 ">
 <h3 className="font-semibold uppercase text-sm mb-6 flex items-center gap-2">
 <Settings size={16}/> 01. Status e Região
 </h3>
 <div className="space-y-4">
 <EditableRow label="Status" value={camp.status} options={['Aberto para inscrições', 'Inscrições encerradas', 'Em andamento', 'Finalizado', 'Cancelado']} onSave={(v) => onSave('status', v)} />
 <EditableRow label="Tipo de Campeonato" value={camp.tipo_campeonato} options={['Amador', 'Semi-profissional', 'Profissional', 'Comunitário']} onSave={(v) => onSave('tipo_campeonato', v)} />
 <EditableRow label="Região" value={camp.regiao} options={['Nacional', 'Estadual', 'Regional', 'Internacional']} onSave={(v) => onSave('regiao', v)} />
 <EditableRow label="Servidor" value={camp.servidor} options={['Brasil', 'LATAM', 'SEA', 'NA / US', 'MENA']} onSave={(v) => onSave('servidor', v)} />
 </div>
 </section>

 {/* BLOCO: FORMATO E MAPAS */}
 <section className="bg-white p-6 border-l-4 border-[#2563eb] ">
 <h3 className="font-semibold uppercase text-sm mb-6 flex items-center gap-2">
 <MapIcon size={16}/> 02. Formato e Mapas
 </h3>
 <div className="space-y-4">
 <EditableRow label="Formato" value={camp.formato} options={['Liga', 'Copa', 'Diário', 'Semanal', 'Showmatch']} onSave={(v) => onSave('formato', v)} />
 <EditableRow label="Quedas por Rodada" value={camp.quedas_por_rodada} onSave={(v) => onSave('quedas_por_rodada', v)} type="number" />
 <EditableRow label="Equipes por Jogo" value={camp.equipes_per_match} onSave={(v) => onSave('equipes_per_match', v)} type="number" />
 <div className="pt-2 border-t">
 <p className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Mapas da Rotação</p>
 <div className="flex flex-wrap gap-1">
 {['Bermuda', 'Purgatório', 'Kalahari', 'Alpine', 'Nova Terra', 'Solara'].map(mapa => (
 <button 
 key={mapa}
 onClick={() => {
 const novosMapas = camp.mapas?.includes(mapa) 
 ? camp.mapas.filter((m: string) => m !== mapa)
 : [...(camp.mapas || []), mapa];
 onSave('mapas', novosMapas);
 }}
 className={`px-3 py-1 text-[9px] font-bold uppercase transition-all ${camp.mapas?.includes(mapa) ? 'bg-[#2563eb] text-[#142340]' : 'bg-zinc-100 text-zinc-500'}`}
 >
 {mapa}
 </button>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* BLOCO: REGRAS DE JOGADORES */}
 <section className="bg-white p-6 border-l-4 border-blue-500 ">
 <h3 className="font-semibold uppercase text-sm mb-6 flex items-center gap-2">
 <Users size={16}/> 03. Equipes e Jogadores
 </h3>
 <div className="space-y-4">
 <EditableRow label="Nível Mínimo Conta" value={camp.nivel_minimo} type="number" onSave={(v) => onSave('nivel_minimo', v)} />
 <EditableRow label="Idade Mínima" value={camp.idade_minima} type="number" onSave={(v) => onSave('idade_minima', v)} />
 <EditableRow label="Reservas Permitidos" value={camp.reservas_max} type="number" onSave={(v) => onSave('reservas_max', v)} />
 <EditableRow label="Check-in Obrigatório" value={camp.checkin_ativo ? 'Sim' : 'Não'} options={['Sim', 'Não']} onSave={(v) => onSave('checkin_ativo', v === 'Sim')} />
 <EditableRow label="Troca de Jogadores" value={camp.troca_jogadores} options={['Permitida', 'Proibida']} onSave={(v) => onSave('troca_jogadores', v)} />
 </div>
 </section>

 {/* BLOCO: PREMIAÇÃO E PAGAMENTO */}
 <section className="bg-white p-6 border-l-4 border-yellow-500 ">
 <h3 className="font-semibold uppercase text-sm mb-6 flex items-center gap-2">
 <Trophy size={16}/> 04. Premiação e Inscrição
 </h3>
 <div className="space-y-4">
 <EditableRow label="Tipo de Premiação" value={camp.tipo_premiacao} options={['Dinheiro', 'Gift Card', 'Diamantes', 'Troféu / Medalha']} onSave={(v) => onSave('tipo_premiacao', v)} />
 <EditableRow label="Forma de Pagto Inscrição" value={camp.metodo_pagamento} options={['PIX', 'PicPay', 'Mercado Pago', 'Grátis']} onSave={(v) => onSave('metodo_pagamento', v)} />
 <EditableRow label="Valor Inscrição" value={camp.valor_vaga} prefix="R$ " onSave={(v) => onSave('valor_vaga', v)} />
 <EditableRow label="Prazo Pagto Prêmio" value={camp.prazo_pagamento} onSave={(v) => onSave('prazo_pagamento', v)} placeholder="Ex: 24h após término" />
 </div>
 </section>
 </div>
 )
}

function EditableRow({ label, value, onSave, options, type = "text", prefix = "", placeholder = "" }: any) {
 const [isEditing, setIsEditing] = useState(false);
 const displayValue = value === null || value === undefined ? "" : value;

 return (
 <div className="flex justify-between items-center group border-b border-zinc-50 pb-2">
 <span className="text-[10px] font-semibold text-zinc-500 uppercase">{label}</span>
 {isEditing ? (
 options ? (
 <select 
 autoFocus 
 className="text-[11px] font-bold uppercase bg-zinc-50 outline-none border-b border-[#2563eb]"
 value={displayValue}
 onChange={(e) => { onSave(e.target.value); setIsEditing(false); }}
 onBlur={() => setIsEditing(false)}
 >
 <option value="">Selecionar</option>
 {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
 </select>
 ) : (
 <input 
 autoFocus
 type={type}
 className="text-[11px] font-bold uppercase bg-zinc-50 outline-none text-right border-b border-[#2563eb]"
 defaultValue={displayValue}
 onBlur={(e) => { onSave(e.target.value); setIsEditing(false); }}
 onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
 placeholder={placeholder}
 />
 )
 ) : (
 <div onClick={() => setIsEditing(true)} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 px-2 py-1 transition-colors">
 <span className="text-[11px] font-bold uppercase ">{prefix}{displayValue || '---'}</span>
 <Pencil size={10} className="opacity-0 group-hover:opacity-100 text-zinc-600" />
 </div>
 )}
 </div>
 )
}