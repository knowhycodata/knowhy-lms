import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        }
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo })
        // Hata loglama servisi buraya eklenebilir
        console.error('ErrorBoundary yakaladı:', error, errorInfo)
    }

    handleReload = (): void => {
        window.location.reload()
    }

    handleGoHome = (): void => {
        window.location.href = '/dashboard'
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Özel fallback varsa onu göster
            if (this.props.fallback) {
                return this.props.fallback
            }

            // Varsayılan hata UI'ı
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                    <div className="max-w-md w-full text-center">
                        {/* Hata İkonu */}
                        <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                            <svg
                                className="w-12 h-12 text-red-600 dark:text-red-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        {/* Başlık */}
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Bir Hata Oluştu
                        </h1>

                        {/* Açıklama */}
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Üzgünüz, beklenmedik bir hata oluştu. Lütfen sayfayı yenileyin veya
                            ana sayfaya dönün.
                        </p>

                        {/* Hata Detayları (Development) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left overflow-auto max-h-40">
                                <p className="text-sm font-mono text-red-600 dark:text-red-400">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <pre className="text-xs text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Aksiyonlar */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                            >
                                Sayfayı Yenile
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-colors"
                            >
                                Ana Sayfaya Dön
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
