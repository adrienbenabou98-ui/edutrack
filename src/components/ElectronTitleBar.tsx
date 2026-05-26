export default function ElectronTitleBar() {
  if (!window.electron) return null

  const { minimize, maximize, close } = window.electron

  return (
    <div className="electron-drag flex items-center justify-between h-8 px-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 select-none shrink-0">
      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase electron-no-drag">
        EduTrack
      </span>
      <div className="electron-no-drag flex items-center gap-1">
        <button
          onClick={minimize}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" rx="0.5" />
          </svg>
        </button>
        <button
          onClick={maximize}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Maximize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" rx="1" />
          </svg>
        </button>
        <button
          onClick={close}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500 text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="9" y2="9" />
            <line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      </div>
    </div>
  )
}
