import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-10 text-[#0f172a]">
      <section className="mx-auto max-w-3xl border border-slate-200 bg-white p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#2563eb]">
          Drop Zone
        </p>

        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-[#0f172a]">
          Página não encontrada
        </h1>

        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          O link acessado não existe ou foi movido. Volte para o início ou veja os campeonatos disponíveis.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center border border-[#2563eb] bg-[#2563eb] px-5 text-xs font-black uppercase tracking-[0.18em] text-white"
          >
            Ir para o início
          </Link>

          <Link
            href="/campeonatos"
            className="inline-flex h-11 items-center justify-center border border-slate-300 bg-white px-5 text-xs font-black uppercase tracking-[0.18em] text-slate-700"
          >
            Ver campeonatos
          </Link>
        </div>
      </section>
    </main>
  )
}
