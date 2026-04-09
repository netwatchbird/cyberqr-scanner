/**
 * Wrapper de la API de Urlscan.io
 * Documentación: https://urlscan.io/docs/api/
 *
 * Urlscan.io es asíncrono: primero submit, luego poll por UUID.
 * Si no hay API key configurada, retorna datos de demostración.
 */

import { ApiDetail, ScanStatus } from '@/types/scan';

/**
 * Analiza una URL con Urlscan.io.
 */
export async function analyzeWithUrlscan(url: string): Promise<ApiDetail> {
  const startTime = Date.now();
  const apiKey = process.env.URLSCAN_API_KEY;

  if (!apiKey) {
    return getDemoResult(url, startTime);
  }

  try {
    // Paso 1: Submit URL
    const submitRes = await fetch('https://urlscan.io/api/v1/scan/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': apiKey,
      },
      body: JSON.stringify({
        url,
        visibility: 'public',
      }),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      throw new Error(`Urlscan submit error: ${submitRes.status} - ${errText}`);
    }

    const submitData = await submitRes.json();
    const uuid = submitData.uuid;
    const resultUrl = submitData.result;

    if (!uuid || !resultUrl) {
      throw new Error('No UUID received from Urlscan');
    }

    // Paso 2: Poll por resultado
    const result = await pollForResult(uuid, resultUrl);
    const responseTimeMs = Date.now() - startTime;

    return {
      source: 'Urlscan.io',
      status: result.status,
      score: result.score,
      responseTimeMs,
      metadata: result.metadata,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.error('[Urlscan] Error:', error);
    return {
      source: 'Urlscan.io',
      status: 'ERROR',
      score: 50,
      responseTimeMs,
      metadata: { error: (error as Error).message },
    };
  }
}

async function pollForResult(
  uuid: string,
  resultUrl: string,
  maxAttempts = 8,
  delay = 3000
): Promise<{ status: ScanStatus; score: number; metadata: Record<string, unknown> }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      const res = await fetch(resultUrl);
      if (!res.ok) continue;

      const data = await res.json();
      const verdicts = data.verdicts;

      if (!verdicts?.overall) continue;

      const overallScore = verdicts.overall.score as number;
      const isMalicious = verdicts.overall.malicious as boolean;
      const categories = (verdicts.urlscan?.categories || []) as string[];

      const score = Math.round(overallScore);
      let status: ScanStatus;
      if (isMalicious || score >= 71) status = 'MALICIOUS';
      else if (score >= 41) status = 'SUSPICIOUS';
      else status = 'SAFE';

      return {
        status,
        score: Math.min(Math.max(score, 0), 100),
        metadata: {
          uuid,
          categories,
          technologies: (data.data?.technologies || []).map((t: { name: string }) => t.name),
          malicious: isMalicious,
        },
      };
    } catch {
      continue;
    }
  }

  return { status: 'ERROR', score: 50, metadata: { timeout: true, uuid } };
}

/**
 * Datos de demostración para Urlscan.io.
 */
function getDemoResult(url: string, startTime: number): ApiDetail {
  const suspiciousTlds = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.work'];
  const phishingPatterns = ['wp-login', 'admin', 'cpanel', 'webmail', 'bank', 'paypal', 'secure'];

  let score = 8;
  const categories: string[] = [];

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;

    // TLD sospechoso
    if (suspiciousTlds.some(tld => domain.endsWith(tld))) {
      score += 35;
      categories.push('suspicious-tld');
    }

    // Subdominios excesivos
    const subdomainCount = domain.split('.').length - 2;
    if (subdomainCount > 3) {
      score += 20;
      categories.push('excessive-subdomains');
    }

    // Patrones de phishing en URL
    if (phishingPatterns.some(p => url.toLowerCase().includes(p))) {
      score += 30;
      categories.push('phishing');
    }

    // IP directa en lugar de dominio
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
      score += 40;
      categories.push('ip-address');
    }

    // Longitud de dominio inusualmente larga
    if (domain.length > 30) {
      score += 10;
      categories.push('long-domain');
    }
  } catch {
    // URL inválida
    score += 30;
    categories.push('invalid-url');
  }

  score = Math.min(Math.max(score, 0), 100);

  let status: ScanStatus;
  if (score >= 71) status = 'MALICIOUS';
  else if (score >= 41) status = 'SUSPICIOUS';
  else status = 'SAFE';

  return {
    source: 'Urlscan.io',
    status,
    score,
    responseTimeMs: Date.now() - startTime + Math.floor(Math.random() * 300 + 200),
    metadata: {
      demo: true,
      categories,
      technologies: [],
      malicious: status === 'MALICIOUS',
    },
  };
}
