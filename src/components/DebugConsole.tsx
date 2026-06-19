import React, { useEffect, useState, useRef } from 'react';
import { logger, LogEntry } from '../services/debug';
import { X, Copy, Download, Trash2, Terminal, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface DebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLogs(logger.getLogs());

    const unsubscribe = logger.subscribe(() => {
      setLogs(logger.getLogs());
    });

    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const copyToClipboard = () => {
    const text = logs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.stack ? `\nStack: ${log.stack}` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    alert('Log copiati negli appunti!');
  };

  const downloadLogs = () => {
    const text = logs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.stack ? `\nStack: ${log.stack}` : ''}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `easyevent_debug_logs_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    if (confirm('Sei sicuro di voler ripulire i log?')) {
      logger.clear();
      setLogs([]);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-slate-950 text-slate-100 shadow-2xl z-50 flex flex-col border-l border-slate-800 animate-slide-in font-mono text-xs">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-400">
          <Terminal className="w-5 h-5" />
          <span className="font-bold text-sm tracking-tight text-white">Console di Debug Integrata</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Toolbar / Filtri */}
      <div className="p-3 bg-slate-900/50 border-b border-slate-800/80 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-850">
          {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all ${
                filter === lvl
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl === 'all' ? 'Tutti' : lvl}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            title="Copia negli appunti"
            className="p-1.5 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-350 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copia</span>
          </button>
          <button
            onClick={downloadLogs}
            title="Scarica file di log"
            className="p-1.5 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-350 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Scarica</span>
          </button>
          <button
            onClick={clearLogs}
            title="Svuota log"
            className="p-1.5 hover:bg-red-950 hover:border-red-900 rounded-lg border border-slate-800 text-red-400 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Svuota</span>
          </button>
        </div>
      </div>

      {/* Lista Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-950">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 text-center py-8">Nessun log registrato per questa sessione.</div>
        ) : (
          filteredLogs.map((log, index) => {
            const isError = log.level === 'error';
            const isWarn = log.level === 'warn';
            const isDebug = log.level === 'debug';

            return (
              <div
                key={index}
                className={`p-2 rounded border transition-all ${
                  isError
                    ? 'bg-red-950/20 border-red-900/40 text-red-200'
                    : isWarn
                    ? 'bg-yellow-950/15 border-yellow-800/30 text-yellow-250'
                    : isDebug
                    ? 'bg-slate-900/40 border-slate-800/40 text-slate-400'
                    : 'bg-slate-900/20 border-slate-800/30 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 font-semibold select-none shrink-0">{log.timestamp}</span>
                  <span className="shrink-0 font-bold">
                    {isError && <AlertCircle className="w-3.5 h-3.5 text-red-500 inline mr-1" />}
                    {isWarn && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 inline mr-1" />}
                    {!isError && !isWarn && <Info className="w-3.5 h-3.5 text-blue-400 inline mr-1" />}
                  </span>
                  <div className="break-all whitespace-pre-wrap flex-1">{log.message}</div>
                </div>
                {log.stack && (
                  <pre className="mt-1.5 p-1.5 bg-black/40 rounded text-[10px] text-red-400/80 overflow-x-auto border border-red-950">
                    {log.stack}
                  </pre>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
