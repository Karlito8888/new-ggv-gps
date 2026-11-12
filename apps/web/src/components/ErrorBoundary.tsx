import { Component, type ErrorInfo, type ReactNode } from "react";
import { COPY, inline } from "@ggv/shared";
import { Icon } from "./Icon";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  // May be null even when `hasError`: a thrown `null` still gets the fallback.
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

  static getDerivedStateFromError(error: Error | null): ErrorBoundaryState {
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
        <div className="overlay">
          <div className="modal">
            <div className="overlay-icon-wrapper error-icon-wrapper">
              <Icon name="alert" className="overlay-icon" />
            </div>

            <h1>{COPY.error.title.en}</h1>
            <p className="overlay-tagalog">({COPY.error.title.tl})</p>
            <p className="overlay-description">
              {COPY.error.unexpected.en}
              <br />
              {COPY.error.reloadPrompt.en}
              <span className="tagalog-inline">{COPY.error.reloadPrompt.tl}</span>
            </p>

            {this.state.error && (
              <details className="error-details">
                <summary>{COPY.error.details.en}</summary>
                <pre>{this.state.error.message}</pre>
              </details>
            )}

            <button className="overlay-btn-primary" onClick={this.handleReload}>
              {inline(COPY.error.reload)}
            </button>

            <p className="gps-version">v{__APP_VERSION__}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
