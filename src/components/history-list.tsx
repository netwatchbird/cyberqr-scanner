'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Clock, ShieldCheck, ShieldAlert, ShieldX, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { scoreToVariant } from '@/lib/risk-calculator';
import { extractDomain } from '@/lib/validators';
import type { ScanStatus } from '@/types/scan';

interface HistoryItem {
  id: string;
  url: string;
  status: ScanStatus;
  riskScore: number;
  details?: unknown[];
  createdAt: string;
}

const statusIcons = {
  SAFE: ShieldCheck,
  SUSPICIOUS: ShieldAlert,
  MALICIOUS: ShieldX,
  ERROR: AlertCircle,
};

const statusColors = {
  SAFE: 'text-emerald-500 bg-emerald-50 border-emerald-200',
  SUSPICIOUS: 'text-amber-500 bg-amber-50 border-amber-200',
  MALICIOUS: 'text-red-500 bg-red-50 border-red-200',
  ERROR: 'text-slate-400 bg-slate-50 border-slate-200',
};

const dotColors = {
  SAFE: 'bg-emerald-500',
  SUSPICIOUS: 'bg-amber-500',
  MALICIOUS: 'bg-red-500',
  ERROR: 'bg-slate-400',
};

export function HistoryList() {
  const { data: session } = useSession();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();

      if (data.success) {
        setHistory(data.data || []);
      } else {
        setError(data.error?.message || 'Error al cargar historial');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Sin sesión
  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <Clock className="h-12 w-12 text-slate-300" />
        <p className="text-sm text-slate-500">Inicia sesión para ver tu historial de escaneos</p>
      </div>
    );
  }

  // Cargando
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-500" />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="mx-4 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <Button onClick={loadHistory} variant="outline" size="sm" className="mt-2">
          Reintentar
        </Button>
      </div>
    );
  }

  // Vacío
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <ShieldCheck className="h-12 w-12 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">No hay escaneos registrados</p>
        <p className="text-xs text-slate-400">Los escaneos que guardes aparecerán aquí</p>
      </div>
    );
  }

  // Lista de historial
  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Historial de escaneos</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-500">
          {history.length}
        </span>
      </div>

      <div className="max-h-[calc(100vh-280px)] flex-col gap-2 overflow-y-auto">
        {history.map((item) => {
          const Icon = statusIcons[item.status] || AlertCircle;
          const domain = extractDomain(item.url);
          const date = new Date(item.createdAt);
          const timeStr = date.toLocaleDateString('es-VE', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-cyan-300 hover:shadow-sm"
            >
              {/* Indicador de riesgo */}
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${statusColors[item.status]}`}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Contenido */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{domain}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>{timeStr}</span>
                  <span className="font-semibold text-slate-500">{item.riskScore}/100</span>
                </div>
              </div>

              {/* Dot indicator */}
              <div className={`h-2.5 w-2.5 rounded-full ${dotColors[item.status]}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
