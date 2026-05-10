'use client'

import PlayerCard from '@/app/components/PlayerCard'

export default function CardPreviewPage() {
  return (
    <main className="min-h-screen bg-[#07111f] p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 text-xl font-black text-white">Preview PlayerCard SVG Corel</div>

        <div className="grid grid-cols-4 gap-4">
          <PlayerCard name="SIX" tier="S" number={1} variant="oficial" />
          <PlayerCard name="ALOE" tier="A" number={2} variant="oficial" />
          <PlayerCard name="GHOST" tier="B" number={3} variant="oficial" />
          <PlayerCard name="AVULSO" tier="C" number={4} variant="avulso" />
          <PlayerCard number={5} variant="slot" />
          <PlayerCard number={6} variant="slot" />
          <PlayerCard number={7} variant="slot" />
          <PlayerCard number={8} variant="slot" />
        </div>
      </div>
    </main>
  )
}
