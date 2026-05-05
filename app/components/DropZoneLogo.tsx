'use client'
import React from 'react'

interface LogoProps {
 size?: 'sm' | 'md' | 'lg' | 'xl'
 animated?: boolean
}

export function DropZoneLogo({ size = 'md', animated = true }: LogoProps) {
 const sizes = {
 sm: 'scale-[0.4]',
 md: 'scale-[0.6]',
 lg: 'scale-[1.0]',
 xl: 'scale-[1.5]'
 }

 return (
 <div className={`relative flex items-center justify-center ${sizes[size]} h-24 w-24`}>
 <style jsx>{`
 .cube-wrapper {
 perspective: 800px;
 }
 .cube {
 position: relative;
 width: 60px;
 height: 60px;
 transform-style: preserve-3d;
 transform: rotateX(-20deg) rotateY(40deg);
 ${animated ? 'animation: float 4s ease-in-out infinite;' : ''}
 }
 
 @keyframes float {
 0%, 100% { transform: rotateX(-20deg) rotateY(40deg) translateY(0px); }
 50% { transform: rotateX(-20deg) rotateY(40deg) translateY(-8px); }
 }

 .face {
 position: absolute;
 width: 60px;
 height: 60px;
 display: flex;
 align-items: center;
 justify-content: center;
 font-family: 'Orbitron', sans-serif;
 font-weight: 900;
 font-size: 38px;
 /* Bordas grossas e laranjas conforme a logo */
 border: 5px solid #ff5e00; 
 background: #000;
 }

 /* LADO ESQUERDO: Letra D (VAZADA) */
 .front { 
 transform: translateZ(30px);
 color: #ff5e00;
 -webkit-text-stroke: 2px #ff5e00; /* D apenas com contorno */
 border-right: 2px solid #ff5e00;
 }

 /* LADO DIREITO: Letra Z (PREENCHIDA) */
 .right { 
 transform: rotateY(90deg) translateZ(30px);
 background: #ff5e00;
 color: #ff5e00; /* Z sólido */
 border-left: 2px solid #ff5e00;
 }

 /* TOPO: Letra D (Destaque Branco/Vazado) */
 .top { 
 transform: rotateX(90deg) translateZ(30px);
 background: #ff5e00;
 color: #fff;
 font-size: 30px;
 border: 4px solid #ff5e00;
 }
 
 /* Detalhes de iluminação */
 .cube::after {
 content: '';
 position: absolute;
 width: 100%;
 height: 100%;
 box-: 0 0 20px rgba(255, 94, 0, 0.2);
 transform: translateZ(-30px);
 }
 `}</style>

 <div className="cube-wrapper">
 <div className="cube">
 {/* Face com D Vazado */}
 <div className="face front">Z</div>
 {/* Face com Z Preenchido */}
 <div className="face right">X</div>
 {/* Face de Cima */}
 <div className="face top">D</div>
 </div>
 </div>
 
 {/* Sombra projetada */}
 <div className="absolute -bottom-6 w-14 h-3 bg-orange-600/10 blur-xl rounded-full" />
 </div>
 )
}