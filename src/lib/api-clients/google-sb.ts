/**
 * Wrapper de la API de Google Safe Browsing v4
 * Documentación: https://developers.google.com/safe-browsing/v4
 *
 * Si no hay API key configurada, retorna datos de demostración.
 */

import { ApiDetail, ScanStatus } from '@/types/scan';

interface GSBMatch {
  threatType: string;
  platformType: string;
}

/**
 * Analiza una URL con Google Safe Browsing.
 */
export async function analyzeWithGoogleSB(url: string): Promise<ApiDetail> {
  const startTime = Date.now();
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

  if (!apiKey) {
    return getDemoResult(url, startTime);
  }

  try {
    const body = {
      client: {
        clientId: 'cyberqr-scanner',
        clientVersion: '1.0.0',
      },
      threatInfo: {
        threatTypes: [
          'MALWARE',
          'SOCIAL_ENGINEERING',
          'UNWANTED_SOFTWARE',
          'POTENTIALLY_HARMFUL_APPLICATION',
        ],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }],
      },
    };

    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      throw new Error(`Google SB error: ${res.status}`);
    }

    const data = await res.json();
    const responseTimeMs = Date.now() - startTime;

    const matches = (data.matches || []) as GSBMatch[];

    if (matches.length === 0) {
      return {
        source: 'Google Safe Browsing',
        status: 'SAFE',
        score: 5,
        responseTimeMs,
        metadata: { threatsFound: 0 },
      };
    }

    // Calcular score basado en tipo y cantidad de amenazas
    let score = 70;
    const threatTypes = matches.map(m => m.threatType);
    if (threatTypes.includes('MALWARE')) score = 90;
    else if (threatTypes.includes('SOCIAL_ENGINEERING')) score = 80;
    else if (threatTypes.includes('UNWANTED_SOFTWARE')) score = 65;

    return {
      source: 'Google Safe Browsing',
      status: score >= 71 ? 'MALICIOUS' : 'SUSPICIOUS',
      score,
      responseTimeMs,
      metadata: {
        threatsFound: matches.length,
        threatTypes,
      },
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.error('[Google SB] Error:', error);
    return {
      source: 'Google Safe Browsing',
      status: 'ERROR',
      score: 50,
      responseTimeMs,
      metadata: { error: (error as Error).message },
    };
  }
}

/**
 * Datos de demostración para Google Safe Browsing.
 */
function getDemoResult(url: string, startTime: number): ApiDetail {
  const phishingKeywords = ['login', 'signin', 'account-verify', 'secure-auth', 'update-payment'];
  const malwareKeywords = ['download', '.exe', '.zip', 'install', 'free-'];
  const urlLower = url.toLowerCase();

  const hasPhishing = phishingKeywords.some(k => urlLower.includes(k));
  const hasMalware = malwareKeywords.some(k => urlLower.includes(k));

  // Verificar si dominio usa caracteres engañosos (homograph attack)
  let hasHomograph = false;
  try {
    const domain = new URL(url).hostname;
    const nonAscii = domain.split('').some(c => c.charCodeAt(0) > 127);
    if (nonAscii) hasHomograph = true;
  } catch {
    // ignore
  }

  let score = 5;
  let status: ScanStatus = 'SAFE';

  if (hasPhishing) { score += 60; status = 'MALICIOUS'; }
  if (hasMalware) { score += 55; status = 'MALICIOUS'; }
  if (hasHomograph) { score += 45; if (status === 'SAFE') status = 'SUSPICIOUS'; }

  if (score > 100) score = 100;

  return {
    source: 'Google Safe Browsing',
    status,
    score,
    responseTimeMs: Date.now() - startTime + Math.floor(Math.random() * 150 + 80),
    metadata: {
      demo: true,
      threatsFound: score > 40 ? 1 : 0,
      threatTypes: score >= 71 ? ['SOCIAL_ENGINEERING'] : [],
    },
  };
}
