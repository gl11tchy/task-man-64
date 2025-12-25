import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#050510] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-red-900/20 border border-red-500 rounded-xl p-6">
            <h1 className="text-xl font-bold text-red-400 mb-4">
              Something went wrong
            </h1>
            <div className="text-sm text-white/80 mb-4">
              <p className="mb-2">Error: {this.state.error?.message}</p>
              <details className="mt-4">
                <summary className="cursor-pointer text-white/60 hover:text-white">
                  Stack trace
                </summary>
                <pre className="mt-2 text-xs bg-black/30 p-3 rounded overflow-auto max-h-64 text-white/60">
                  {this.state.error?.stack}
                </pre>
              </details>
              {this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-white/60 hover:text-white">
                    Component stack
                  </summary>
                  <pre className="mt-2 text-xs bg-black/30 p-3 rounded overflow-auto max-h-64 text-white/60">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
