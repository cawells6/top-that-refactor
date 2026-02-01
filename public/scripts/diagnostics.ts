// public/scripts/diagnostics.ts
/**
 * Diagnostic logging system for tracking animation timing issues
 * Enable with: localStorage.setItem('DEBUG_TIMING', '1')
 */

interface TimingEvent {
  timestamp: number;
  elapsed: number;
  event: string;
  details?: Record<string, unknown>;
}

class TimingDiagnostics {
  private events: TimingEvent[] = [];
  private startTime: number = Date.now();
  private enabled: boolean = false;
  private lastEventTime: number = Date.now();

  constructor() {
    if (typeof window !== 'undefined') {
      this.enabled = localStorage.getItem('DEBUG_TIMING') === '1';
    }
  }

  log(event: string, details?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const now = Date.now();
    const elapsed = now - this.lastEventTime;
    
    this.events.push({
      timestamp: now,
      elapsed,
      event,
      details,
    });

    console.log(
      `[TIMING +${elapsed}ms] ${event}`,
      details ? details : ''
    );

    this.lastEventTime = now;
  }

  mark(label: string): void {
    this.log(`MARK: ${label}`);
  }

  getDuration(startLabel: string, endLabel: string): number | null {
    const start = this.events.find(e => e.event.includes(startLabel));
    const end = this.events.find(e => e.event.includes(endLabel));
    
    if (!start || !end) return null;
    return end.timestamp - start.timestamp;
  }

  getReport(): string {
    if (!this.enabled || this.events.length === 0) {
      return 'No timing data available. Enable with: localStorage.setItem("DEBUG_TIMING", "1")';
    }

    let report = '=== TIMING DIAGNOSTICS REPORT ===\n\n';
    
    for (const event of this.events) {
      const relativeTime = event.timestamp - this.startTime;
      report += `[${relativeTime}ms] +${event.elapsed}ms: ${event.event}\n`;
      if (event.details) {
        report += `  Details: ${JSON.stringify(event.details, null, 2)}\n`;
      }
    }

    report += '\n=== END REPORT ===';
    return report;
  }

  clear(): void {
    this.events = [];
    this.startTime = Date.now();
    this.lastEventTime = Date.now();
  }

  enable(): void {
    this.enabled = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('DEBUG_TIMING', '1');
    }
    console.log('[DIAGNOSTICS] Timing diagnostics enabled');
  }

  disable(): void {
    this.enabled = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('DEBUG_TIMING');
    }
    console.log('[DIAGNOSTICS] Timing diagnostics disabled');
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const timing = new TimingDiagnostics();

// Make available in console for manual debugging
if (typeof window !== 'undefined') {
  (window as any).timingDiag = timing;
}
