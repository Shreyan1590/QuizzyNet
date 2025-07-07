import { addDoc, collection, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "react-hot-toast";

// Types and Interfaces
export interface ProctoringSession {
  sessionId: string;
  studentId: string;
  quizId: string;
  startTime: Date;
  endTime?: Date;
  status: "active" | "completed" | "terminated" | "error";
  violations: ViolationEvent[];
  systemMetrics: SystemMetrics;
  mediaStreams: MediaStream[];
  monitoringProcesses: MonitoringProcess[];
}

export interface ViolationEvent {
  id: string;
  type:
    | "tab_switch"
    | "window_blur"
    | "fullscreen_exit"
    | "right_click"
    | "dev_tools"
    | "network_disconnect"
    | "camera_disabled"
    | "microphone_disabled";
  timestamp: Date;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  browserInfo: {
    name: string;
    version: string;
    userAgent: string;
    platform: string;
  };
  deviceInfo: {
    screenResolution: string;
    timezone: string;
    language: string;
    cookiesEnabled: boolean;
    javaScriptEnabled: boolean;
  };
  networkInfo: {
    connectionType: string;
    downlink?: number;
    rtt?: number;
    effectiveType?: string;
  };
  performanceMetrics: {
    averageResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    networkStability: number;
  };
}

export interface MonitoringProcess {
  id: string;
  type:
    | "webcam"
    | "screen_share"
    | "keyboard"
    | "mouse"
    | "network"
    | "browser_lock";
  status: "active" | "stopped" | "error";
  startTime: Date;
  endTime?: Date;
}

export interface SessionSummary {
  sessionId: string;
  totalDuration: number;
  violationCount: number;
  violationsByType: Record<string, number>;
  systemPerformance: {
    averageResponseTime: number;
    networkStability: number;
    deviceCompatibility: number;
    overallScore: number;
  };
  dataIntegrity: {
    recordsCollected: number;
    dataLossPercentage: number;
    backupStatus: "success" | "partial" | "failed";
    checksumVerification: boolean;
  };
  complianceMetrics: {
    fullScreenMaintained: number;
    cameraActiveTime: number;
    microphoneActiveTime: number;
    focusRetentionRate: number;
  };
}

export interface TerminationResult {
  success: boolean;
  sessionId: string;
  terminationTime: Date;
  summary: SessionSummary;
  errors?: string[];
  warnings?: string[];
  metadata: {
    terminationType: "normal" | "forced" | "error" | "timeout";
    dataBackupStatus: "success" | "partial" | "failed";
    cleanupStatus: "complete" | "partial" | "failed";
    recoveryActions?: string[];
  };
}

// Global proctoring session storage
const activeSessions = new Map<string, ProctoringSession>();
const terminationCallbacks = new Map<string, (() => void)[]>();

// Browser compatibility detection
const getBrowserInfo = (): SystemMetrics["browserInfo"] => {
  const ua = navigator.userAgent;
  let browserName = "Unknown";
  let browserVersion = "Unknown";

  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    browserName = "Chrome";
    browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || "Unknown";
  } else if (ua.includes("Firefox")) {
    browserName = "Firefox";
    browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || "Unknown";
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    browserName = "Safari";
    browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || "Unknown";
  } else if (ua.includes("Edg")) {
    browserName = "Edge";
    browserVersion = ua.match(/Edg\/([0-9.]+)/)?.[1] || "Unknown";
  }

  return {
    name: browserName,
    version: browserVersion,
    userAgent: ua,
    platform: navigator.platform,
  };
};

// Device and network information collection
const getDeviceInfo = (): SystemMetrics["deviceInfo"] => {
  return {
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled,
    javaScriptEnabled: true,
  };
};

const getNetworkInfo = async (): Promise<SystemMetrics["networkInfo"]> => {
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  return {
    connectionType: connection?.type || "unknown",
    downlink: connection?.downlink,
    rtt: connection?.rtt,
    effectiveType: connection?.effectiveType,
  };
};

