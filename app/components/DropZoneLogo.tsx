'use client'

interface LogoProps {
  className?: string
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'blue' | 'dark' | 'white'
}

const colors = {
  blue: ['#60A5FA', '#2563FF', '#1D4ED8'],
  dark: ['#0A0D14', '#0A0D14', '#0A0D14'],
  white: ['#FFFFFF', '#FFFFFF', '#FFFFFF'],
}

export function DropZoneLogo({
  className = '',
  animated = true,
  size = 'md',
  variant = 'blue',
}: LogoProps) {
  const [start, middle, end] = colors[variant]
  const sizeClass = size === 'sm' ? 'max-w-[120px]' : size === 'lg' ? 'max-w-[280px]' : 'max-w-[190px]'

  return (
    <div className={`dz-logo ${animated ? 'dz-logo-animated' : ''} ${sizeClass} ${className}`}>
      <svg
        viewBox="0 0 3024.12 2385.97"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Drop Zone"
      >
        <defs>
          <linearGradient id="dropzoneLogoGradient" x1="0" y1="0" x2="3024.12" y2="2385.97">
            <stop offset="0" stopColor={start} />
            <stop offset="0.42" stopColor={middle} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
        </defs>
        <polygon
          points="1357.9,2.21 1.48,562.06 1.48,1787.87 1357.9,1228.03"
          fill="url(#dropzoneLogoGradient)"
        />
        <polygon
          points="1666.22,2.21 3022.64,562.06 3022.64,1787.87 1666.22,1228.03"
          fill="url(#dropzoneLogoGradient)"
        />
        <polygon
          points="1511.9,1498.61 402.95,1956.32 1597.67,2384.38 2621.78,1956.36"
          fill="url(#dropzoneLogoGradient)"
        />
      </svg>

      <style jsx>{`
        .dz-logo {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: center;
        }

        .dz-logo svg {
          display: block;
          height: auto;
          width: 100%;
          filter: drop-shadow(0 10px 18px rgba(37, 99, 235, 0.2));
        }

        .dz-logo-animated svg {
          animation: dzLogoFloat 4.5s ease-in-out infinite;
        }

        @keyframes dzLogoFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dz-logo-animated svg {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

export default DropZoneLogo
