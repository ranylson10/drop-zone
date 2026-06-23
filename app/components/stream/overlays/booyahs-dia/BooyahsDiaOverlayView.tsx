import type { StreamOverlayRenderProps } from '../types'

function num(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function text(value: unknown, fallback = '') {
  const parsed = String(value || '').trim()
  return parsed || fallback
}

function MapMedia({
  imageUrl,
  maskUrl,
  alt,
  filter,
}: {
  imageUrl?: string | null
  maskUrl?: string
  alt: string
  filter?: string
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        style={maskUrl ? {
          filter,
          WebkitMaskImage: `url("${maskUrl}")`,
          maskImage: `url("${maskUrl}")`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
        } : { filter }}
      />
    )
  }

  if (maskUrl) {
    return <img src={maskUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
  }

  return <div className="absolute inset-0 bg-slate-300" />
}

export default function BooyahsDiaOverlayView({ config, rows, context }: StreamOverlayRenderProps) {
  const cfg = (config.booyahsDia || {}) as any
  const mode = String(cfg.mode || 'cards')
  const totalCards = Math.max(rows.length || Number(context?.quantidadePartidas || 0), 1)
  const requestedColumns = Math.max(1, Math.min(8, num(cfg.columns, totalCards)))
  const columns = Math.min(totalCards, requestedColumns)
  const gap = num(cfg.gap, 18)
  const containerWidth = Math.min(1920, Math.max(320, num(cfg.containerWidth, 1840)))
  const autoFit = cfg.autoFit !== false
  const fittedCardWidth = Math.floor((containerWidth - gap * Math.max(0, columns - 1)) / columns)
  const cardWidth = autoFit ? fittedCardWidth : num(cfg.cardWidth, 292)
  const cardHeight = num(cfg.cardHeight, 470)
  const logoSize = num(cfg.logoSize, 150)
  const accent = cfg.accent || config.theme?.primary || '#82a82b'
  const textColor = cfg.text || config.theme?.text || '#1f2937'
  const gridWidth = columns * cardWidth + gap * Math.max(0, columns - 1)
  const gridLeft = autoFit ? Math.max(0, (1920 - gridWidth) / 2) : num(cfg.x, 36)
  const titleHeight = Math.max(54, Math.min(92, num(cfg.titleHeight, 78)))
  const statsHeight = Math.max(54, Math.min(92, num(cfg.statsHeight, 77)))
  const mapHeight = Math.max(120, cardHeight - titleHeight - statsHeight)
  const transitionName = String(config.animation?.transition || config.animation?.enter || 'fade')
  const transitionDuration = Math.max(100, Number(config.animation?.duration || 650))
  const lineDelay = Math.max(0, Number(config.animation?.lineDelay || 70))
  const lineByLine = Boolean(config.animation?.lineByLine)
  const artImageUrl = text(cfg.artImageUrl)
  const artFit = text(cfg.artFit, 'contain') as 'contain' | 'cover' | 'fill'
  const mapBackgroundUrl = text(cfg.mapBackgroundUrl)
  const nameBandBackgroundUrl = text(cfg.nameBandBackgroundUrl)
  const statsBackgroundUrl = text(cfg.statsBackgroundUrl)
  const statsBackground = text(cfg.statsBackground, '#ffffff')
  const statsText = text(cfg.statsText, textColor)
  const cards = Array.from({ length: totalCards }, (_, index) => rows[index] || {
    id: `queda-${index + 1}`,
    nome: '',
    tag: null,
    logo: null,
    grupo: null,
    quedas: 0,
    booyahs: 0,
    kills: 0,
    pontos: 0,
    mapa: context?.mapas?.[index] || `Queda ${index + 1}`,
    quedaNumero: index + 1,
    concluida: false,
  })
  const getCardAnimation = (index: number) => ({
    animation: `booyahs-dia-${transitionName} ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
    animationDelay: `${lineByLine ? index * lineDelay : 0}ms`,
  })

  return (
    <div className="absolute left-0 top-0 h-[1080px] w-[1920px] overflow-hidden bg-transparent uppercase">
      <style>{`
        @keyframes booyahs-dia-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes booyahs-dia-slide-up { from { opacity: 0; transform: translateY(1080px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes booyahs-dia-slide-down { from { opacity: 0; transform: translateY(-1080px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes booyahs-dia-slide-left { from { opacity: 0; transform: translateX(1920px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes booyahs-dia-slide-right { from { opacity: 0; transform: translateX(-1920px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes booyahs-dia-zoom { from { opacity: 0; transform: scale(.72); } to { opacity: 1; transform: scale(1); } }
        @keyframes booyahs-dia-flip { from { opacity: 0; transform: rotateX(72deg); } to { opacity: 1; transform: rotateX(0); } }
        @keyframes booyahs-dia-wipe { from { opacity: 0; clip-path: inset(0 100% 0 0); } to { opacity: 1; clip-path: inset(0 0 0 0); } }
        @keyframes booyahs-dia-blur { from { opacity: 0; filter: blur(14px); } to { opacity: 1; filter: blur(0); } }
        @keyframes booyahs-dia-elastic { 0% { opacity: 0; transform: scale(.78); } 68% { opacity: 1; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
      {mode === 'vertical-list' ? (
        <>
          {artImageUrl ? (
            <img
              src={artImageUrl}
              alt=""
              className="absolute object-contain"
              style={{
                left: num(cfg.artSideX, 80),
                top: num(cfg.artSideY, 160),
                width: num(cfg.artSideW, 720),
                height: num(cfg.artSideH, 620),
                objectFit: artFit,
                ...getCardAnimation(0),
              }}
            />
          ) : (
            <div
              className="absolute flex flex-col items-start"
              style={{
                left: num(cfg.sideX, 120),
                top: num(cfg.sideY, 160),
                width: num(cfg.sideW, 620),
                color: accent,
                ...getCardAnimation(0),
              }}
            >
              {String(cfg.sideImageUrl || context?.campeonato?.logo_url || '').trim() ? (
              <img
                src={String(cfg.sideImageUrl || context?.campeonato?.logo_url)}
                alt=""
                className="object-contain"
                style={{ width: num(cfg.sideImageSize, 160), height: num(cfg.sideImageSize, 160) }}
              />
            ) : null}
            <div
              className="mt-10 font-black italic leading-none"
              style={{
                fontSize: num(cfg.sideSmallSize, 54),
                transform: 'skewX(-8deg)',
              }}
            >
              {String(cfg.sideTitleSmall || 'BOOYAHS').toUpperCase()}
            </div>
            <div
              className="font-black italic leading-[0.86]"
              style={{
                fontSize: num(cfg.sideTitleSize, 150),
                transform: 'skewX(-8deg)',
              }}
            >
              {String(cfg.sideTitleMain || 'DO DIA').toUpperCase()}
            </div>
            </div>
          )}

          <div
            className="absolute flex flex-col"
            style={{
              left: num(cfg.listX, 940),
              top: num(cfg.listY, 160),
              width: num(cfg.listW, 820),
              gap,
            }}
          >
            {cards.map((row, index) => {
              const concluded = Boolean(row.concluida)
              const mapName = String(row.mapa || context?.mapas?.[index] || `Queda ${index + 1}`).toUpperCase()
              const filter = concluded ? cfg.mutedMapFilter || 'grayscale(1)' : cfg.pendingMapFilter || 'none'
              const listHeight = num(cfg.listH, 760)
              const rowHeight = Math.max(72, Math.min(num(cfg.listRowHeight, 132), Math.floor((listHeight - gap * Math.max(0, totalCards - 1)) / totalCards)))

              return (
                <div
                  key={`${row.id || index}-${config.animation?.testKey || 0}`}
                  className="relative overflow-hidden"
                  style={{
                    height: rowHeight,
                    ...getCardAnimation(index + 1),
                  }}
                >
                  <MapMedia imageUrl={row.mapaImagem} maskUrl={mapBackgroundUrl} alt={mapName} filter={filter} />
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="absolute inset-y-0 right-0 w-[28%]" style={{ background: `linear-gradient(90deg, transparent, ${accent})` }} />
                  <div
                    className="absolute inset-0 flex items-center justify-center px-6 text-center font-black text-white"
                    style={{
                      fontSize: Math.max(36, rowHeight * 0.42),
                      backgroundImage: nameBandBackgroundUrl ? `url("${nameBandBackgroundUrl}")` : undefined,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                    }}
                  >
                    {mapName}
                  </div>
                  {row.logo ? (
                    <img
                      src={row.logo}
                      alt={row.nome}
                      className="absolute right-8 top-1/2 object-contain"
                      style={{
                        width: num(cfg.listLogoSize, 120),
                        height: num(cfg.listLogoSize, 120),
                        transform: 'translateY(-50%)',
                      }}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </>
      ) : (
      <>
      {artImageUrl ? (
        <img
          src={artImageUrl}
          alt=""
          className="absolute"
          style={{
            left: num(cfg.artX, 0),
            top: num(cfg.artY, 20),
            width: num(cfg.artW, 1920),
            height: num(cfg.artH, 260),
            objectFit: artFit,
            ...getCardAnimation(0),
          }}
        />
      ) : null}
      <div
        className="absolute grid"
        style={{
          left: gridLeft,
          top: num(cfg.y, 360),
          gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
          gap,
        }}
      >
        {cards.map((row, index) => {
          const concluded = Boolean(row.concluida)
          const mapName = String(row.mapa || context?.mapas?.[index] || `Queda ${index + 1}`).toUpperCase()
          const matchLabel = `${mapName} ${row.quedaNumero || index + 1}`
          const filter = concluded ? cfg.mutedMapFilter || 'grayscale(1)' : cfg.pendingMapFilter || 'none'

          return (
            <div
              key={`${row.id || index}-${config.animation?.testKey || 0}`}
              className="overflow-hidden border bg-white"
              style={{
                width: cardWidth,
                height: cardHeight,
                borderColor: cfg.cardBorderColor || 'rgba(0,0,0,0.15)',
                borderWidth: num(cfg.cardBorderWidth, 1),
                borderRadius: num(cfg.cardRadius, 0),
                background: cfg.cardBackground || '#ffffff',
                ...getCardAnimation(index),
              }}
            >
              <div className="relative overflow-hidden bg-slate-300" style={{ height: mapHeight }}>
                <MapMedia imageUrl={row.mapaImagem} maskUrl={mapBackgroundUrl} alt={mapName} filter={filter} />
                <div className="absolute inset-0 bg-black/10" />
                {row.logo ? (
                  <img
                    src={row.logo}
                    alt={row.nome}
                    className="absolute left-1/2 top-1/2 object-contain"
                    style={{
                      width: logoSize,
                      height: logoSize,
                      left: num(cfg.logoX, 0) > 0 ? num(cfg.logoX, cardWidth / 2) : '50%',
                      top: num(cfg.logoY, 0) > 0 ? num(cfg.logoY, mapHeight / 2) : '50%',
                      transform: num(cfg.logoX, 0) > 0 || num(cfg.logoY, 0) > 0 ? 'translate(0, 0)' : 'translate(-50%, -50%)',
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-5xl font-black text-white/65">?</div>
                )}
              </div>

              <div
                className="flex items-center justify-center px-4 text-center font-black leading-none text-white"
                style={{
                  height: titleHeight,
                  background: nameBandBackgroundUrl ? accent : accent,
                  backgroundImage: nameBandBackgroundUrl ? `url("${nameBandBackgroundUrl}")` : undefined,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  fontSize: num(cfg.titleFontSize, Math.max(24, Math.min(38, cardWidth * 0.105))),
                  color: cfg.titleText || '#ffffff',
                  paddingLeft: num(cfg.titlePaddingX, 16),
                  paddingRight: num(cfg.titlePaddingX, 16),
                }}
              >
                {matchLabel}
              </div>

              <div
                className="grid grid-cols-2 items-center font-black leading-none"
                style={{
                  height: statsHeight,
                  color: statsText,
                  background: statsBackground,
                  backgroundImage: statsBackgroundUrl ? `url("${statsBackgroundUrl}")` : undefined,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  fontSize: num(cfg.statsFontSize, Math.max(21, Math.min(30, cardWidth * 0.08))),
                  paddingLeft: num(cfg.statsPaddingX, 20),
                  paddingRight: num(cfg.statsPaddingX, 20),
                }}
              >
                <div>{concluded ? `${row.pontos} PTS` : '-'}</div>
                <div className="text-right">{concluded ? `${row.kills} ABT.` : '-'}</div>
              </div>
            </div>
          )
        })}
      </div>
      </>
      )}
    </div>
  )
}
