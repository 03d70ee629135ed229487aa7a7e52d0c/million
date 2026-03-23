// Telemetry gutted — all methods are no-ops. No data leaves this machine.

export interface TelemetryEvent {
  event: string;
  payload: Record<string, any>;
}

export class MillionTelemetry {
  constructor(_TELEMETRY_DISABLED = true) {}

  setEnabled(_value: boolean): void {}
  clear(): void {}
  showWrapped(): void {}

  record(_event: TelemetryEvent): Promise<void> {
    return Promise.resolve();
  }
}
