'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Camera, ImagePlus, X, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateAndSanitizeURL } from '@/lib/validators';
import type { AnalyzeResponse } from '@/types/scan';

type DecoderState = 'idle' | 'scanning' | 'processing' | 'result' | 'error';

interface QRScannerProps {
  onResult: (result: AnalyzeResponse) => void;
}

export function QRScanner({ onResult }: QRScannerProps) {
  const [state, setState] = useState<DecoderState>('idle');
  const [error, setError] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpiar escáner al desmontar
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrRef.current) {
        const Html5Qrcode = (await import('html5-qrcode')).Html5Qrcode;
        if (html5QrRef.current instanceof Html5Qrcode) {
          try {
            await html5QrRef.current.stop();
          } catch {
            // El escáner podría ya estar detenido
          }
        }
        html5QrRef.current = null;
      }
      setCameraActive(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  }, []);

  // Escanear desde cámara
  const startCameraScan = useCallback(async () => {
    try {
      setState('scanning');
      setError('');

      const { Html5Qrcode } = await import('html5-qrcode');
      const scannerId = 'qr-reader';

      // Limpiar contenedor previo
      if (scannerRef.current) {
        scannerRef.current.innerHTML = `<div id="${scannerId}" style="width:100%;"></div>`;
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrRef.current = html5QrCode;
      setCameraActive(true);

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // QR detectado: detener cámara y procesar
          try {
            await html5QrCode.stop();
          } catch {
            // Ignorar error al detener
          }
          setCameraActive(false);
          processQRText(decodedText);
        },
        () => {
          // No se detectó QR en este frame, no hacer nada
        }
      );
    } catch (err) {
      console.error('Camera error:', err);
      setCameraActive(false);
      setError('No se pudo acceder a la cámara. Verifica los permisos o usa la opción de galería.');
      setState('error');
    }
  }, []);

  // Escanear desde archivo/galería
  const startFileScan = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setState('scanning');
      setError('');

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const html5QrCode = new Html5Qrcode('qr-file-reader');
        const decodedText = await html5QrCode.scanFile(file, true);
        processQRText(decodedText);
      } catch (err) {
        console.error('File scan error:', err);
        setError('No se pudo detectar un código QR en la imagen. Intenta con otra imagen.');
        setState('error');
      }

      // Limpiar input para permitir seleccionar el mismo archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    []
  );

  // Procesar texto del QR
  const processQRText = useCallback(
    async (rawText: string) => {
      setState('processing');
      setError('');

      // Validar que sea una URL
      const validation = validateAndSanitizeURL(rawText);
      if (!validation.isValid) {
        const errorMessage =
          validation.errorMessage || 'El código QR no contiene una URL válida.';
        setError(errorMessage);
        setState('error');
        return;
      }

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawUrl: validation.sanitizedUrl }),
        });

        const result: AnalyzeResponse = await response.json();
        setState('result');
        onResult(result);
      } catch (err) {
        console.error('Analysis error:', err);
        setError('Error de conexión al servidor de análisis. Verifica tu internet.');
        setState('error');
      }
    },
    [onResult]
  );

  // Resetear estado
  const reset = useCallback(() => {
    stopScanner();
    setState('idle');
    setError('');
  }, [stopScanner]);

  // Estado: escáner inactivo
  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center gap-6 px-4 py-8">
        {/* Botón cámara */}
        <button
          onClick={startCameraScan}
          className="flex h-44 w-44 flex-col items-center justify-center gap-2 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
        >
          <Camera className="h-10 w-10" />
          <span className="text-sm font-semibold">Escanear</span>
        </button>

        {/* Separador */}
        <div className="flex w-full max-w-xs items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">o</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Botón galería */}
        <button
          onClick={startFileScan}
          className="flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-600 transition-all hover:border-cyan-400 hover:text-cyan-600"
        >
          <ImagePlus className="h-5 w-5" />
          Subir imagen
        </button>

        {/* Input file oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Contenedor oculto para escaneo de archivo */}
        <div id="qr-file-reader" className="hidden" />

        {/* Texto informativo */}
        <p className="max-w-xs text-center text-xs text-slate-400">
          Apunta la cámara al código QR o sube una imagen que contenga un código QR
        </p>
      </div>
    );
  }

  // Estado: cámara activa
  if (cameraActive && state === 'scanning') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
        {/* Header de cámara */}
        <div className="flex items-center justify-between bg-black/50 px-4 py-3 text-white">
          <span className="text-sm font-medium">Apunta al código QR</span>
          <button
            onClick={async () => {
              await stopScanner();
              setState('idle');
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder */}
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          <div ref={scannerRef} className="h-full w-full" />
          {/* Overlay guía */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-dashed border-white/40" />
        </div>

        {/* Footer de cámara */}
        <div className="flex items-center justify-center gap-3 bg-black/50 px-4 py-4">
          <button
            onClick={async () => {
              await stopScanner();
              startFileScan();
            }}
            className="rounded-full bg-white/15 px-5 py-2 text-sm text-white transition-colors hover:bg-white/25"
          >
            <ImagePlus className="mr-2 inline h-4 w-4" />
            Galería
          </button>
        </div>

        {/* Contenedor oculto para escaneo de archivo */}
        <div id="qr-file-reader" className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // Estado: procesando
  if (state === 'processing') {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-12">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
        <p className="text-sm text-slate-600">Analizando URL con 3 motores de seguridad...</p>
        <p className="text-xs text-slate-400">Esto puede tomar unos segundos</p>
      </div>
    );
  }

  // Estado: error
  if (state === 'error') {
    return (
      <div className="mx-4 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
        <p className="mb-2 text-sm font-semibold text-red-800">{error}</p>
        <p className="mb-4 text-xs text-red-600">
          Asegúrate de que el código QR contenga una URL válida
        </p>
        <Button
          onClick={reset}
          variant="outline"
          className="gap-2 border-red-200 text-red-700 hover:bg-red-100"
        >
          <RotateCcw className="h-4 w-4" />
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  return null;
}
