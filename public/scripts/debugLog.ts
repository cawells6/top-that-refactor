type DebugEntry = {
  t: number;
  tag: string;
  data?: Record<string, unknown>;
};

const MAX_DEBUG_ENTRIES = 500;
const debugEntries: DebugEntry[] = [];

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function isDebugLoggingEnabled(): boolean {
  if (!hasWindow()) return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('debug')) return true;
  } catch {
    // ignore
  }
  try {
    return window.localStorage.getItem('TOPTHAT_DEBUG') === '1';
  } catch {
    return false;
  }
}

export function debugLog(tag: string, data?: Record<string, unknown>): void {
  if (!isDebugLoggingEnabled()) return;

  const entry: DebugEntry = { t: Date.now(), tag, data };
  debugEntries.push(entry);
  if (debugEntries.length > MAX_DEBUG_ENTRIES) {
    debugEntries.splice(0, debugEntries.length - MAX_DEBUG_ENTRIES);
  }

  // Keep logs easy to copy from the console.
  // eslint-disable-next-line no-console
  console.log(`[TTDBG] ${tag}`, data ?? {});

  if (hasWindow()) {
    (window as any).__TT_DEBUG_LOGS = debugEntries;
  }
}

export function getDebugLogs(): DebugEntry[] {
  return [...debugEntries];
}

export function clearDebugLogs(): void {
  debugEntries.length = 0;
}

declare global {
  interface Window {
    __TT_DEBUG_LOGS?: DebugEntry[];
    __ttDumpDebugLogs?: () => string;
    __ttClearDebugLogs?: () => void;
  }
}

if (hasWindow()) {
  window.__ttDumpDebugLogs = () => JSON.stringify(getDebugLogs(), null, 2);
  window.__ttClearDebugLogs = () => clearDebugLogs();
}

export {};

