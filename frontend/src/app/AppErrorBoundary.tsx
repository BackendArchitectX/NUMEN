import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('NUMEN UI boundary captured an unrecoverable render error', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return <main className="fatalState" role="alert">
      <div className="panel">
        <span className="eyebrow">NUMEN RECOVERY</span>
        <h1>Interface recovery required.</h1>
        <p>The application encountered an unexpected rendering error. Your workflow data remains in the backend.</p>
        <button type="button" className="run" onClick={() => window.location.reload()}>Reload NUMEN</button>
      </div>
    </main>
  }
}
