'use client';

import { useState, useCallback } from 'react';
import { Shield } from 'lucide-react';
import { Header } from '@/components/header';
import { QRScanner } from '@/components/qr-scanner';
import { ResultCard } from '@/components/result-card';
import { HistoryList } from '@/components/history-list';
import { AuthModal } from '@/components/auth-modal';
import type { AnalyzeResponse } from '@/types/scan';

export default function Home() {
  const [currentView, setCurrentView] = useState<'scanner' | 'history'>('scanner');
  const [lastResult, setLastResult] = useState<AnalyzeResponse | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const handleResult = useCallback((result: AnalyzeResponse) => {
    setLastResult(result);
    setShowResult(true);
  }, []);

  const handleScanAnother = useCallback(() => {
    setShowResult(false);
    setLastResult(null);
  }, []);

  const handleViewChange = useCallback((view: 'scanner' | 'history') => {
    setCurrentView(view);
    if (view === 'scanner') {
      setShowResult(false);
      setLastResult(null);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header
        onOpenAuth={() => setShowAuth(true)}
        currentView={currentView}
        onViewChange={handleViewChange}
      />

      <main className="flex flex-1 flex-col">
        {currentView === 'scanner' ? (
          <>
            {/* Pantalla de bienvenida / scanner */}
            {!showResult && (
              <div className="flex flex-col items-center gap-6 pt-6">
                {/* Hero */}
                <div className="mx-4 max-w-sm text-center">
                  <div className="mb-3 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h2 className="mb-1 text-xl font-bold text-slate-900">
                    Escáner de Seguridad QR
                  </h2>
                  <p className="text-sm text-slate-500">
                    Escanea cualquier código QR para verificar si la URL es segura antes de abrirla
                  </p>
                </div>

                {/* Scanner */}
                <QRScanner onResult={handleResult} />
              </div>
            )}

            {/* Resultado del análisis */}
            {showResult && lastResult && (
              <div className="pb-6 pt-4">
                <ResultCard result={lastResult} onScanAnother={handleScanAnother} />
              </div>
            )}
          </>
        ) : (
          <HistoryList />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-3 text-center">
        <p className="text-[10px] text-slate-400">
          CyberQR Scanner v2.0 &mdash; Universidad Santa María &mdash; Herramienta de detección de quishing
        </p>
      </footer>

      {/* Modal de autenticación */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
