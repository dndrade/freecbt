import React from "react";

export type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback: React.ReactNode | (() => React.ReactNode);
  onError?: (error: Error) => void;
};

type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return typeof this.props.fallback === "function"
        ? this.props.fallback()
        : this.props.fallback;
    }
    return this.props.children;
  }
}
