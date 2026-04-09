/**
 * Wrapper de la API de VirusTotal v3
 * Documentación: https://developers.virustotal.com/reference/url
 *
 * Si no hay API key configurada, retorna datos de demostración.
 */

import { ApiDetail, ScanStatus } from '@/types/scan';

interface VirusTotalStats {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
}

/**
 * Analiza una URL con VirusTotal.
 * Retorna los detalles del análisis o datos demo si no hay API key.
 */
export async function analyzeWithVirusTotal(url: string): Promise<ApiDetail> {
  const startTime = Date.now();
  const apiKey = process.env.VIRUSTOTAL_API_KEY;

  if (!apiKey) {
    // Modo demo: simular respuesta
    return getDemoResult(url, startTime);
  }

  try {
    // Paso 1: Enviar URL para análisis
    const submitRes = await fetch('https://www.virustotal.com/api/v3/urls', {
      method: 'POST',
      headers: {
        'x-apikey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `url=${encodeURIComponent(url)}`,
    });

    if (!submitRes.ok) {
      throw new Error(`VirusTotal submit error: ${submitRes.status}`);
    }

    const submitData = await submitRes.json();
    const analysisId = submitData.data?.id;

    if (!analysisId) {
      throw new Error('No analysis ID received from VirusTotal');
    }

    // Paso 2: Esperar y obtener resultado (polling con timeout)
    const result = await pollForResult(analysisId, apiKey);
    const responseTimeMs = Date.now() - startTime;

    return {
      source: 'VirusTotal',
      status: result.status,
      score: result.score,
      responseTimeMs,
      metadata: result.metadata,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.error('[VirusTotal] Error:', error);
    return {
      source: 'VirusTotal',
      status: 'ERROR',
      score: 50,
      responseTimeMs,
      metadata: { error: (error as Error).message },
    };
  }
}

async function pollForResult(
  analysisId: string,
  apiKey: string,
  maxAttempts = 10,
  delay = 3000
): Promise<{ status: ScanStatus; score: number; metadata: Record<string, unknown> }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, delay));

    const res = await fetch(
      `https://www.virustotal.com/api/v3/analyses/${encodeURIComponent(analysisId)}`,
      { headers: { 'x-apikey': apiKey } }
    );

    if (!res.ok) continue;

    const data = await res.json();
    const stats = data.data?.attributes?.stats as VirusTotalStats | undefined;

    if (stats) {
      return parseVirusTotalStats(stats);
    }
  }

  return { status: 'ERROR', score: 50, metadata: { timeout: true } };
}

function parseVirusTotalStats(stats: VirusTotalStats): {
  status: ScanStatus;
  score: number;
  metadata: Record<string, unknown>;
} {
  const totalEngines = stats.malicious + stats.suspicious + stats.harmless + stats.undetected;

  if (totalEngines === 0) {
    return { status: 'SAFE', score: 0, metadata: { malicious: 0, total: 0 } };
  }

  // Score: malicious tiene más peso que suspicious
  const maliciousRatio = stats.malicious / totalEngines;
  const suspiciousRatio = stats.suspicious / totalEngines;
  const score = Math.round((maliciousRatio * 100) + (suspiciousRatio * 50));

  let status: ScanStatus;
  if (stats.malicious > 0) {
    status = score >= 71 ? 'MALICIOUS' : 'SUSPICIOUS';
  } else if (stats.suspicious > 2) {
    status = 'SUSPICIOUS';
  } else {
    status = 'SAFE';
  }

  return {
    status,
    score: Math.min(score, 100),
    metadata: {
      maliciousEngines: stats.malicious,
      suspiciousEngines: stats.suspicious,
      harmlessEngines: stats.harmless,
      totalEngines,
    },
  };
}

/**
 * Datos de demostración cuando no hay API key.
 * Genera resultados determinísticos basados en el dominio.
 */
function getDemoResult(url: string, startTime: number): ApiDetail {
  const suspiciousDomains = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd'];
  const maliciousPatterns = ['login', 'secure', 'account', 'verify', 'update', 'banking', 'paypal'];
  const domain = extractDomain(url);

  const isShortener = suspiciousDomains.some(d => domain.includes(d));
  const hasMaliciousKeyword = maliciousPatterns.some(k => url.toLowerCase().includes(k));
  const isHttps = url.startsWith('https://');

  let score = 10; // Base: presumir seguro
  if (!isHttps) score += 15;
  if (isShortener) score += 30;
  if (hasMaliciousKeyword) score += 25;
  if (domain.includes('.xyz') || domain.includes('.tk') || domain.includes('.ml')) score += 20;

  // Score semialeatorio basado en hash del dominio para variación
  const hash = domain.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  score += (hash % 15) - 7;
  score = Math.max(0, Math.min(100, score));

  let status: ScanStatus;
  if (score >= 71) status = 'MALICIOUS';
  else if (score >= 41) status = 'SUSPICIOUS';
  else status = 'SAFE';

  return {
    source: 'VirusTotal',
    status,
    score,
    responseTimeMs: Date.now() - startTime + Math.floor(Math.random() * 200 + 100),
    metadata: {
      demo: true,
      maliciousEngines: score > 70 ? Math.floor(score / 15) : 0,
      totalEngines: 70,
    },
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
