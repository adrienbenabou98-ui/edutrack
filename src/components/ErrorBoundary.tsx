import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 max-w-md w-full text-center">
            <p className="text-2xl mb-2">Something went wrong</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{this.state.message}</p>
            <button onClick={() => window.location.reload()}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
