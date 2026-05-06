'use client'

import Link from 'next/link'
import { Gamepad2, Save } from 'lucide-react'
import { MobileAction, MobileCard, MobileSectionTitle } from '../components/MobileShell'

export default function MobilePerfilJogoPage() {
  return (
    <div className="space-y-3">
      <MobileCard className="bg-slate-950 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Perfil competitivo</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em]">Perfil de jogo</h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">Atalho mobile para editar nick, ID, função e dados do jogador.</p>
      </MobileCard>

      <section>
        <MobileSectionTitle title="Edição guiada" subtitle="A versão completa já existe no painel principal." />
        <MobileCard>
          <div className="grid h-16 w-16 place-items-center border border-blue-200 bg-blue-50 text-blue-600"><Gamepad2 size={26} /></div>
          <h2 className="mt-3 text-lg font-black uppercase tracking-[-0.04em]">Usar perfil completo</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Para não duplicar dados e não quebrar fluxo, essa tela leva para o perfil real. Depois podemos transformar em edição 100% mobile usando os mesmos campos do banco.</p>
          <Link href="/perfil" className="mt-4 block bg-blue-600 px-4 py-3 text-center text-[12px] font-black uppercase tracking-[0.12em] text-white">Abrir perfil completo</Link>
        </MobileCard>
      </section>

      <MobileAction href="/m/equipe" label="Minha equipe" desc="Criar equipe e organizar elenco" icon={Save} />
    </div>
  )
}
