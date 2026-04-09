/**
 * Motor de consenso: orquesta las 3 APIs y calcula resultado final.
 * Este es el punto de entrada principal del análisis de seguridad.
 */

import { ScanResult, ApiDetail } from '@/types/scan';
import { validateAndSanitizeURL } from '@/lib/validators';
import { calculateConsensus } from '@/lib/risk-calculator';
import { analyzeWithVirusTotal } from '@/lib/api-clients/virustotal';
import { analyzeWithGoogleSB } from '@/lib/api-clients/google-sb';
import { analyzeWithUrlscan } from '@/lib/api-clients/urlscan';

/**
 * Analiza una URL de código QR usando consenso de 3 APIs.
 *
 * Flujo:
 * 1. Validar y sanitizar URL
 * 2. Consultar las 3 APIs en paralelo
 * 3. Calcular consenso ponderado
 * 4. Retornar resultado consolidado
 */
export async function analyzeQRCode(rawUrl: string): Promise<{
  success: boolean;
  data?: ScanResult;
  error?: { code: string; message: string };
  meta?: {
    processingTimeMs: number;
    apisConsulted: string[];
    demoMode: boolean;
  };
}> {
  const startTime = Date.now();

  // Paso 1: Validar URL
  const validation = validateAndSanitizeURL(rawUrl);
  if (!validation.isValid) {
    return {
      success: false,
      error: {
        code: validation.errorCode || 'INVALID_URL_FORMAT',
        message: validation.errorMessage || 'URL inválida',
      },
      meta: {
        processingTimeMs: Date.now() - startTime,
        apisConsulted: [],
        demoMode: false,
      },
    };
  }

  const sanitizedUrl = validation.sanitizedUrl!;

  // Paso 2: Consultar APIs en paralelo
  const hasAnyKey = !!(
    process.env.VIRUSTOTAL_API_KEY ||
    process.env.GOOGLE_SAFE_BROWSING_API_KEY ||
    process.env.URLSCAN_API_KEY
  );

  let details: ApiDetail[];

  try {
    // Ejecutar las 3 APIs en paralelo para velocidad
    const [vtResult, gsbResult, urlscanResult] = await Promise.allSettled([
      analyzeWithVirusTotal(sanitizedUrl),
      analyzeWithGoogleSB(sanitizedUrl),
      analyzeWithUrlscan(sanitizedUrl),
    ]);

    details = [vtResult, gsbResult, urlscanResult].map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      // Si una API falla completamente, retornar error para esa API
      return {
        source: ['VirusTotal', 'Google Safe Browsing', 'Urlscan.io'][index] as ApiDetail['source'],
        status: 'ERROR' as const,
        score: 50,
        responseTimeMs: 0,
        metadata: { error: result.reason?.message || 'API falló' },
      };
    });
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'API_UNAVAILABLE',
        message: 'Error al consultar los servicios de análisis.',
      },
      meta: {
        processingTimeMs: Date.now() - startTime,
        apisConsulted: [],
        demoMode: hasAnyKey,
      },
    };
  }

  // Paso 3: Calcular consenso
  const consensus = calculateConsensus(details);

  const processingTimeMs = Date.now() - startTime;

  // Paso 4: Construir resultado final
  const scanResult: ScanResult = {
    url: sanitizedUrl,
    status: consensus.status,
    riskScore: consensus.score,
    timestamp: new Date(),
    details,
  };

  return {
    success: true,
    data: scanResult,
    meta: {
      processingTimeMs,
      apisConsulted: details.map(d => d.source),
      demoMode: !hasAnyKey,
    },
  };
}
