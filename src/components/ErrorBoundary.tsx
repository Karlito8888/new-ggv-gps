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

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            background: "linear-gradient(135deg, #50aa61, #f3c549)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              background: "#f4f4f4",
              borderRadius: "1.5rem",
              padding: "2rem 1.5rem",
              maxWidth: "100%",
              width: "400px",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Accent bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 5,
                background: "linear-gradient(90deg, #ef4444, #f3c549)",
              }}
            />

            {/* Error icon */}
            <div
              style={{
                width: "5rem",
                height: "5rem",
                margin: "0 auto 1.5rem",
                background: "linear-gradient(135deg, #ef4444, #f3c549)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="2.5rem"
                height="2.5rem"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f4f4f4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: "1.2em",
                fontWeight: 700,
                color: "#121212",
                marginBottom: "0.25rem",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontStyle: "italic",
                color: "#50aa61",
                fontSize: "0.9em",
                marginBottom: "1rem",
              }}
            >
              (May nangyaring error)
            </p>
            <p
              style={{
                color: "#121212",
                opacity: 0.7,
                fontSize: "0.9rem",
                lineHeight: 1.6,
                marginBottom: "1.5rem",
              }}
            >
              MyGGV GPS encountered an unexpected error.
              <br />
              Please try again or reload the app.
              <span
                style={{
                  display: "block",
                  fontStyle: "italic",
                  color: "#50aa61",
                  fontSize: "0.85em",
                  marginTop: "0.5rem",
                  opacity: 0.85,
                }}
              >
                May nangyaring hindi inaasahan. Subukan muli o i-reload ang app.
              </span>
            </p>

            {this.state.error && (
              <details
                style={{
                  textAlign: "left",
                  marginBottom: "1.5rem",
                  fontSize: "0.75rem",
                  color: "#6b7280",
                }}
              >
                <summary style={{ cursor: "pointer", marginBottom: "0.5rem" }}>
                  Error details
                </summary>
                <pre
                  style={{
                    background: "#e5e5e5",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleRetry}
              style={{
                width: "100%",
                padding: "1rem 1.5rem",
                minHeight: "3.5rem",
                background: "linear-gradient(135deg, #50aa61, #3d8a4d)",
                color: "#f4f4f4",
                fontWeight: 700,
                fontSize: "1.125rem",
                border: "none",
                borderRadius: "1rem",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(80,170,97,0.4)",
                marginBottom: "0.75rem",
              }}
            >
              Try Again
            </button>

            <button
              onClick={this.handleReload}
              style={{
                width: "100%",
                padding: "0.875rem 1.5rem",
                background: "rgba(18,18,18,0.08)",
                color: "#121212",
                fontWeight: 600,
                fontSize: "1rem",
                border: "none",
                borderRadius: "0.75rem",
                cursor: "pointer",
              }}
            >
              Reload App
            </button>

            <p
              style={{
                marginTop: "1.5rem",
                fontSize: "0.75rem",
                color: "#121212",
                opacity: 0.4,
              }}
            >
              v{typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "?.?.?"}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
