'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
 FaceLandmarker,
 FilesetResolver,
 type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

type GuiaStatus =
 | 'carregando'
 | 'centralize'
 | 'aproxime'
 | 'afaste'
 | 'alinhado'
 | 'sem_rosto'
 | 'erro_camera'

function dataUrlToFile(dataUrl: string, fileName: string) {
 const arr = dataUrl.split(',')
 const mime = arr[0]?.match(/:(.*?);/)?.[1] || 'image/jpeg'
 const bstr = atob(arr[1] || '')
 let n = bstr.length
 const u8arr = new Uint8Array(n)

 while (n--) {
 u8arr[n] = bstr.charCodeAt(n)
 }

 return new File([u8arr], fileName, { type: mime })
}

function getMensagem(status: GuiaStatus) {
 switch (status) {
 case 'carregando':
 return 'Iniciando câmera e detector facial...'
 case 'sem_rosto':
 return 'Nenhum rosto detectado. Posicione o rosto dentro do círculo.'
 case 'aproxime':
 return 'Aproxime o rosto até preencher melhor o círculo.'
 case 'afaste':
 return 'Afaste um pouco o rosto. Está perto demais da câmera.'
 case 'centralize':
 return 'Centralize o rosto dentro do círculo.'
 case 'alinhado':
 return 'Rosto alinhado. Pode capturar a selfie.'
 case 'erro_camera':
 return 'Não foi possível abrir a câmera. Use o botão de foto abaixo.'
 default:
 return 'Posicione o rosto dentro do círculo.'
 }
}

function getBarraClasse(status: GuiaStatus) {
 if (status === 'alinhado') return 'bg-lime-500'
 if (status === 'erro_camera') return 'bg-red-500'
 if (status === 'sem_rosto') return 'bg-amber-500'
 return 'bg-sky-500'
}

