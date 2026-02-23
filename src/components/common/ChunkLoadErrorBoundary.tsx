import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { isChunkLoadError } from '@/utils/lazyWithRetry';

interface Props {
  children: ReactNode;
}

interface State {
  hasChunkError: boolean;
}

/**
 * Error boundary that catches chunk load errors from lazy-loaded routes.
 *
 * After a new deploy on Vercel, old JS chunks are removed. If a user
 * navigates to a lazy-loaded route with a stale HTML page, the import
 * fails. This boundary shows a friendly "new version available" message
 * with a reload button instead of a blank screen.
 */
export class ChunkLoadErrorBoundary extends Component<Props, State> {
  state: State = { hasChunkError: false };

  static getDerivedStateFromError(error: Error): Partial<State> | null {
    if (isChunkLoadError(error)) {
      return { hasChunkError: true };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (!isChunkLoadError(error)) {
      // Re-throw non-chunk errors so they propagate to other boundaries
      throw error;
    }
    if (import.meta.env.DEV) {
      console.warn('[ChunkLoadErrorBoundary] Chunk load error caught:', error, info);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasChunkError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Nueva versión disponible
            </h2>
            <p className="text-gray-500 mb-6">
              Se ha publicado una actualización de TPHub. Recarga la página para continuar.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
