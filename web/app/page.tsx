import Link from 'next/link'
import { ArrowRight, Building2, Eye, Gamepad2, Medal, Shield, Sparkles } from 'lucide-react'
import type { TipoModoUso } from '@/lib/identity'

const modos: Array<{
  modo: TipoModoUso
  titulo: string
  subtitulo: string
  descricao: string
  icon: typeof Gamepad2
  tone: string
  acoes: string[]
  protegido: boolean
}> = [
  {
    modo: 'jogador',
    titulo: 'Sou jogador',
    subtitulo: 'Perfil gamer, equipe e campeonatos',
    descricao: 'Crie seu perfil de jogo, entre em uma equipe, acompanhe convites e veja campeonatos abertos.',
    icon: Gamepad2,
    tone: 'border-cyan-300 bg-cyan-50 text-cyan-900',
    acoes: ['Perfil de jogo', 'Convites', 'Campeonatos', 'Estatísticas'],
    protegido: true,
  },
  {
    modo: 'equipe',
    titulo: 'Sou líder de equipe',
    subtitulo: 'Elenco, lines, inscrições e escalações',
    descricao: 'Gerencie sua equipe, forme elenco, crie lines, inscreva em campeonatos e acompanhe desempenho.',
    icon: Shield,
    tone: 'border-violet-300 bg-violet-50 text-violet-900',
    acoes: ['Inscrever equipe', 'Escalar jogadores', 'Formar elenco', 'Ver estatísticas'],
    protegido: true,
  },
  {
    modo: 'produtora',
    titulo: 'Sou produtora',
    subtitulo: 'Eventos, vagas, PIX e transmissão',
    descricao: 'Crie campeonatos, venda vagas, acompanhe pagamentos, gerencie equipes inscritas e use stream/overlays.',
    icon: Building2,
    tone: 'border-orange-300 bg-orange-50 text-orange-900',
    acoes: ['Criar campeonato', 'Vender vagas', 'Pagamentos PIX', 'Stream'],
    protegido: true,
  },
  {
    modo: 'manager',
    titulo: 'Sou manager',
    subtitulo: 'Gestão de equipes, lines e jogadores',
    descricao: 'Acompanhe equipes que você gerencia, monte lines, organize jogadores e veja pendências competitivas.',
    icon: Medal,
    tone: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    acoes: ['Equipes gerenciadas', 'Lines', 'Jogadores', 'Pendências'],
    protegido: true,
  },
  {
    modo: 'visitante',
    titulo: 'Só quero explorar',
    subtitulo: 'Campeonatos, rankings e produtoras',
    descricao: 'Veja campeonatos abertos, equipes, rankings e produtoras antes de criar uma conta.',
    icon: Eye,
    tone: 'border-slate-300 bg-white text-slate-900',
    acoes: ['Campeonatos', 'Rankings', 'Equipes', 'Produtoras'],
    protegido: false,
  },
]

function hrefModo(modo: TipoModoUso, protegido: boolean) {
  if (!protegido) return '/dashboard?modo=visitante'
  const redirect = `/identidade?modo=${modo}`
  return `/login?redirect=${encodeURIComponent(redirect)}`
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <section className="relative px-4 py-6 md:px-8 md:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.38),transparent_38%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.28),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:34px_34px]" />

        <div className="relative mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 p-2 shadow-[0_16px_40px_rgba(0,0,0,.25)]">
                <img src="/brand/dropzone-logo.svg" alt="Drop Zone" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-lg font-black uppercase tracking-[-0.04em]">DROP<span className="text-orange-300">ZONE</span></div>
                <div className="text-[9px] font-black uppercase tracking-[0.26em] text-white/45">Sistema competitivo</div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/login?redirect=%2Fidentidade" className="hidden border border-white/15 bg-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white/80 hover:bg-white/15 sm:inline-flex">Entrar</Link>
              <Link href="/cadastro?redirect=%2Fidentidade" className="border border-orange-300 bg-orange-400 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-950 hover:bg-orange-300">Criar conta</Link>
            </div>
          </header>

          <div className="grid gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 border border-blue-300/30 bg-blue-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">
                <Sparkles size={14} /> Escolha seu modo de uso
              </div>
              <h1 className="mt-5 max-w-2xl text-4xl font-black uppercase leading-[0.94] tracking-[-0.07em] md:text-6xl">
                Como você quer usar a plataforma hoje?
              </h1>
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/65">
                A Drop Zone molda o painel para o seu objetivo. Jogador, líder, produtora ou manager vê primeiro as funções mais importantes para sua rotina.
              </p>
              <div className="mt-6 grid gap-2 text-xs font-bold text-white/70 sm:grid-cols-2">
                <div className="border border-white/10 bg-white/5 p-3">Conta única, vários modos de uso.</div>
                <div className="border border-white/10 bg-white/5 p-3">Menu e atalhos mudam conforme sua escolha.</div>
                <div className="border border-white/10 bg-white/5 p-3">Login rápido antes de criar subperfil.</div>
                <div className="border border-white/10 bg-white/5 p-3">Visitante pode explorar sem cadastro.</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {modos.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.modo}
                    href={hrefModo(item.modo, item.protegido)}
                    className={`group flex min-h-[230px] flex-col justify-between border p-5 shadow-[0_18px_60px_rgba(0,0,0,.24)] transition hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(0,0,0,.34)] ${item.tone}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid h-12 w-12 place-items-center border border-current/20 bg-white/60">
                          <Icon size={24} />
                        </div>
                        <ArrowRight className="opacity-35 transition group-hover:translate-x-1 group-hover:opacity-100" size={20} />
                      </div>
                      <div className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] opacity-60">{item.subtitulo}</div>
                      <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em]">{item.titulo}</h2>
                      <p className="mt-2 text-sm font-semibold leading-6 opacity-70">{item.descricao}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {item.acoes.map((acao) => (
                        <span key={acao} className="border border-current/15 bg-white/45 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] opacity-80">{acao}</span>
                      ))}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
