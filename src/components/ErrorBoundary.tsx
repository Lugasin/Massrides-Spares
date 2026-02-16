import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logError } from '@/lib/activityLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'section';
  enableRetry?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log to activity logger
    logError(error, 'ErrorBoundary', undefined);

    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Placeholder for error reporting service integration
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.log('Error report:', errorReport);
    // Send to error reporting service (e.g., Sentry, LogRocket)
  };

  private handleRetry = () => {
    const { enableRetry = true } = this.props;
    if (enableRetry && this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    // Open bug report dialog or redirect to support
    const subject = encodeURIComponent('Bug Report: Application Error');
    const body = encodeURIComponent(`
Error Details:
${this.state.error?.message}

Stack Trace:
${this.state.error?.stack}

Component Stack:
${this.state.errorInfo?.componentStack}

URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `);
    window.open(`mailto:support@massrides.co.zm?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component', showDetails = false, enableRetry = true } = this.props;
      const canRetry = enableRetry && this.state.retryCount < this.maxRetries;

      return (
        <div className={`error-boundary ${level} p-4`}>
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Occurred</AlertTitle>
                <AlertDescription>
                  {level === 'page'
                    ? "We're sorry, but something unexpected happened while loading this page."
                    : "We're sorry, but something unexpected happened in this section."
                  }
                </AlertDescription>
              </Alert>

              {showDetails && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    Technical Details (for developers)
                  </summary>
                  <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-wrap gap-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} variant="default">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} left)
                  </Button>
                )}

                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>

                <Button onClick={this.handleReportBug} variant="outline">
                  <Bug className="h-4 w-4 mr-2" />
                  Report Bug
                </Button>
              </div>

              {this.state.retryCount >= this.maxRetries && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Maximum Retries Reached</AlertTitle>
                  <AlertDescription>
                    If this problem persists, please contact our support team.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different levels
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="page"
    showDetails={process.env.NODE_ENV === 'development'}
    enableRetry={true}
    onError={(error, errorInfo) => {
      // Log page-level errors with additional context
      console.error('Page Error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="component"
    showDetails={process.env.NODE_ENV === 'development'}
    enableRetry={false}
  >
    {children}
  </ErrorBoundary>
);

export const SectionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="section"
    enableRetry={false}
    fallback={
      <div className="p-4 border border-dashed border-muted-foreground/25 rounded-md">
        <p className="text-sm text-muted-foreground">This section could not be loaded.</p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

// Hook for handling async errors in functional components
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    console.error('Async Error:', error, errorInfo);

    // Log to activity logger
    logError(error, 'useErrorHandler', undefined);

    // You can dispatch to error reporting service here
    if (process.env.NODE_ENV === 'production') {
      // Send to error reporting service
    }
  };
};