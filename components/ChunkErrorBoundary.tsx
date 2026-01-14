import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary for catching chunk loading failures and other React errors.
 * When a lazy-loaded component fails to load (common after deployments),
 * this will show a retry button instead of a blank page.
 */
class ChunkErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ChunkErrorBoundary caught error:', error, errorInfo);

        // Check if it's a chunk loading error
        if (error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('Loading chunk') ||
            error.message.includes('Loading CSS chunk')) {
            console.log('Detected chunk loading failure - likely due to deployment update');
        }
    }

    handleRetry = () => {
        // Clear error state
        this.setState({ hasError: false, error: null });

        // Force a full page reload to get the latest chunks
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Check if it's a chunk loading error
            const isChunkError = this.state.error?.message.includes('Failed to fetch') ||
                this.state.error?.message.includes('Loading chunk') ||
                this.state.error?.message.includes('dynamically imported');

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {isChunkError ? 'Page Loading Failed' : 'Something went wrong'}
                        </h3>

                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            {isChunkError
                                ? 'A new version of the app may have been deployed. Please refresh to load the latest version.'
                                : 'An unexpected error occurred. Please try refreshing the page.'}
                        </p>

                        <button
                            onClick={this.handleRetry}
                            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ChunkErrorBoundary;
