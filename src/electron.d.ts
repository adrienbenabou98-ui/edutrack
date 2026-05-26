export {}

declare global {
  interface Window {
    electron?: {
      platform: string
      minimize: () => void
      maximize: () => void
      close:    () => void
    }
  }
}
