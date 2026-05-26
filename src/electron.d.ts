export {}

declare global {
  interface Window {
    electron?: {
      platform: string
      setTitleBarOverlay?: (opts: { color: string; symbolColor: string }) => void
    }
  }
}