export default function SelfiePage() {
 const searchParams = useSearchParams()
 const userId = searchParams.get('user') || ''

 const videoRef = useRef<HTMLVideoElement>(null)
 const canvasRef = useRef<HTMLCanvasElement>(null)
 const streamRef = useRef<MediaStream | null>(null)
 const rafRef = useRef<number | null>(null)
 const faceLandmarkerRef = useRef<FaceLandmarker | null>(null)
 const ultimaDeteccaoRef = useRef<number>(-1)

 const [image, setImage] = useState<string | null>(null)
 const [erro, setErro] = useState('')
 const [enviando, setEnviando] = useState(false)
 const [enviado, setEnviado] = useState(false)
 const [cameraIniciada, setCameraIniciada] = useState(false)
 const [statusGuia, setStatusGuia] = useState<GuiaStatus>('carregando')
 const [capturaLiberada, setCapturaLiberada] = useState(false)
 const [statusTexto, setStatusTexto] = useState(getMensagem('carregando'))

 useEffect(() => {
 let ativo = true

 async function iniciar() {
 try {
 setErro('')
 setStatusGuia('carregando')
 setStatusTexto(getMensagem('carregando'))

 if (!navigator.mediaDevices?.getUserMedia) {
 throw new Error('Seu navegador não liberou getUserMedia nesta página.')
 }

 const vision = await FilesetResolver.forVisionTasks(
 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
 )

 const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
 baseOptions: {
 modelAssetPath:
 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
 },
 runningMode: 'VIDEO',
 numFaces: 1,
 outputFaceBlendshapes: false,
 outputFacialTransformationMatrixes: false,
 })

 if (!ativo) {
 faceLandmarker.close()
 return
 }

 faceLandmarkerRef.current = faceLandmarker

 const stream = await navigator.mediaDevices.getUserMedia({
 video: {
 facingMode: 'user',
 width: { ideal: 1080 },
 height: { ideal: 1440 },
 },
 audio: false,
 })

 if (!ativo) {
 stream.getTracks().forEach((track) => track.stop())
 return
 }

 streamRef.current = stream

 if (videoRef.current) {
 videoRef.current.srcObject = stream
 await videoRef.current.play()
 }

 setCameraIniciada(true)

 const loop = () => {
 const video = videoRef.current
 const detector = faceLandmarkerRef.current

 if (!ativo || !video || !detector || video.readyState < 2) {
 rafRef.current = requestAnimationFrame(loop)
 return
 }

 const tempoAtual = performance.now()

 if (video.currentTime !== ultimaDeteccaoRef.current) {
 ultimaDeteccaoRef.current = video.currentTime

 const resultado = detector.detectForVideo(video, tempoAtual)
 atualizarGuia(resultado)
 }

 rafRef.current = requestAnimationFrame(loop)
 }

 rafRef.current = requestAnimationFrame(loop)
 } catch (error: any) {
 console.error(error)
 if (!ativo) return
 setStatusGuia('erro_camera')
 setStatusTexto(getMensagem('erro_camera'))
 setErro(
 error?.message ||
 'Não foi possível abrir a câmera. Se estiver em HTTP local, alguns celulares vão bloquear a câmera.'
 )
 }
 }

 function atualizarGuia(resultado: FaceLandmarkerResult) {
 const face = resultado.faceLandmarks?.[0]

 if (!face || face.length === 0) {
 setCapturaLiberada(false)
 setStatusGuia('sem_rosto')
 setStatusTexto(getMensagem('sem_rosto'))
 return
 }

 const xs = face.map((p) => p.x)
 const ys = face.map((p) => p.y)

 const minX = Math.min(...xs)
 const maxX = Math.max(...xs)
 const minY = Math.min(...ys)
 const maxY = Math.max(...ys)

 const largura = maxX - minX
 const altura = maxY - minY
 const centroX = minX + largura / 2
 const centroY = minY + altura / 2

 const offsetX = Math.abs(centroX - 0.5)
 const offsetY = Math.abs(centroY - 0.46)

 const centralizado = offsetX < 0.12 && offsetY < 0.15
 const tamanhoPequeno = largura < 0.28 || altura < 0.34
 const tamanhoGrande = largura > 0.62 || altura > 0.72

 if (!centralizado) {
 setCapturaLiberada(false)
 setStatusGuia('centralize')
 setStatusTexto(getMensagem('centralize'))
 return
 }

 if (tamanhoPequeno) {
 setCapturaLiberada(false)
 setStatusGuia('aproxime')
 setStatusTexto(getMensagem('aproxime'))
 return
 }

 if (tamanhoGrande) {
 setCapturaLiberada(false)
 setStatusGuia('afaste')
 setStatusTexto(getMensagem('afaste'))
 return
 }

 setCapturaLiberada(true)
 setStatusGuia('alinhado')
 setStatusTexto(getMensagem('alinhado'))
 }

 iniciar()

 return () => {
 ativo = false

 if (rafRef.current != null) {
 cancelAnimationFrame(rafRef.current)
 }

 if (streamRef.current) {
 streamRef.current.getTracks().forEach((track) => track.stop())
 }

 if (faceLandmarkerRef.current) {
 faceLandmarkerRef.current.close()
 }
 }
 }, [])

 const capturar = () => {
 const video = videoRef.current
 const canvas = canvasRef.current

 if (!video || !canvas || !capturaLiberada) return

 canvas.width = video.videoWidth || 1080
 canvas.height = video.videoHeight || 1440

 const ctx = canvas.getContext('2d')
 if (!ctx) return

 ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

 const data = canvas.toDataURL('image/jpeg', 0.92)
 setImage(data)
 setErro('')
 }

 const refazer = () => {
 setImage(null)
 setEnviado(false)
 setErro('')
 }

 const aoEscolherArquivo = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0]
 if (!file) return

 const reader = new FileReader()
 reader.onload = () => {
 if (typeof reader.result === 'string') {
 setImage(reader.result)
 }
 }
 reader.readAsDataURL(file)
 }

 const enviar = async () => {
 if (!image) return
 if (!userId) {
 setErro('Link inválido. O parâmetro do usuário não foi encontrado.')
 return
 }

 setEnviando(true)
 setErro('')

 try {
 const { data: authData } = await supabase.auth.getUser()
 const authUserId = authData.user?.id

 if (!authUserId) {
 throw new Error('Faça login no celular com a mesma conta para enviar a selfie neste ambiente local.')
 }

 if (authUserId !== userId) {
 throw new Error('O usuário logado no celular é diferente do usuário do QR Code.')
 }

 const file = dataUrlToFile(image, `selfie-${authUserId}.jpg`)
 const filePath = `kyc/${authUserId}-${Date.now()}-selfie-mobile.jpg`

 const { error: uploadError } = await supabase.storage
 .from('documentos')
 .upload(filePath, file, { upsert: true, contentType: 'image/jpeg' })

 if (uploadError) throw uploadError

 const { data: publicData } = supabase.storage.from('documentos').getPublicUrl(filePath)
 const selfieUrl = publicData.publicUrl

 const { error: updateError } = await supabase.from('wallet_kyc').upsert({
 user_id: authUserId,
 selfie_url: selfieUrl,
 selfie_status: 'enviada',
 updated_at: new Date().toISOString(),
 })

 if (updateError) throw updateError

 setEnviado(true)
 } catch (error: any) {
 console.error(error)
 setErro(error?.message || 'Não foi possível enviar a selfie.')
 } finally {
 setEnviando(false)
 }
 }

 return (
 <div className="min-h-screen bg-white px-4 py-6 text-[#142340]">
 <div className="mx-auto max-w-md border border-zinc-200 bg-white p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lime-400">
 Verificação de identidade
 </div>
 <h1 className="mt-2 text-2xl font-semibold uppercase">Selfie guiada</h1>
 <p className="mt-2 text-sm font-semibold text-zinc-600">
 Encaixe o rosto no círculo. O botão libera quando a posição estiver válida.
 </p>

 {!image ? (
 <>
 <div className="relative mt-4 overflow-hidden border border-zinc-200 bg-white">
 <video ref={videoRef} autoPlay playsInline muted className="aspect-[3/4] w-full object-cover" />

 <div className="pointer-events-none absolute inset-0">
 <div className="absolute inset-0 bg-white/35" />
 <div className="absolute left-1/2 top-[47%] h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-zinc-200 -[0_0_0_9999px_rgba(0,0,0,0.45)]" />
 <div
 className={`absolute left-1/2 top-[86%] h-2 w-[76%] -translate-x-1/2 rounded-full ${getBarraClasse(statusGuia)}`}
 />
 </div>
 </div>

 <div className="mt-4 border border-zinc-200 bg-[#f7f7f7] p-3">
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Orientação</div>
 <div className="mt-2 text-sm font-semibold text-[#142340]">{statusTexto}</div>
 </div>

 <button
 type="button"
 onClick={capturar}
 disabled={!cameraIniciada || !capturaLiberada}
 className="mt-4 h-12 w-full border border-lime-400 bg-lime-400 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340] disabled:cursor-not-allowed disabled:opacity-50"
 >
 {capturaLiberada ? 'Capturar selfie' : 'Aguardando alinhamento'}
 </button>

 <div className="mt-4 border border-zinc-200 bg-[#f7f7f7] p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 Fallback de captura
 </div>
 <p className="mt-2 text-xs font-semibold text-zinc-500">
 Se o navegador bloquear a câmera, use este botão para tirar ou escolher a foto.
 </p>

 <label className="mt-3 block cursor-pointer border border-white bg-transparent px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340]">
 Tirar ou escolher foto
 <input
 type="file"
 accept="image/*"
 capture="user"
 onChange={aoEscolherArquivo}
 className="hidden"
 />
 </label>
 </div>
 </>
 ) : (
 <>
 <div className="mt-4 overflow-hidden border border-zinc-200 bg-white">
 <img src={image} alt="Prévia da selfie" className="aspect-[3/4] w-full object-cover" />
 </div>

 <div className="mt-4 grid gap-3 sm:grid-cols-2">
 <button
 type="button"
 onClick={refazer}
 className="h-12 border border-white bg-transparent text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340]"
 >
 Refazer
 </button>
 <button
 type="button"
 onClick={enviar}
 disabled={enviando}
 className="h-12 border border-lime-400 bg-lime-400 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340] disabled:opacity-60"
 >
 {enviando ? 'Enviando...' : 'Enviar selfie'}
 </button>
 </div>
 </>
 )}

 {enviado ? (
 <div className="mt-4 border border-lime-400 bg-lime-950/40 p-3 text-sm font-semibold text-lime-300">
 Selfie enviada com sucesso. Volte ao desktop e clique em atualizar status da selfie.
 </div>
 ) : null}

 {erro ? (
 <div className="mt-4 border border-red-500 bg-red-950/40 p-3 text-sm font-semibold text-red-300">{erro}</div>
 ) : null}

 <canvas ref={canvasRef} className="hidden" />
 </div>
 </div>
 )
}
