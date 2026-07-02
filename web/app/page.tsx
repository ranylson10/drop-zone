import Link from 'next/link'
import { ArrowRight, Building2, Eye, Gamepad2, Medal, Shield, Sparkles } from 'lucide-react'
import type { TipoModoUso } from '@/lib/identity'

const modos: Array<{
  modo: TipoModoUso
  titulo: string
  subtitulo: string
  descricao: string
  icon: typeof Gamepad2
  accent: string
  badge: string
  acoes: string[]
  protegido: boolean
}> = [
  {
    modo: 'jogador',
    titulo: 'Sou jogador',
    subtitulo: 'Perfil gamer, equipe e campeonatos',
    descricao: 'Crie seu perfil de jogo, receba convites, entre em equipes e acompanhe campeonatos abertos.',
    icon: Gamepad2,
    accent: 'bg-cyan-500',
    badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    acoes: ['Perfil de jogo', 'Convites', 'Campeonatos', 'Estatísticas'],
    protegido: true,
  },
  {
    modo: 'equipe',
    titulo: 'Sou líder de equipe',
    subtitulo: 'Elenco, lines, inscrições e escalações',
    descricao: 'Gerencie elenco, crie lines, inscreva sua equipe e acompanhe desempenho competitivo.',
    icon: Shield,
    accent: 'bg-blue-600',
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    acoes: ['Inscrever equipe', 'Escalar jogadores', 'Formar elenco', 'Ver estatísticas'],
    protegido: true,
  },
  {
    modo: 'produtora',
    titulo: 'Sou produtora',
    subtitulo: 'Eventos, vagas, PIX e transmissão',
    descricao: 'Crie campeonatos, venda vagas, acompanhe pagamentos PIX e use stream/overlays.',
    icon: Building2,
    accent: 'bg-orange-500',
    badge: 'border-orange-200 bg-orange-50 text-orange-700',
    acoes: ['Criar campeonato', 'Vender vagas', 'Pagamentos PIX', 'Stream'],
    protegido: true,
  },
  {
    modo: 'manager',
    titulo: 'Sou manager',
    subtitulo: 'Gestão de equipes, lines e jogadores',
    descricao: 'Acompanhe equipes que você gerencia, organize jogadores, lines e pendências.',
    icon: Medal,
    accent: 'bg-emerald-500',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    acoes: ['Equipes', 'Lines', 'Jogadores', 'Pendências'],
    protegido: true,
  },
  {
    modo: 'visitante',
    titulo: 'Só quero explorar',
    subtitulo: 'Campeonatos, rankings e produtoras',
    descricao: 'Veja campeonatos abertos, equipes, rankings e produtoras antes de criar conta.',
    icon: Eye,
    accent: 'bg-slate-700',
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
    acoes: ['Campeonatos', 'Ranking', 'Equipes', 'Produtoras'],
    protegido: false,
  },
]

function hrefModo(modo: TipoModoUso, protegido: boolean) {
  if (!protegido) return '/dashboard?modo=visitante'

  const redirect = `/identidade?modo=${modo}`
  return `/login?redirect=${encodeURIComponent(redirect)}&intent=${modo}`
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="pointer-events-none fixed inset-0 opacity-[0.55] [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:24px_24px]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[260px] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.14),transparent_58%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 py-5 md:px-8 md:py-7">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center border border-slate-200 bg-white p-2 shadow-sm">
              <img src="/brand/dropzone-logo.svg" alt="Drop Zone" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-lg font-black uppercase tracking-[-0.04em] text-slate-950">
                DROP<span className="text-orange-500">ZONE</span>
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">Sistema competitivo</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login?redirect=%2Fidentidade"
              className="hidden border border-slate-300 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro?redirect=%2Fidentidade"
              className="border border-orange-500 bg-orange-500 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-sm hover:bg-orange-600"
            >
              Criar conta
            </Link>
          </div>
        </header>

        <div className="grid flex-1 gap-5 py-7 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-8">
          <section className="relative overflow-hidden border border-slate-900 bg-[#07111f] p-6 text-white shadow-[8px_8px_0px_rgba(15,23,42,0.18)] md:p-8 lg:min-h-[560px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.40),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.26),transparent_34%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:32px_32px]" />

            <div className="relative flex h-full flex-col justify-between gap-8">
              <div>
                <div className="inline-flex items-center gap-2 border border-blue-300/35 bg-blue-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">
                  <Sparkles size={14} /> Escolha seu modo de uso
                </div>

                <h1 className="mt-5 max-w-2xl text-[2.75rem] font-black uppercase leading-[0.95] tracking-[-0.075em] md:text-[4.7rem] lg:text-[4.25rem] xl:text-[5rem]">
                  Como você quer usar a plataforma hoje?
                </h1>

                <p className="mt-5 max-w-xl text-[15px] font-semibold leading-7 text-white/72 md:text-base">
                  A Drop Zone mostra primeiro as funções certas para sua rotina. Jogador, líder, produtora ou manager acessa um painel simples, direto e moldado para seu objetivo.
                </p>
              </div>

              <div className="grid gap-3 text-xs font-bold text-white/74 sm:grid-cols-2">
                <div className="border border-white/10 bg-white/5 p-3">Conta única para todos os modos.</div>
                <div className="border border-white/10 bg-white/5 p-3">Atalhos diferentes para cada perfil.</div>
                <div className="border border-white/10 bg-white/5 p-3">Cadastro rápido antes do subperfil.</div>
                <div className="border border-white/10 bg-white/5 p-3">Visitante explora sem login.</div>
              </div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            {modos.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.modo}
                  href={hrefModo(item.modo, item.protegido)}
                  className="group relative min-h-[205px] overflow-hidden border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl"
                >
                  <div className={`absolute inset-x-0 top-0 h-1.5 ${item.accent}`} />

                  <div className="flex items-start justify-between gap-3">
                    <div className={`grid h-12 w-12 place-items-center border ${item.badge}`}>
                      <Icon size={23} />
                    </div>
                    <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" size={20} />
                  </div>

                  <div className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.subtitulo}</div>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-slate-950">{item.titulo}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.descricao}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.acoes.map((acao) => (
                      <span key={acao} className="border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                        {acao}
                      </span>
                    ))}
                  </div>
                </Link>
              )
            })}
          </section>
        </div>
      </section>
    </main>
  )
}
