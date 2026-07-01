'use client'
import { useState, useEffect } from 'react'
import { Save, Target, Trophy, ListOrdered, Zap, Edit3 } from 'lucide-react'

interface PontuacaoProps {
 camp: any;
 onSave: (campo: string, valor: any) => void;
}

export default function GerenciarPontuacao({ camp, onSave }: PontuacaoProps) {
 const [qtdEquipes, setQtdEquipes] = useState(camp?.equipes_por_jogo || 12);
 const [pontos, setPoints] = useState<number[]>([]);
 const [pontosAbate, setPontosAbate] = useState(camp?.pontos_abate || 1);

 const presetCompetitivo = [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0];

 useEffect(() => {
 if (camp?.pontos_colocacao && camp.pontos_colocacao.length > 0) {
 setPoints(camp.pontos_colocacao);
 setQtdEquipes(camp.pontos_colocacao.length);
 } else {
 aplicarPresetCompetitivo();
 }
 }, [camp]);

 const aplicarPresetCompetitivo = () => {
 const novoArray = Array(qtdEquipes).fill(0).map((_, i) => presetCompetitivo[i] ?? 0);
 setPoints(novoArray);
 };

 const limparParaPersonalizar = () => {
 setPoints(Array(qtdEquipes).fill(0));
 };

 const ajustarQtdEquipes = (novaQtd: number) => {
 const valor = Math.max(1, novaQtd);
 setQtdEquipes(valor);
 const novoArray = [...pontos];
 if (valor > pontos.length) {
 const complemento = Array(valor - pontos.length).fill(0);
 setPoints([...novoArray, ...complemento]);
 } else {
 setPoints(novoArray.slice(0, valor));
 }
 };

 const atualizarPontoPosicao = (index: number, valor: string) => {
 const novosPontos = [...pontos];
 novosPontos[index] = parseInt(valor) || 0;
 setPoints(novosPontos);
 };

 const handleSalvarTudo = () => {
 onSave('pontos_colocacao', pontos);
 onSave('pontos_abate', pontosAbate);
 onSave('equipes_por_jogo', qtdEquipes);
 };

 return (
 <div className="flex flex-col gap-4 animate-in fade-in duration-500 pb-6">
 
 {/* HEADER COMPACTO */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 border-l-4 border-[#2563eb] gap-2">
 <div>
 <h2 className="font-semibold uppercase text-lg flex items-center gap-2">
 <Trophy className="text-[#2563eb]" size={20} /> Sistema de Pontuação
 </h2>
 <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Defina as regras de pontuação</p>
 </div>
 <button 
 onClick={handleSalvarTudo}
 className="bg-white text-[#2563eb] px-6 py-3 font-semibold uppercase text-xs flex items-center gap-2 hover:bg-[#2563eb] hover:text-[#142340] transition-all active:scale-95"
 >
 <Save size={16} /> Salvar Configurações
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
 
 {/* COLUNA ESQUERDA: CONFIGS COMPACTAS */}
 <div className="flex flex-col gap-4">
 <div className="bg-white p-4 border-t-2 border-zinc-100">
 <label className="flex items-center gap-2 font-semibold uppercase text-[9px] mb-2 text-zinc-500 tracking-wider">
 <ListOrdered size={14} className="text-blue-500" /> Equipes em Partida
 </label>
 <input 
 type="number"
 className="w-full bg-zinc-50 border border-zinc-200 p-2 font-semibold text-xl outline-none focus:border-[#2563eb] transition-colors"
 value={qtdEquipes}
 onChange={(e) => ajustarQtdEquipes(parseInt(e.target.value))}
 />
 </div>

 <div className="bg-white p-4 border-t-2 border-zinc-100">
 <label className="flex items-center gap-2 font-semibold uppercase text-[9px] mb-2 text-zinc-500 tracking-wider">
 <Target size={14} className="text-red-500" /> Pontos por Abate
 </label>
 <input 
 type="number"
 className="w-full bg-zinc-50 border border-zinc-200 p-2 font-semibold text-xl outline-none focus:border-[#2563eb] transition-colors"
 value={pontosAbate}
 onChange={(e) => setPontosAbate(parseInt(e.target.value) || 0)}
 />
 </div>

 <div className="bg-white p-4 border-t-2 border-zinc-100">
 <label className="flex items-center gap-2 font-semibold uppercase text-[9px] mb-3 text-zinc-500 tracking-wider">
 <Zap size={14} className="text-yellow-500" /> Modo de Pontuação
 </label>
 <div className="flex flex-col gap-2">
 <button onClick={aplicarPresetCompetitivo} className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white hover:text-[#2563eb] p-3 font-semibold text-[10px] uppercase transition-all">
 <Trophy size={12} /> Usar padrão competitivo
 </button>
 <button onClick={limparParaPersonalizar} className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-800 hover:text-[#142340] p-3 font-semibold text-[10px] uppercase transition-all border-2 border-dashed border-zinc-300">
 <Edit3 size={12} /> Personalizar
 </button>
 </div>
 </div>
 </div>

 {/* COLUNA MEIO: LISTA VERTICAL SUPER COMPACTA */}
 <div className="lg:col-span-1 bg-white border-t-2 border-zinc-100 flex flex-col h-fit">
 <div className="p-2 bg-zinc-50 border-b border-zinc-100 flex justify-between items-center">
 <span className="font-semibold uppercase text-[9px] text-zinc-500 ml-2">Posição</span>
 <span className="font-semibold uppercase text-[9px] text-zinc-500 mr-2">Pontos</span>
 </div>
 <div className="p-3 space-y-1">
 {pontos.map((ponto, idx) => (
 <div key={idx} className="flex items-center gap-3 group px-2 py-1 hover:bg-zinc-50 transition-colors">
 <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center font-semibold text-[11px] border-2 transition-colors ${idx === 0 ? 'bg-[#2563eb] border-zinc-200' : 'bg-zinc-100 border-transparent'}`}>
 {idx + 1}º
 </div>
 <div className="flex-1">
 <p className="text-[9px] font-semibold uppercase text-[#142340] leading-none">
 {idx === 0 ? '🏆 Booyah!' : `${idx + 1}º Lugar`}
 </p>
 </div>
 <input 
 type="number"
 className="w-14 bg-white border border-zinc-200 p-1 font-semibold text-center text-sm outline-none focus:border-zinc-200 group-hover:border-zinc-400 transition-all"
 value={ponto}
 onChange={(e) => atualizarPontoPosicao(idx, e.target.value)}
 />
 </div>
 ))}
 </div>
 </div>

 {/* COLUNA DIREITA: DESEMPATE COMPACTO */}
 <div className="bg-white p-4 border-t-2 border-zinc-100">
 <div className="mb-4">
 <h3 className="font-semibold uppercase text-xs border-b-2 border-zinc-200 inline-block pb-1">Desempate</h3>
 </div>
 
 <div className="space-y-4">
 {[
 { t: '1º Vitórias', desc: 'Mais Booyahs.', color: 'border-yellow-500' },
 { t: '2º Abates', desc: 'Total de kills.', color: 'border-red-500' },
 { t: '3º Posição', desc: 'Pontos de colocação.', color: 'border-blue-500' },
 { t: '4º Última Queda', desc: 'Última partida.', color: 'border-zinc-400' }
 ].map((crit, i) => (
 <div key={i} className={`flex flex-col border-l-4 ${crit.color} pl-3 py-0.5`}>
 <span className="text-[10px] font-semibold uppercase text-[#142340]">{crit.t}</span>
 <span className="text-[8px] text-zinc-500 font-bold uppercase">{crit.desc}</span>
 </div>
 ))}
 </div>

 <div className="mt-6 p-3 bg-white text-[#142340] rounded-sm">
 <p className="text-[9px] leading-tight font-medium opacity-70">
 Critérios aplicados automaticamente na tabela. [cite: 2026-02-03]
 </p>
 </div>
 </div>

 </div>
 </div>
 )
}