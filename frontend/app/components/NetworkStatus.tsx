"use client";

import React from "react";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";

interface NetworkStatusProps {
  showWhenOnline?: boolean;
  className?: string;
}

export function NetworkStatus({
  showWhenOnline = false,
  className = "",
}: NetworkStatusProps): React.JSX.Element | null {
  const { isOnline, isSlowConnection, effectiveType } = useNetworkStatus();

  // Only show when offline or slow connection (unless showWhenOnline is true)
  if (isOnline && !isSlowConnection && !showWhenOnline) {
    return null;
  }

  const getStatusColor = (): string => {
    if (!isOnline) return "bg-red-500";
    if (isSlowConnection) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusText = (): string => {
    if (!isOnline) return "Offline";
    if (isSlowConnection) return `Slow connection (${effectiveType})`;
    return `Online (${effectiveType})`;
  };

  const getStatusIcon = (): React.JSX.Element => {
    if (!isOnline) {
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728"
          />
        </svg>
      );
    }

    if (isSlowConnection) {
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      );
    }

    return (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
        />
      </svg>
    );
  };

  const baseClasses =
    "flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium text-white";
  const statusColor = getStatusColor();

  return (
    <div className={`${baseClasses} ${statusColor} ${className}`}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
}

interface OfflineFallbackProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function OfflineFallback({
  children,
  fallback,
}: OfflineFallbackProps): React.JSX.Element {
  const { isOnline } = useNetworkStatus();

  if (!isOnline) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            You're offline
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Check your connection and try again when you're back online.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
