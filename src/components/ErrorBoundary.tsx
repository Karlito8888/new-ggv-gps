import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary — catches runtime errors in the React tree.
 * Prevents white screen of death by showing a fallback UI.
 * Wraps the entire App in main.tsx.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("MyGGV GPS — unhandled error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="overlay error-overlay">
          <div className="modal error-modal">
            <div className="overlay-icon-wrapper error-icon-wrapper">
              <svg
                className="overlay-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h1>Something went wrong</h1>
            <p className="overlay-tagalog">(May nangyaring error)</p>
            <p className="overlay-description">
              MyGGV GPS encountered an unexpected error.
              <br />
              Please reload the app.
              <span className="tagalog-inline">
                May nangyaring hindi inaasahan. I-reload ang app.
              </span>
            </p>

            {this.state.error && (
              <details className="error-details">
                <summary>Error details</summary>
                <pre>{this.state.error.message}</pre>
              </details>
            )}

            <button className="overlay-btn-primary" onClick={this.handleReload}>
              Reload App
            </button>

            <p className="gps-version">
              v{typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "?.?.?"}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
