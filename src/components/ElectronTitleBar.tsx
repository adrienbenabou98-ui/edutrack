import { useEffect } from 'react'
import { useThemeStore } from '../store/theme.store'

export default function ElectronTitleBar() {
  const dark = useThemeStore(s => s.dark)

  useEffect(() => {
    if (!window.electron?.setTitleBarOverlay) return
    window.electron.setTitleBarOverlay(
      dark
        ? { color: '#1f2937', symbolColor: '#9ca3af' }
        : { color: '#ffffff', symbolColor: '#6b7280' }
    )
  }, [dark])

  if (!window.electron) return null

  return (
    <div className="electron-drag flex items-center h-8 px-3 bg-white dark:bg-gray-800 select-none shrink-0">
      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase pointer-events-none">
        EduTrack
      </span>
    </div>
  )
}
