export class Logger {
  info(message: string, context?: Record<string, unknown>): void {
    this.log("INFO", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("WARN", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("ERROR", message, context);
  }

  private log(level: "INFO" | "WARN" | "ERROR", message: string, context?: Record<string, unknown>) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ? { context } : {}),
    };

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  }
}
