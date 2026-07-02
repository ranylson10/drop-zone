import Link from 'next/link'
import { ArrowRight, Building2, Eye, Gamepad2, Medal, Shield } from 'lucide-react'
import type { TipoModoUso } from '@/lib/identity'

const modos: Array<{
  modo: TipoModoUso
  titulo: string
  subtitulo: string
  descricao: string
  icon: typeof Gamepad2
  cor: string
  protegido: boolean
}> = [
  {
    modo: 'jogador',
    titulo: 'Jogador',
    subtitulo: 'Perfil de jogo',
    descricao: 'Crie seu perfil, receba convites, entre em equipes e acompanhe campeonatos.',
    icon: Gamepad2,
    cor: 'text-cyan-600 border-cyan-200 bg-cyan-50',
    protegido: true,
  },
  {
    modo: 'equipe',
    titulo: 'Líder de equipe',
    subtitulo: 'Elenco e inscrições',
    descricao: 'Gerencie elenco, crie lines, escale jogadores e inscreva sua equipe.',
    icon: Shield,
    cor: 'text-blue-600 border-blue-200 bg-blue-50',
    protegido: true,
  },
  {
    modo: 'produtora',
    titulo: 'Produtora',
    subtitulo: 'Eventos e transmissão',
    descricao: 'Crie campeonatos, venda vagas, acompanhe pagamentos PIX e use overlays.',
    icon: Building2,
    cor: 'text-orange-600 border-orange-200 bg-orange-50',
    protegido: true,
  },
  {
    modo: 'manager',
    titulo: 'Manager',
    subtitulo: 'Gestão competitiva',
    descricao: 'Acompanhe equipes, organize lines, jogadores e pendências competitivas.',
    icon: Medal,
    cor: 'text-emerald-600 border-emerald-200 bg-emerald-50',
    protegido: true,
  },
  {
    modo: 'visitante',
    titulo: 'Visitante',
    subtitulo: 'Explorar plataforma',
    descricao: 'Veja campeonatos, produtoras, equipes e rankings antes de criar conta.',
    icon: Eye,
    cor: 'text-slate-700 border-slate-200 bg-slate-50',
    protegido: false,
  },
]

function hrefModo(modo: TipoModoUso, protegido: boolean) {
  if (!protegido) return '/dashboard?modo=visitante'

  const redirect = `/identidade?modo=${modo}`
  return `/login?intent=${modo}&redirect=${encodeURIComponent(redirect)}`
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-950">
      <div className="pointer-events-none fixed inset-0 opacity-[0.72] [background-image:linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.13),transparent_62%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1060px] flex-col justify-center px-4 py-8 sm:px-6">
        <header className="mb-6 flex justify-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center border border-slate-200 bg-white p-2 shadow-sm">
              <img src="/brand/dropzone-logo.svg" alt="Drop Zone" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-base font-black uppercase tracking-[-0.04em] text-slate-950">
                DROP<span className="text-orange-500">ZONE</span>
              </div>
              <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">Sistema competitivo</div>
            </div>
          </Link>
        </header>

        <div className="border border-slate-200 bg-white shadow-[6px_6px_0px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-5 py-5 text-center sm:px-8">
            <div className="mx-auto inline-flex items-center border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
              Escolha seu modo de uso
            </div>

            <h1 className="mx-auto mt-4 max-w-2xl text-2xl font-black uppercase leading-tight tracking-[-0.055em] text-slate-950 sm:text-4xl">
              Como você quer usar a plataforma?
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Primeiro escolha seu perfil de uso. Depois disso você entra ou cria sua conta, e a plataforma abre com as funções certas para você.
            </p>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            {modos.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.modo}
                  href={hrefModo(item.modo, item.protegido)}
                  className="group flex min-h-[190px] flex-col border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`grid h-11 w-11 place-items-center border ${item.cor}`}>
                      <Icon size={22} />
                    </div>
                    <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" size={18} />
                  </div>

                  <div className="mt-4 text-[9px] font-black uppercase tracking-[0.17em] text-slate-400">{item.subtitulo}</div>
                  <h2 className="mt-1.5 text-lg font-black uppercase leading-tight tracking-[-0.045em] text-slate-950">{item.titulo}</h2>
                  <p className="mt-2 flex-1 text-[12px] font-semibold leading-5 text-slate-600">{item.descricao}</p>

                  <div className="mt-4 border-t border-slate-100 pt-3 text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">
                    {item.protegido ? 'Selecionar' : 'Explorar'}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
