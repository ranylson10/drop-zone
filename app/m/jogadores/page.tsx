'use client'

import Link from 'next/link'
import { Gamepad2, Plus, UserRound, Users } from 'lucide-react'
import { MobileAction, MobileCard, MobileSectionTitle } from '../components/MobileShell'

export default function MobileJogadoresPage() {
  return (
    <div className="space-y-3">
      <MobileCard className="bg-gradient-to-br from-blue-600 to-slate-950 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">Elenco</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em]">Jogadores</h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-blue-100">Área rápida para organizar jogadores, elenco e lines pelo celular.</p>
      </MobileCard>

      <section>
        <MobileSectionTitle title="Ações rápidas" subtitle="Use os atalhos principais do elenco." />
        <div className="grid grid-cols-1 gap-2">
          <MobileAction href="/m/equipe" label="Ver elenco da equipe" desc="Adicionar, remover e organizar jogadores" icon={Users} />
          <MobileAction href="/m/lines" label="Configurar lines" desc="Titulares, reservas e line principal" icon={Gamepad2} />
          <MobileAction href="/perfil-jogo" label="Perfil de jogo completo" desc="Cadastro avançado de nick, ID e conta" icon={UserRound} />
        </div>
      </section>

      <MobileCard>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center border border-blue-200 bg-blue-50 text-blue-600"><Plus size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black uppercase text-slate-950">Cadastrar jogador</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">O cadastro direto de jogador será conectado ao fluxo completo da equipe.</p>
          </div>
        </div>
        <Link href="/m/equipe" className="mt-3 block border border-slate-200 bg-slate-50 px-3 py-3 text-center text-[11px] font-black uppercase text-slate-700">Abrir equipe</Link>
      </MobileCard>
    </div>
  )
}
