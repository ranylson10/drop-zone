"use client";

import { Rss } from "lucide-react";
import { MobileCard, MobileSectionTitle } from "../components/MobileShell";
import { MobileFeedList } from "../components/MobileFeedList";

export default function MobileFeedPage() {
  return (
    <div className="space-y-3">
      <MobileCard className="p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center border border-blue-200 bg-blue-50 text-blue-600">
            <Rss size={19} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
              Comunidade
            </p>
            <h1 className="text-xl font-black uppercase tracking-[-0.04em] text-slate-950">
              Feed
            </h1>
          </div>
        </div>
      </MobileCard>

      <section>
        <MobileSectionTitle
          title="Postagens"
          subtitle="Somente o conteúdo principal, sem painéis extras."
        />
        <MobileFeedList />
      </section>
    </div>
  );
}
