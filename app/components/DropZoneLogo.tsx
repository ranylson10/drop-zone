'use client'

import React from 'react'

interface LogoProps {
  className?: string
  animated?: boolean
}

const LOGO_SVG = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<!-- Creator: CorelDRAW -->\n<svg xmlns=\"http://www.w3.org/2000/svg\" xml:space=\"preserve\" width=\"332.56mm\" height=\"118.202mm\" version=\"1.1\" style=\"shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd\"\nviewBox=\"0 0 24807.56 8817.39\"\n xmlns:xlink=\"http://www.w3.org/1999/xlink\"\n xmlns:xodm=\"http://www.corel.com/coreldraw/odm/2003\">\n<defs>\n  <linearGradient id=\"dzDropSilver\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n    <stop offset=\"0%\" stop-color=\"#ffffff\"/>\n    <stop offset=\"38%\" stop-color=\"#f3f7ff\"/>\n    <stop offset=\"62%\" stop-color=\"#d7e0ef\"/>\n    <stop offset=\"100%\" stop-color=\"#ffffff\"/>\n  </linearGradient>\n\n  <linearGradient id=\"dzBluePurple\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n    <stop offset=\"0%\" stop-color=\"#22d3ee\"/>\n    <stop offset=\"35%\" stop-color=\"#2f7bff\"/>\n    <stop offset=\"70%\" stop-color=\"#7c3cff\"/>\n    <stop offset=\"100%\" stop-color=\"#c044ff\"/>\n  </linearGradient>\n\n  <linearGradient id=\"dzStrokeGlow\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n    <stop offset=\"0%\" stop-color=\"#22d3ee\"/>\n    <stop offset=\"55%\" stop-color=\"#4f7cff\"/>\n    <stop offset=\"100%\" stop-color=\"#a855f7\"/>\n  </linearGradient>\n\n  <filter id=\"dzSoftGlow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\">\n    <feGaussianBlur stdDeviation=\"2.6\" result=\"blur\"/>\n    <feColorMatrix in=\"blur\" type=\"matrix\"\n      values=\"0 0 0 0 0.10\n              0 0 0 0 0.70\n              0 0 0 0 1.00\n              0 0 0 0.55 0\" result=\"cyanGlow\"/>\n    <feMerge>\n      <feMergeNode in=\"cyanGlow\"/>\n      <feMergeNode in=\"SourceGraphic\"/>\n    </feMerge>\n  </filter>\n</defs>\n\n<style>\n  svg {\n    overflow: visible;\n  }\n\n  /* Base recolor sem mexer na estrutura */\n  path, polygon, rect, circle, ellipse {\n    transition: filter .25s ease, opacity .25s ease;\n  }\n\n  /* Textos/partes escuras do DROP */\n  [fill=\"#000\"], [fill=\"#000000\"], [fill=\"black\"],\n  [style*=\"fill:#000\"], [style*=\"fill: #000\"],\n  [style*=\"fill:black\"], [style*=\"fill: black\"] {\n    fill: url(#dzDropSilver) !important;\n  }\n\n  /* Tons cinza antigos viram prata */\n  [fill=\"#808080\"], [fill=\"#999999\"], [fill=\"#A0A0A0\"], [fill=\"#B0B0B0\"], [fill=\"#C0C0C0\"],\n  [fill=\"#818181\"], [fill=\"#8A8A8A\"], [fill=\"#909090\"], [fill=\"#9A9A9A\"], [fill=\"#AAAAAA\"],\n  [style*=\"fill:#808080\"], [style*=\"fill:#999999\"], [style*=\"fill:#A0A0A0\"],\n  [style*=\"fill:#B0B0B0\"], [style*=\"fill:#C0C0C0\"] {\n    fill: url(#dzDropSilver) !important;\n  }\n\n  /* Brancos continuam vivos */\n  [fill=\"#fff\"], [fill=\"#ffffff\"], [fill=\"white\"],\n  [style*=\"fill:#fff\"], [style*=\"fill:#ffffff\"], [style*=\"fill:white\"] {\n    fill: #f8fbff !important;\n  }\n\n  /* Azuis/roxos gen\u00e9ricos ganham gradiente LEALT */\n  [fill=\"#0000ff\"], [fill=\"#00f\"], [fill=\"blue\"],\n  [fill=\"#3366ff\"], [fill=\"#0066ff\"], [fill=\"#0099ff\"],\n  [fill=\"#6633ff\"], [fill=\"#6600ff\"], [fill=\"#9900ff\"], [fill=\"#cc00ff\"],\n  [style*=\"fill:#0000ff\"], [style*=\"fill:#00f\"], [style*=\"fill:blue\"],\n  [style*=\"fill:#3366ff\"], [style*=\"fill:#0066ff\"], [style*=\"fill:#0099ff\"],\n  [style*=\"fill:#6633ff\"], [style*=\"fill:#6600ff\"], [style*=\"fill:#9900ff\"], [style*=\"fill:#cc00ff\"] {\n    fill: url(#dzBluePurple) !important;\n  }\n\n  /* Linhas/strokes recebem brilho cyan/roxo */\n  [stroke]:not([stroke=\"none\"]) {\n    stroke: url(#dzStrokeGlow) !important;\n  }\n</style>\n\n <defs>\n  <style type=\"text/css\">\n   <![CDATA[\n    .str0 {stroke:#373435;stroke-width:14.92;stroke-miterlimit:22.9256}\n    .fil0 {fill:#96989A}\n   ]]>\n  </style>\n </defs>\n <g id=\"Camada_x0020_1\">\n  <metadata id=\"CorelCorpID_0Corel-Layer\"/>\n  <path class=\"fil0 str0\" d=\"M11006.44 3869.71l-308.07 1378.01c285.28,-1.07 577.56,-3.6 805.3,-8.83l5.83 0c1184.33,-0.01 903.76,1065.84 903,1068.9l-0.28 -0.07c-3.74,14.65 -46.56,178.94 -209.64,700.6 -84.58,270.55 -238.24,456.38 -406.76,583.25 -264.04,198.79 -570.99,243.49 -690.23,246.99l1222.43 933.57 878.32 -3311.07 -2199.89 -1591.36z\"/>\n  <path class=\"fil0 str0\" d=\"M861.41 5528.51l-851.47 2919.3 1946.2 0c0,0 775.44,38.01 1049.12,-745.03 273.68,-783.04 440.94,-1467.25 440.94,-1467.25 0,0 174.84,-714.62 -684.21,-707.02l-752.63 7.6 -471.35 646.2 843.86 -7.6c0,0 281.29,-15.2 212.87,273.68 -68.42,288.89 -311.69,1087.14 -311.69,1087.14 0,0 -91.24,281.29 -448.54,281.29 -357.31,0 -851.46,0 -851.46,0l713.62 -2425.14 -835.26 136.84z\"/>\n  <path class=\"fil0 str0\" d=\"M3837.06 5536.11l-821.05 2904.1 745.03 7.6 273.68 -935.09 600.59 7.6 311.69 919.88 859.07 -15.21 -372.52 -973.09c0,0 532.17,-45.62 684.21,-539.77 152.05,-494.15 205.27,-684.21 205.27,-684.21 0,0 184.31,-699.42 -613.94,-699.42 -661.4,15.21 -1872.03,7.6 -1872.03,7.6zm562.57 608.19l-205.12 782.9 934.95 7.74c0,0 212.87,22.8 288.89,-197.66 76.02,-220.46 114.03,-410.52 114.03,-410.52 0,0 45.62,-144.44 -159.65,-167.25 -205.27,-22.81 -973.1,-15.2 -973.1,-15.2z\"/>\n  <path class=\"fil0 str0\" d=\"M7383.18 5528.51c0,0 -714.62,53.22 -889.47,684.21 -174.85,630.99 -418.13,1497.66 -418.13,1497.66 0,0 -258.48,722.23 600.59,722.23 859.07,0 1193.57,0 1193.57,0 0,0 722.23,76.01 950.3,-669.01 228.07,-745.02 456.14,-1528.07 456.14,-1528.07 0,0 228.08,-722.23 -608.19,-707.02 -836.26,15.21 -1284.8,0 -1284.8,0zm980.42 615.8l-820.77 0c0,0 -266.08,7.59 -334.5,250.87 -68.42,243.28 -342.1,1185.68 -342.1,1185.68 0,0 -98.83,258.47 167.25,258.47 266.08,0 760.52,7.61 760.52,7.61 0,0 250.87,30.41 334.5,-258.48 83.63,-288.89 356.74,-1193.29 356.74,-1193.29 0,0 68.42,-235.67 -121.64,-250.87z\"/>\n  <path class=\"fil0 str0\" d=\"M9637.47 5543.71l-821.05 2904.1 745.03 7.6 273.68 -935.09 1257.09 21.24c130.37,-1.17 656.51,-79.85 825.95,-621.82 169.44,-541.97 205.27,-684.21 205.27,-684.21 0,0 184.31,-699.42 -613.94,-699.42 -661.4,15.21 -1872.03,7.6 -1872.03,7.6zm562.57 608.19l-205.12 782.9 934.95 7.74c0,0 212.87,22.8 288.89,-197.66 76.02,-220.46 114.03,-410.52 114.03,-410.52 0,0 45.62,-144.44 -159.65,-167.25 -205.27,-22.81 -973.1,-15.2 -973.1,-15.2z\"/>\n  <path class=\"fil0 str0\" d=\"M11128.09 3853.36l2157.23 1533.55 2826.39 -315.82 -1387.04 -935.36 -736.17 477.97 40.96 55.92 -66.88 11.66 30.21 68.85 69.62 73.03 57.75 -36.07 -115.51 72.15 -146.48 54.79 -216.23 5.18 -286.01 -44.39 -231.28 -118.31 -124.36 -153.88 0.78 -51.49 202.83 -11.31 -41.95 -46.64 -101.03 -20.11 121.83 -43.33 -564.97 -750.67 -1489.71 174.26zm3497.79 215.74l-364.83 -246.02 -423.73 624.54 84.17 46.44 -46.93 88.8 751.31 -513.76zm-450.23 -303.61l-339.45 -228.91 -585.35 68.47 172.9 718.98c0,0 239.2,-44.95 339.16,73.49l412.73 -632.03zm-1024.89 -148.73l-411.43 48.13 552.05 757.63 60.07 -35.81 -200.7 -769.95zm32.02 813.01l65.12 49.11 57.32 34.21 -122.44 -83.32z\"/>\n  <path class=\"fil0 str0\" d=\"M13880.11 11.66c0,0 -1207.73,292.65 -1448.08,1415.32 0,0 195.17,104.9 289.92,249.51 0,0 -44,68.74 -42.59,170.82 0,0 -678.78,-712.19 -1399.31,-185.14l1459.29 2002.72 -121.52 14.21 -1511.24 -2008c0,0 174.45,-1761.3 2773.54,-1659.44zm1208.75 2355.37l103.27 83.7 -931.08 1372.35 -85.4 -57.59 913.21 -1398.46zm-2251.14 -480.04l-131.03 26.19 444.08 1703.58 100.1 -11.71 -413.14 -1718.06zm2116.01 -1638.44c0,0 1021.05,833.76 673.03,1930.72 0,0 -143.41,-27.41 -349.75,78.72l-38.18 130.06c0,0 838.21,-258.55 1242.54,412.25l-1855.49 1268.8 98.79 66.63 1917.83 -1245.18c0,0 646.43,-1668.83 -1688.78,-2641.99zm-2100.26 1593.11c0,0 -1.48,-148.13 -101.67,-172.62 0,0 256.5,-1439.56 1412.56,-1639.4 0,0 251.78,-57.57 635.2,178.18 1090.31,1186.47 662.87,1715.47 422.91,2023 -1012.88,-997.98 -2028.12,-511.54 -2369,-389.16z\"/>\n  <path class=\"fil0 str0\" d=\"M16258.84 5159.11l-2938.87 341.33 -891.14 3308.01 2970.39 -410.55 859.62 -3238.8zm-2405.03 857.55l1581.47 -162.81 -94.36 433.45 -1302.43 1256.72 970.8 -106.65 -111.99 447.7 -1626.43 206.41 96.05 -449.39 1312.11 -1271.81 -949.42 133.1 124.2 -486.72z\"/>\n  <path class=\"fil0 str0\" d=\"M17154.56 5539.69c0,0 -714.62,53.22 -889.47,684.21 -174.85,630.99 -418.13,1497.66 -418.13,1497.66 0,0 -258.48,722.23 600.59,722.23 859.07,0 1193.57,0 1193.57,0 0,0 722.23,76.01 950.3,-669.01 228.07,-745.02 456.14,-1528.07 456.14,-1528.07 0,0 228.08,-722.23 -608.19,-707.02 -836.26,15.21 -1284.8,0 -1284.8,0zm980.42 615.8l-820.77 0c0,0 -266.08,7.59 -334.5,250.87 -68.42,243.28 -342.1,1185.68 -342.1,1185.68 0,0 -98.83,258.47 167.25,258.47 266.08,0 760.52,7.61 760.52,7.61 0,0 250.87,30.41 334.5,-258.48 83.63,-288.89 356.74,-1193.29 356.74,-1193.29 0,0 68.42,-235.67 -121.64,-250.87z\"/>\n  <polygon class=\"fil0 str0\" points=\"19417.92,5534.76 18572.83,8450.32 19333.41,8441.86 19840.47,6667.18 20623.42,8438.9 21370.07,8441.86 22189.81,5543.21 21454.58,5543.21 20947.53,7284.09 20178.5,5534.76 \"/>\n  <path class=\"fil0 str0\" d=\"M24619.85 6156.36l177.81 -622.36 -1889.29 0c0,0 -561.22,11.12 -722.37,616.8 -161.15,605.68 -450.1,1600.33 -450.1,1600.33 0,0 -222.27,694.59 416.75,694.59 639.02,0 1839.28,0 1839.28,0l177.81 -611.24 -1567 5.56c0,0 -150.03,5.56 -94.46,-172.26 55.57,-177.82 116.69,-405.64 116.69,-405.64l1494.76 0 177.81 -600.12 -1494.76 -5.56 94.47 -327.85c0,0 16.67,-183.37 255.61,-183.37 238.94,0 1466.97,11.11 1466.97,11.11z\"/>\n </g>\n</svg>\n"