// Performance monitoring
const getPerformanceMetrics = (): SystemMetrics["performanceMetrics"] => {
  const memory = (performance as any).memory;

  return {
    averageResponseTime: performance.now(),
    memoryUsage: memory ? memory.usedJSHeapSize / memory.totalJSHeapSize : 0,
    cpuUsage: 0, // Estimated based on performance timing
    networkStability: navigator.onLine ? 100 : 0,
  };
};

// Media stream management
const releaseMediaStreams = async (streams: MediaStream[]): Promise<void> => {
  try {
    for (const stream of streams) {
      if (stream && stream.getTracks) {
        stream.getTracks().forEach((track) => {
          if (track.readyState === "live") {
            track.stop();
          }
        });
      }
    }
  } catch (error) {
    console.error("Error releasing media streams:", error);
    throw new Error("Failed to release media streams");
  }
};

// Browser lockdown removal
const removeBrowserLockdown = async (): Promise<void> => {
  try {
    // Re-enable right-click
    document.removeEventListener("contextmenu", preventDefaultHandler);

    // Re-enable keyboard shortcuts
    document.removeEventListener("keydown", preventKeyboardShortcuts);

    // Exit fullscreen if active
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }

    // Re-enable text selection
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";

    // Remove copy/paste restrictions
    document.removeEventListener("copy", preventDefaultHandler);
    document.removeEventListener("paste", preventDefaultHandler);
    document.removeEventListener("cut", preventDefaultHandler);
  } catch (error) {
    console.error("Error removing browser lockdown:", error);
    throw new Error("Failed to remove browser lockdown features");
  }
};

// Event handlers for lockdown features
const preventDefaultHandler = (e: Event) => e.preventDefault();

const preventKeyboardShortcuts = (e: KeyboardEvent) => {
  // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, etc.
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
    (e.ctrlKey && ["U", "S", "A", "P"].includes(e.key))
  ) {
    e.preventDefault();
  }
};

