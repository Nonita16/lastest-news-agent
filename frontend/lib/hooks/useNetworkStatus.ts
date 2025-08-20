import { useState, useEffect } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    if (typeof window === "undefined") {
      return {
        isOnline: true,
        isSlowConnection: false,
        connectionType: "unknown",
        effectiveType: "unknown",
      };
    }

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    return {
      isOnline: navigator.onLine,
      isSlowConnection: connection
        ? connection.effectiveType === "slow-2g" ||
          connection.effectiveType === "2g"
        : false,
      connectionType: connection?.type || "unknown",
      effectiveType: connection?.effectiveType || "unknown",
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateNetworkStatus = (): void => {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      setNetworkStatus({
        isOnline: navigator.onLine,
        isSlowConnection: connection
          ? connection.effectiveType === "slow-2g" ||
            connection.effectiveType === "2g"
          : false,
        connectionType: connection?.type || "unknown",
        effectiveType: connection?.effectiveType || "unknown",
      });
    };

    const handleOnline = (): void => {
      updateNetworkStatus();
    };

    const handleOffline = (): void => {
      updateNetworkStatus();
    };

    const handleConnectionChange = (): void => {
      updateNetworkStatus();
    };

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for connection changes if supported
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener("change", handleConnectionChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if (connection) {
        connection.removeEventListener("change", handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
}

// Helper hook for handling network-dependent operations
export function useNetworkAwareOperation() {
  const networkStatus = useNetworkStatus();

  const shouldDelay = (
    operation: "api" | "upload" | "download" | "general" = "general"
  ): boolean => {
    if (!networkStatus.isOnline) {
      return true;
    }

    // Delay heavy operations on slow connections
    if (networkStatus.isSlowConnection) {
      return operation === "upload" || operation === "download";
    }

    return false;
  };

  const getRecommendedTimeout = (
    operation: "api" | "upload" | "download" | "general" = "general"
  ): number => {
    if (!networkStatus.isOnline) {
      return 0; // Don't attempt if offline
    }

    // Base timeouts in milliseconds
    const baseTimeouts = {
      api: 30000,
      upload: 120000,
      download: 60000,
      general: 30000,
    };

    const baseTimeout = baseTimeouts[operation];

    // Increase timeout for slow connections
    if (networkStatus.isSlowConnection) {
      return baseTimeout * 2;
    }

    // Adjust based on effective type
    switch (networkStatus.effectiveType) {
      case "slow-2g":
        return baseTimeout * 3;
      case "2g":
        return baseTimeout * 2;
      case "3g":
        return baseTimeout * 1.5;
      case "4g":
      default:
        return baseTimeout;
    }
  };

  return {
    networkStatus,
    shouldDelay,
    getRecommendedTimeout,
  };
}
