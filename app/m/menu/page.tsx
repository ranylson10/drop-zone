'use client'

import { CreditCard, Gamepad2, Shield, Trophy, UserCircle, Users, Wallet } from 'lucide-react'
import { MobileAction, MobileCard, MobileSectionTitle } from '../components/MobileShell'

export default function MobileMenuPage() {
  return (
    <div className="space-y-3">
      <MobileCard className="bg-slate-950 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Menu geral</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em]">Ferramentas</h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">Essencial à mostra, avançado organizado em atalhos.</p>
      </MobileCard>

      <section>
        <MobileSectionTitle title="Conta" />
        <div className="grid grid-cols-1 gap-2">
          <MobileAction href="/m/perfil-jogo" label="Perfil de jogo" desc="Nick, ID e função" icon={Gamepad2} />
          <MobileAction href="/perfil" label="Perfil completo" desc="Painel avançado" icon={UserCircle} />
        </div>
      </section>

      <section>
        <MobileSectionTitle title="Competitivo" />
        <div className="grid grid-cols-1 gap-2">
          <MobileAction href="/m/campeonatos" label="Campeonatos" desc="Inscrição rápida" icon={Trophy} />
          <MobileAction href="/m/equipe" label="Equipe" desc="Dados e elenco" icon={Users} />
          <MobileAction href="/m/lines" label="Lines" desc="Titulares e reservas" icon={Gamepad2} />
        </div>
      </section>

      <section>
        <MobileSectionTitle title="Financeiro e segurança" />
        <div className="grid grid-cols-1 gap-2">
          <MobileAction href="/m/carteira" label="Carteira mobile" desc="Saldo e histórico" icon={Wallet} />
          <MobileAction href="/carteira" label="Carteira completa" desc="PIX, KYC e saques" icon={CreditCard} />
          <MobileAction href="/transparencia" label="Transparência" desc="Denúncias e confiança" icon={Shield} />
        </div>
      </section>
    </div>
  )
}