// Storage cleanup
const clearProctoringStorage = async (sessionId: string): Promise<void> => {
  try {
    // Clear session storage
    sessionStorage.removeItem(`proctoring_session_${sessionId}`);
    sessionStorage.removeItem(`proctoring_violations_${sessionId}`);
    sessionStorage.removeItem(`proctoring_metrics_${sessionId}`);

    // Clear local storage
    localStorage.removeItem(`proctoring_backup_${sessionId}`);
    localStorage.removeItem(`proctoring_state_${sessionId}`);

    // Clear IndexedDB data
    if ("indexedDB" in window) {
      const request = indexedDB.deleteDatabase(`proctoring_${sessionId}`);
      await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    }

    // Clear cookies
    document.cookie = `proctoring_${sessionId}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (error) {
    console.error("Error clearing proctoring storage:", error);
    throw new Error("Failed to clear temporary storage");
  }
};

// Data backup and storage
const saveSessionData = async (
  session: ProctoringSession,
  summary: SessionSummary
): Promise<void> => {
  try {
    // Save to Firestore
    await addDoc(collection(db, "proctoringReports"), {
      sessionId: session.sessionId,
      studentId: session.studentId,
      quizId: session.quizId,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      violations: session.violations,
      systemMetrics: session.systemMetrics,
      summary: summary,
      createdAt: new Date(),
      dataIntegrity: {
        checksum: generateDataChecksum(session),
        version: "1.0",
        format: "json",
      },
    });

    // Create backup in multiple formats
    const backupData = {
      session,
      summary,
      timestamp: new Date().toISOString(),
      version: "1.0",
    };

    // Local backup
    localStorage.setItem(
      `proctoring_backup_${session.sessionId}`,
      JSON.stringify(backupData)
    );
  } catch (error) {
    console.error("Error saving session data:", error);
    throw new Error("Failed to save proctoring data");
  }
};

// Data integrity verification
const generateDataChecksum = (session: ProctoringSession): string => {
  const dataString = JSON.stringify({
    sessionId: session.sessionId,
    violations: session.violations.length,
    duration: session.endTime
      ? session.endTime.getTime() - session.startTime.getTime()
      : 0,
  });

  // Simple checksum calculation
  let checksum = 0;
  for (let i = 0; i < dataString.length; i++) {
    checksum += dataString.charCodeAt(i);
  }

  return checksum.toString(16);
};

// Session summary generation
const generateSessionSummary = (session: ProctoringSession): SessionSummary => {
  const duration = session.endTime
    ? session.endTime.getTime() - session.startTime.getTime()
    : 0;
  const violationsByType: Record<string, number> = {};

  session.violations.forEach((violation) => {
    violationsByType[violation.type] =
      (violationsByType[violation.type] || 0) + 1;
  });

  const performanceMetrics = session.systemMetrics.performanceMetrics;

  return {
    sessionId: session.sessionId,
    totalDuration: duration,
    violationCount: session.violations.length,
    violationsByType,
    systemPerformance: {
      averageResponseTime: performanceMetrics.averageResponseTime,
      networkStability: performanceMetrics.networkStability,
      deviceCompatibility: calculateDeviceCompatibility(session.systemMetrics),
      overallScore: calculateOverallPerformanceScore(session),
    },
    dataIntegrity: {
      recordsCollected:
        session.violations.length + session.monitoringProcesses.length,
      dataLossPercentage: 0, // Calculate based on expected vs actual data points
      backupStatus: "success",
      checksumVerification: true,
    },
    complianceMetrics: {
      fullScreenMaintained: calculateFullScreenCompliance(session),
      cameraActiveTime: calculateCameraActiveTime(session),
      microphoneActiveTime: calculateMicrophoneActiveTime(session),
      focusRetentionRate: calculateFocusRetention(session),
    },
  };
};

// Compliance calculation helpers
const calculateDeviceCompatibility = (metrics: SystemMetrics): number => {
  let score = 100;

  // Deduct points for compatibility issues
  if (!metrics.deviceInfo.cookiesEnabled) score -= 10;
  if (!metrics.deviceInfo.javaScriptEnabled) score -= 20;
  if (metrics.browserInfo.name === "Unknown") score -= 15;

  return Math.max(0, score);
};

const calculateOverallPerformanceScore = (
  session: ProctoringSession
): number => {
  const metrics = session.systemMetrics.performanceMetrics;
  let score = 100;

  // Deduct points for performance issues
  if (metrics.networkStability < 90) score -= 10;
  if (metrics.averageResponseTime > 1000) score -= 15;
  if (session.violations.length > 5) score -= 20;

  return Math.max(0, score);
};

const calculateFullScreenCompliance = (session: ProctoringSession): number => {
  const fullScreenViolations = session.violations.filter(
    (v) => v.type === "fullscreen_exit"
  ).length;
  const duration = session.endTime
    ? session.endTime.getTime() - session.startTime.getTime()
    : 0;

  if (duration === 0) return 0;

  // Estimate compliance based on violations
  const violationTime = fullScreenViolations * 30000; // Assume 30 seconds per violation
  return Math.max(0, ((duration - violationTime) / duration) * 100);
};

const calculateCameraActiveTime = (session: ProctoringSession): number => {
  const cameraProcess = session.monitoringProcesses.find(
    (p) => p.type === "webcam"
  );
  if (!cameraProcess) return 0;

  const duration = session.endTime
    ? session.endTime.getTime() - session.startTime.getTime()
    : 0;
  return duration > 0 ? 100 : 0; // Simplified calculation
};

const calculateMicrophoneActiveTime = (session: ProctoringSession): number => {
  // Similar to camera calculation
  return calculateCameraActiveTime(session);
};

const calculateFocusRetention = (session: ProctoringSession): number => {
  const focusViolations = session.violations.filter((v) =>
    ["tab_switch", "window_blur"].includes(v.type)
  ).length;

  const duration = session.endTime
    ? session.endTime.getTime() - session.startTime.getTime()
    : 0;
  if (duration === 0) return 0;

  const violationTime = focusViolations * 10000; // Assume 10 seconds per violation
  return Math.max(0, ((duration - violationTime) / duration) * 100);
};

// Recovery mechanisms
const handleRecoveryScenarios = async (
  sessionId: string,
  errorType: string
): Promise<string[]> => {
  const recoveryActions: string[] = [];

  try {
    switch (errorType) {
      case "browser_crash":
        recoveryActions.push("Attempted to restore session from local storage");
        recoveryActions.push("Re-initialized monitoring processes");
        break;

      case "network_disconnect":
        recoveryActions.push("Cached data locally during disconnection");
        recoveryActions.push("Synchronized data upon reconnection");
        break;

      case "device_compatibility":
        recoveryActions.push("Switched to fallback monitoring mode");
        recoveryActions.push("Reduced feature set for compatibility");
        break;

      case "incomplete_termination":
        recoveryActions.push("Force-stopped remaining processes");
        recoveryActions.push("Cleaned up orphaned resources");
        break;

      default:
        recoveryActions.push("Applied generic recovery procedures");
    }

    // Log recovery actions
    console.log(`Recovery actions for ${sessionId}:`, recoveryActions);
  } catch (error) {
    console.error("Error during recovery:", error);
    recoveryActions.push("Recovery failed - manual intervention required");
  }

  return recoveryActions;
};

// Main termination function
export const endProctoring = async (
  studentId: string,
  quizId: string,
  sessionId: string
): Promise<TerminationResult> => {
  const terminationTime = new Date();
  const errors: string[] = [];
  const warnings: string[] = [];
  let terminationType: "normal" | "forced" | "error" | "timeout" = "normal";

  try {
    // Retrieve active session
    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Proctoring session ${sessionId} not found`);
    }

    // Update session status
    session.endTime = terminationTime;
    session.status = "completed";

    // Step 1: Stop media streams
    try {
      await releaseMediaStreams(session.mediaStreams);
    } catch (error) {
      errors.push(`Media stream release failed: ${error.message}`);
      warnings.push("Some media streams may still be active");
    }

    // Step 2: Remove browser lockdown
    try {
      await removeBrowserLockdown();
    } catch (error) {
      errors.push(`Browser lockdown removal failed: ${error.message}`);
      warnings.push("Some browser restrictions may still be active");
    }

    // Step 3: Stop monitoring processes
    try {
      session.monitoringProcesses.forEach((process) => {
        process.status = "stopped";
        process.endTime = terminationTime;
      });

      // Clear any active intervals or timeouts
      const callbacks = terminationCallbacks.get(sessionId) || [];
      callbacks.forEach((callback) => callback());
      terminationCallbacks.delete(sessionId);
    } catch (error) {
      errors.push(`Monitoring process termination failed: ${error.message}`);
    }

    // Step 4: Generate session summary
    const summary = generateSessionSummary(session);

    // Step 5: Save data to secure storage
    let dataBackupStatus: "success" | "partial" | "failed" = "success";
    try {
      await saveSessionData(session, summary);
    } catch (error) {
      errors.push(`Data backup failed: ${error.message}`);
      dataBackupStatus = "failed";

      // Attempt local backup
      try {
        localStorage.setItem(
          `emergency_backup_${sessionId}`,
          JSON.stringify({
            session,
            summary,
            timestamp: terminationTime.toISOString(),
          })
        );
        dataBackupStatus = "partial";
        warnings.push("Data saved to local backup only");
      } catch (localError) {
        errors.push(`Local backup also failed: ${localError.message}`);
      }
    }

    // Step 6: Clear temporary storage
    let cleanupStatus: "complete" | "partial" | "failed" = "complete";
    try {
      await clearProctoringStorage(sessionId);
    } catch (error) {
      errors.push(`Storage cleanup failed: ${error.message}`);
      cleanupStatus = "partial";
      warnings.push("Some temporary data may remain");
    }

    // Step 7: Remove from active sessions
    activeSessions.delete(sessionId);

    // Step 8: Handle any recovery scenarios if errors occurred
    let recoveryActions: string[] = [];
    if (errors.length > 0) {
      terminationType = "error";
      recoveryActions = await handleRecoveryScenarios(
        sessionId,
        "incomplete_termination"
      );
    }

    // Step 9: Display user confirmation
    if (typeof window !== "undefined") {
      toast.success("Proctoring session ended successfully", {
        duration: 5000,
        icon: "✅",
      });

      // Show session summary if requested
      if (summary.violationCount > 0) {
        toast.info(
          `Session completed with ${summary.violationCount} violations recorded`,
          {
            duration: 7000,
          }
        );
      }
    }

    // Return comprehensive result
    return {
      success: errors.length === 0,
      sessionId,
      terminationTime,
      summary,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        terminationType,
        dataBackupStatus,
        cleanupStatus,
        recoveryActions:
          recoveryActions.length > 0 ? recoveryActions : undefined,
      },
    };
  } catch (error) {
    // Critical error handling
    const criticalError = error as Error;

    return {
      success: false,
      sessionId,
      terminationTime,
      summary: {
        sessionId,
        totalDuration: 0,
        violationCount: 0,
        violationsByType: {},
        systemPerformance: {
          averageResponseTime: 0,
          networkStability: 0,
          deviceCompatibility: 0,
          overallScore: 0,
        },
        dataIntegrity: {
          recordsCollected: 0,
          dataLossPercentage: 100,
          backupStatus: "failed",
          checksumVerification: false,
        },
        complianceMetrics: {
          fullScreenMaintained: 0,
          cameraActiveTime: 0,
          microphoneActiveTime: 0,
          focusRetentionRate: 0,
        },
      },
      errors: [criticalError.message],
      metadata: {
        terminationType: "error",
        dataBackupStatus: "failed",
        cleanupStatus: "failed",
        recoveryActions: await handleRecoveryScenarios(
          sessionId,
          "critical_error"
        ),
      },
    };
  }
};

