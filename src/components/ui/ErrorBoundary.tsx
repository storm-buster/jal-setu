import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
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
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
                    <div className="w-full max-w-md space-y-4 rounded-lg border border-red-200 bg-red-50 p-6 shadow-lg dark:border-red-900 dark:bg-red-950/20">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                            <AlertCircle className="h-6 w-6" />
                            <h2 className="text-lg font-semibold">Something went wrong</h2>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            The application encountered an unexpected error.
                        </p>

                        {this.state.error && (
                            <div className="max-h-64 overflow-auto rounded bg-white/50 p-3 text-xs font-mono text-red-800 dark:bg-black/50 dark:text-red-300">
                                {this.state.error.toString()}
                                <br />
                                {this.state.errorInfo?.componentStack}
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button
                                onClick={this.handleReload}
                                variant="destructive"
                                className="w-full sm:w-auto"
                            >
                                Reload Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
