import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8">
                    <div className="max-w-md w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl">
                        <h2 className="text-xl font-black text-red-500 mb-4 uppercase tracking-widest">Error Crítico</h2>
                        <p className="text-slate-300 mb-4 text-sm font-medium">
                            Algo ha salido mal al cargar la aplicación. Hemos detectado un problema técnico.
                        </p>
                        <div className="bg-black/50 p-4 rounded-xl border border-white/10 mb-6 font-mono text-xs text-red-300 overflow-auto max-h-[150px]">
                            {this.state.error?.toString()}
                        </div>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
                        >
                            Reiniciar y Limpiar Datos (Recomendado)
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
                        >
                            Recargar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
