declare const require: any

type SoundName = 'tap' | 'success' | 'error' | 'message' | 'notify'

const SOUND_FILES: Record<SoundName, any> = {
  tap: require('../../assets/sounds/tap.wav'),
  success: require('../../assets/sounds/success.wav'),
  error: require('../../assets/sounds/error.wav'),
  message: require('../../assets/sounds/message.wav'),
  notify: require('../../assets/sounds/notify.wav')
}

let enabled = true
let volume = 0.85

export function setAppSoundsEnabled(value: boolean) {
  enabled = value
}

export function setAppSoundVolume(value: number) {
  volume = Math.max(0, Math.min(1, value))
}

export async function playAppSound(name: SoundName = 'tap') {
  if (!enabled) return
  try {
    const av = require('expo-av')
    const Audio = av?.Audio
    if (!Audio?.Sound?.createAsync) return
    const { sound } = await Audio.Sound.createAsync(SOUND_FILES[name] || SOUND_FILES.tap, { shouldPlay: true, volume })
    setTimeout(() => sound?.unloadAsync?.().catch?.(() => null), 1200)
  } catch {
    // Sem expo-av instalado ainda. O app continua funcionando sem travar.
  }
}

export async function successSound() { return playAppSound('success') }
export async function errorSound() { return playAppSound('error') }
export async function messageSound() { return playAppSound('message') }
export async function notifySound() { return playAppSound('notify') }
export async function tapSound() { return playAppSound('tap') }
