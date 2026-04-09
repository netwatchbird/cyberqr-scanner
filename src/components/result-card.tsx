'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { RiskIndicator } from '@/components/risk-indicator';
import { scoreToVariant, generateRecommendation } from '@/lib/risk-calculator';
import { extractDomain } from '@/lib/validators';
import type { ScanResult, AnalyzeResponse } from '@/types/scan';

interface ResultCardProps {
  result: AnalyzeResponse;
  onScanAnother: () => void;
}

const statusConfig = {
  SAFE: {
    icon: ShieldCheck,
    label: 'Seguro',
    bgClass: 'bg-emerald-50 border-emerald-300',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-400',
  },
  SUSPICIOUS: {
    icon: ShieldAlert,
    label: 'Sospechoso',
    bgClass: 'bg-amber-50 border-amber-300',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-400',
  },
  MALICIOUS: {
    icon: ShieldX,
    label: 'Peligroso',
    bgClass: 'bg-red-50 border-red-300',
    textClass: 'text-red-800',
    borderClass: 'border-red-400',
  },
  ERROR: {
    icon: Info,
    label: 'Error',
    bgClass: 'bg-slate-50 border-slate-300',
    textClass: 'text-slate-800',
    borderClass: 'border-slate-400',
  },
};

export function ResultCard({ result, onScanAnother }: ResultCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { data: session } = useSession();

  if (!result.success || !result.data) {
    return (
      <div className="mx-4 rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{result.error?.message || 'Error desconocido'}</p>
        <Button onClick={onScanAnother} variant="outline" className="mt-3 gap-2">
          <RotateCcw className="h-4 w-4" />
          Escanear otro
        </Button>
      </div>
    );
  }

  const scanData: ScanResult = result.data;
  const variant = scoreToVariant(scanData.riskScore);
  const config = statusConfig[scanData.status] || statusConfig.ERROR;
  const StatusIcon = config.icon;
  const recommendation = generateRecommendation(scanData.status);
  const domain = extractDomain(scanData.url);
  const demoMode = result.meta?.demoMode;

  // Guardar en historial
  const handleSave = async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: scanData.url,
          status: scanData.status,
          riskScore: scanData.riskScore,
          details: scanData.details,
        }),
      });
    } catch {
      // Error silencioso
    }
    setIsSaving(false);
  };

  return (
    <div className="mx-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md animate-in fade-in slide-in-from-bottom-4">
      {/* Header con semáforo */}
      <div className={`border-b-4 ${config.borderClass} ${config.bgClass} p-5 text-center`}>
        <StatusIcon className={`mx-auto mb-2 h-12 w-12 ${config.textClass}`} />
        <h2 className={`text-lg font-bold uppercase tracking-wider ${config.textClass}`}>
          {config.label}
        </h2>
      </div>

      {/* Cuerpo */}
      <div className="flex flex-col gap-4 p-5">
        {/* Score indicator */}
        <RiskIndicator score={scanData.riskScore} variant={variant} />

        {/* URL analizada */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            URL analizada
          </p>
          <p className="break-all font-mono text-xs text-slate-700">{scanData.url}</p>
          <p className="mt-1 text-xs text-slate-400">Dominio: {domain}</p>
        </div>

        {/* Recomendación */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs leading-relaxed text-slate-600">{recommendation}</p>
        </div>

        {/* Demo badge */}
        {demoMode && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-center">
            <p className="text-[11px] text-amber-700">
              Modo demo: Las API keys no están configuradas. Los resultados son simulados para demostración.
            </p>
          </div>
        )}

        {/* Detalles por API (expandible) */}
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex w-full items-center justify-between text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
          >
            <span>Detalles por motor</span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showDetails && scanData.details && (
            <div className="mt-3 flex flex-col gap-2">
              {scanData.details.map((detail) => {
                const detailVariant = scoreToVariant(detail.score);
                const detailConfig = statusConfig[detail.status] || statusConfig.ERROR;
                return (
                  <div
                    key={detail.source}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{detail.source}</p>
                      <p className="text-[10px] text-slate-400">
                        {detail.responseTimeMs}ms
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{
                        color: variantStyles[detailVariant].text,
                      }}>
                        {detail.score}/100
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${detailConfig.textClass}`}>
                        {detailConfig.label}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Metadata del procesamiento */}
              {result.meta && (
                <div className="mt-2 text-center text-[10px] text-slate-400">
                  Tiempo total: {result.meta.processingTimeMs}ms | APIs consultadas:{' '}
                  {result.meta.apisConsulted?.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer con acciones */}
      <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 p-4">
        <Button
          onClick={onScanAnother}
          className="w-full gap-2 bg-slate-800 hover:bg-slate-900"
        >
          <RotateCcw className="h-4 w-4" />
          Escanear otro código
        </Button>

        {session && (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            variant="outline"
            className="w-full gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Guardar en historial'}
          </Button>
        )}

        {!session && (
          <p className="text-center text-[10px] text-slate-400">
            Inicia sesión para guardar tus escaneos
          </p>
        )}
      </div>
    </div>
  );
}

const variantStyles = {
  safe: { text: '#059669' },
  suspicious: { text: '#d97706' },
  malicious: { text: '#dc2626' },
};