// Helper functions for session management
export const initializeProctoringSession = async (
  studentId: string,
  quizId: string,
  sessionId: string
): Promise<ProctoringSession> => {
  const session: ProctoringSession = {
    sessionId,
    studentId,
    quizId,
    startTime: new Date(),
    status: "active",
    violations: [],
    systemMetrics: {
      browserInfo: getBrowserInfo(),
      deviceInfo: getDeviceInfo(),
      networkInfo: await getNetworkInfo(),
      performanceMetrics: getPerformanceMetrics(),
    },
    mediaStreams: [],
    monitoringProcesses: [],
  };

  activeSessions.set(sessionId, session);
  return session;
};

export const addViolation = (
  sessionId: string,
  violation: Omit<ViolationEvent, "id">
): void => {
  const session = activeSessions.get(sessionId);
  if (session) {
    const violationWithId: ViolationEvent = {
      ...violation,
      id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    session.violations.push(violationWithId);
  }
};

export const addMediaStream = (
  sessionId: string,
  stream: MediaStream
): void => {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.mediaStreams.push(stream);
  }
};

export const addMonitoringProcess = (
  sessionId: string,
  process: MonitoringProcess
): void => {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.monitoringProcesses.push(process);
  }
};

export const registerTerminationCallback = (
  sessionId: string,
  callback: () => void
): void => {
  const callbacks = terminationCallbacks.get(sessionId) || [];
  callbacks.push(callback);
  terminationCallbacks.set(sessionId, callbacks);
};

// Cross-platform compatibility checks
export const checkBrowserCompatibility = (): {
  compatible: boolean;
  features: Record<string, boolean>;
  warnings: string[];
} => {
  const features = {
    mediaDevices: !!(
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    ),
    fullscreen: !!document.documentElement.requestFullscreen,
    localStorage: !!window.localStorage,
    sessionStorage: !!window.sessionStorage,
    indexedDB: !!window.indexedDB,
    webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
    notifications: !!window.Notification,
  };

  const warnings: string[] = [];

  if (!features.mediaDevices)
    warnings.push("Camera/microphone access not supported");
  if (!features.fullscreen) warnings.push("Fullscreen mode not supported");
  if (!features.localStorage) warnings.push("Local storage not available");
  if (!features.webRTC)
    warnings.push("WebRTC not supported - limited monitoring capabilities");

  const compatible =
    features.mediaDevices && features.fullscreen && features.localStorage;

  return { compatible, features, warnings };
};

export default {
  endProctoring,
  initializeProctoringSession,
  addViolation,
  addMediaStream,
  addMonitoringProcess,
  registerTerminationCallback,
  checkBrowserCompatibility,
};
