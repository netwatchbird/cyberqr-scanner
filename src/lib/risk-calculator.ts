/**
 * Motor de scoring y cálculo de riesgo por consenso
 *
 * Algoritmo de consenso ponderado entre 3 APIs de seguridad:
 * - VirusTotal (peso 50%)
 * - Google Safe Browsing (peso 30%)
 * - Urlscan.io (peso 20%)
 *
 * Umbrales:
 * - >= 71 → MALICIOUS (rojo)
 * - >= 41 → SUSPICIOUS (amarillo)
 * - < 41  → SAFE (verde)
 */

import {
  ScanStatus,
  ApiDetail,
  ScoringConfig,
  DEFAULT_SCORING_CONFIG,
} from '@/types/scan';

interface ConsensusResult {
  status: ScanStatus;
  score: number;
  confidence: number;
  breakdown: {
    maliciousVotes: number;
    suspiciousVotes: number;
    safeVotes: number;
    totalVotes: number;
    weightedSum: number;
  };
}

/**
 * Calcula el resultado final de consenso entre múltiples APIs.
 */
export function calculateConsensus(
  details: ApiDetail[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ConsensusResult {
  if (!details || details.length === 0) {
    return {
      status: 'ERROR',
      score: 0,
      confidence: 0,
      breakdown: {
        maliciousVotes: 0,
        suspiciousVotes: 0,
        safeVotes: 0,
        totalVotes: 0,
        weightedSum: 0,
      },
    };
  }

  const weights = [
    config.weights.virustotal,
    config.weights.googleSafeBrowsing,
    config.weights.urlscan,
  ];

  let weightedSum = 0;
  let totalWeight = 0;
  let maliciousVotes = 0;
  let suspiciousVotes = 0;
  let safeVotes = 0;

  for (let i = 0; i < details.length; i++) {
    const detail = details[i];
    const weight = i < weights.length ? weights[i] : 1 / details.length;

    weightedSum += detail.score * weight;
    totalWeight += weight;

    if (detail.status === 'MALICIOUS') maliciousVotes++;
    else if (detail.status === 'SUSPICIOUS') suspiciousVotes++;
    else safeVotes++;
  }

  const finalScore = Math.round((weightedSum / totalWeight) * 100) / 100;

  // Determinar status por score
  let finalStatus: ScanStatus;
  if (finalScore >= config.maliciousThreshold) {
    finalStatus = 'MALICIOUS';
  } else if (finalScore >= config.suspiciousThreshold) {
    finalStatus = 'SUSPICIOUS';
  } else {
    finalStatus = 'SAFE';
  }

  // Si alguna API dice MALICIOUS, elevar al menos a SUSPICIOUS
  if (maliciousVotes > 0 && finalStatus === 'SAFE') {
    finalStatus = 'SUSPICIOUS';
  }
  // Si la mayoría dice MALICIOUS, forzar MALICIOUS
  if (maliciousVotes >= Math.ceil(details.length / 2) && finalStatus !== 'MALICIOUS') {
    finalStatus = 'MALICIOUS';
  }

  // Calcular confianza
  const totalVotes = details.length;
  let matchingVotes = 0;
  for (const detail of details) {
    if (detail.status === finalStatus) matchingVotes++;
  }
  const confidence = matchingVotes / totalVotes;

  return {
    status: finalStatus,
    score: Math.round(finalScore),
    confidence: Math.round(confidence * 100),
    breakdown: {
      maliciousVotes,
      suspiciousVotes,
      safeVotes,
      totalVotes,
      weightedSum: Math.round(weightedSum * 100) / 100,
    },
  };
}

/**
 * Convierte score numérico a label legible.
 */
export function scoreToLabel(score: number): string {
  if (score >= 71) return 'Peligroso';
  if (score >= 41) return 'Precaución';
  return 'Seguro';
}

/**
 * Convierte score a clase CSS.
 */
export function scoreToVariant(score: number): 'safe' | 'suspicious' | 'malicious' {
  if (score >= 71) return 'malicious';
  if (score >= 41) return 'suspicious';
  return 'safe';
}

/**
 * Genera recomendación basada en status.
 */
export function generateRecommendation(status: ScanStatus): string {
  switch (status) {
    case 'SAFE':
      return 'Esta URL parece segura según el análisis. Sin embargo, mantén siempre precaución al visitar enlaces desconocidos.';
    case 'SUSPICIOUS':
      return 'Esta URL muestra señales de posible riesgo. Se recomienda NO visitarla y eliminar el código QR.';
    case 'MALICIOUS':
      return 'PELIGRO: Esta URL ha sido identificada como maliciosa por múltiples fuentes. NO la abras bajo ninguna circunstancia.';
    case 'ERROR':
      return 'No se pudo completar el análisis. Intenta de nuevo más tarde.';
    default:
      return 'Estado desconocido.';
  }
}
