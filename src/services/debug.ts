export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  stack?: string;
}

type LogListener = (entry: LogEntry) => void;

class DebugLogger {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 1000;
  private isInitialized = false;

  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Carica log precedenti da localStorage se presenti
    try {
      const saved = localStorage.getItem('easyevent_debug_logs');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {
      this.originalConsole.error('Failed to load saved logs from localStorage:', e);
    }

    // Intercetta i metodi della console
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.addEntry('info', this.formatArgs(args));
    };

    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.addEntry('warn', this.formatArgs(args));
    };

    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      // Cerca se uno degli argomenti è un errore con stack trace
      let stack: string | undefined;
      for (const arg of args) {
        if (arg instanceof Error) {
          stack = arg.stack;
          break;
        }
      }
      this.addEntry('error', this.formatArgs(args), stack);
    };

    console.debug = (...args: any[]) => {
      this.originalConsole.debug(...args);
      this.addEntry('debug', this.formatArgs(args));
    };

    // Gestori errori globali
    window.addEventListener('error', (event) => {
      const msg = event.error ? event.error.message || event.message : event.message;
      const stack = event.error ? event.error.stack : undefined;
      this.addEntry('error', `Unhandled Exception: ${msg}`, stack);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      let msg = 'Unhandled Promise Rejection';
      let stack: string | undefined;

      if (reason instanceof Error) {
        msg += `: ${reason.message}`;
        stack = reason.stack;
      } else if (typeof reason === 'string') {
        msg += `: ${reason}`;
      } else {
        msg += `: ${JSON.stringify(reason)}`;
      }

      this.addEntry('error', msg, stack);
    });

    this.addEntry('info', 'Sistema di debug inizializzato.');
  }

  private formatArgs(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return Object.prototype.toString.call(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
  }

  private addEntry(level: LogEntry['level'], message: string, stack?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      stack,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Salva in localStorage per persistenza temporanea
    try {
      localStorage.setItem('easyevent_debug_logs', JSON.stringify(this.logs.slice(-200)));
    } catch {
      // ignore quota exceeded
    }

    this.listeners.forEach((listener) => listener(entry));
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear() {
    this.logs = [];
    try {
      localStorage.removeItem('easyevent_debug_logs');
    } catch {}
    // Trigger update per i listener
    this.listeners.forEach((listener) =>
      listener({
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: 'Log ripuliti.',
      })
    );
  }
}

export const logger = new DebugLogger();
