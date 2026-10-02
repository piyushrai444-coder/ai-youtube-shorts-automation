type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: any, jobId?: string): string {
    const timestamp = new Date().toISOString();
    const jobPrefix = jobId ? `[job:${jobId}] ` : '';
    const metaStr = meta ? ` ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
    return `[${timestamp}] [${level}] ${jobPrefix}${message}${metaStr}`;
  }

  debug(message: string, meta?: any, jobId?: string): void {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      console.debug(this.formatMessage('DEBUG', message, meta, jobId));
    }
  }

  info(message: string, meta?: any, jobId?: string): void {
    console.log(this.formatMessage('INFO', message, meta, jobId));
  }

  warn(message: string, meta?: any, jobId?: string): void {
    console.warn(this.formatMessage('WARN', message, meta, jobId));
  }

  error(message: string, meta?: any, jobId?: string): void {
    console.error(this.formatMessage('ERROR', message, meta, jobId));
  }

  job(jobId: string, message: string, meta?: any): void {
    this.info(message, meta, jobId);
  }
}

export const logger = new Logger();
