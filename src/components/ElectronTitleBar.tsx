export default function ElectronTitleBar() {
  if (!window.electron) return null

  return (
    <div
      className="electron-drag flex items-center h-8 px-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 select-none shrink-0"
    >
      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase pointer-events-none">
        EduTrack
      </span>
    </div>
  )
}
