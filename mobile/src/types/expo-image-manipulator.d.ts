declare module 'expo-image-manipulator' {
  export enum SaveFormat {
    JPEG = 'jpeg',
    PNG = 'png',
    WEBP = 'webp'
  }
  export type Action = { resize?: { width?: number; height?: number } } | { crop?: { originX: number; originY: number; width: number; height: number } } | { rotate?: number } | { flip?: unknown }
  export type SaveOptions = { compress?: number; format?: SaveFormat; base64?: boolean }
  export type ImageResult = { uri: string; width: number; height: number; base64?: string }
  export function manipulateAsync(uri: string, actions?: Action[], saveOptions?: SaveOptions): Promise<ImageResult>
}