export function DropZoneLogo({
  className = '',
  animated = true,
}: LogoProps) {
  return (
    <div className={`dz-logo-svg ${animated ? 'dz-animated' : ''} ${className}`}>
      <style jsx>{`
        .dz-logo-svg {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          isolation: isolate;
        }

        .dz-logo-svg :global(svg) {
          width: 100%;
          height: auto;
          max-width: 100%;
          display: block;
          overflow: visible;
          filter:
            drop-shadow(0 0 8px rgba(0, 102, 117, 1.32))
            drop-shadow(0 0 18px rgba(124, 58, 237, .01));
        }

        .dz-animated::after {
          content: '';
          position: absolute;
          inset: -40%;
          background: linear-gradient(
            110deg,
            transparent 100%,
            transparent 100%,
            rgba(255, 0, 0, 0.92) 48%,
            rgba(34,211,238,.28) 50%,
            rgba(192,68,255,.22) 52%,
            transparent 58%,
            transparent 100%
          );
          transform: translateX(-130%) skewX(-18deg);
          mix-blend-mode: screen;
          pointer-events: none;
          animation: dzSweep 4.8s ease-in-out infinite;
        }

        .dz-animated :global(svg) {
          animation: dzFloat 5s ease-in-out infinite;
        }

        @keyframes dzSweep {
          0%, 62% {
            transform: translateX(-130%) skewX(-18deg);
            opacity: 0;
          }
          72% {
            opacity: 1;
          }
          100% {
            transform: translateX(130%) skewX(-18deg);
            opacity: 0;
          }
        }

        @keyframes dzFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .dz-animated::after,
          .dz-animated :global(svg) {
            animation: none !important;
          }
        }
      `}</style>

      <div className="dz-svg-inner" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
    </div>
  )
}

export default DropZoneLogo
