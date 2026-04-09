/**
 * Tipos principales del sistema de escaneo CyberQR
 * Basados en el informe de diseño del proyecto
 */

/** Estados posibles de un escaneo */
export type ScanStatus = 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS' | 'ERROR' | 'PENDING';

/** Detalle individual de cada API de seguridad */
export interface ApiDetail {
  source: 'VirusTotal' | 'Google Safe Browsing' | 'Urlscan.io';
  status: ScanStatus;
  score: number;
  responseTimeMs: number;
  metadata?: Record<string, unknown>;
}

/** Resultado completo de un análisis QR */
export interface ScanResult {
  id?: string;
  url: string;
  status: ScanStatus;
  riskScore: number;
  timestamp: Date;
  details: ApiDetail[];
  errorMessage?: string;
}

/** Configuración de scoring */
export interface ScoringConfig {
  maliciousThreshold: number;
  suspiciousThreshold: number;
  weights: {
    virustotal: number;
    googleSafeBrowsing: number;
    urlscan: number;
  };
}

/** Valores por defecto de configuración de scoring */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  maliciousThreshold: 71,
  suspiciousThreshold: 41,
  weights: {
    virustotal: 0.5,
    googleSafeBrowsing: 0.3,
    urlscan: 0.2,
  },
};

/** Resultado de la validación de URL */
export interface ValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  errorCode?: string;
  errorMessage?: string;
}

/** Códigos de error estandarizados */
export type ErrorCode =
  | 'INVALID_URL_FORMAT'
  | 'URL_TOO_LONG'
  | 'SCHEME_NOT_ALLOWED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'API_UNAVAILABLE'
  | 'CACHE_ERROR'
  | 'AUTH_REQUIRED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/** Mensajes amigables para cada error */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_URL_FORMAT: 'El formato del código QR no es una URL válida.',
  URL_TOO_LONG: 'La URL es demasiado larga para analizar.',
  SCHEME_NOT_ALLOWED: 'El tipo de enlace no está soportado (solo http/https).',
  RATE_LIMIT_EXCEEDED: 'Demasiados intentos. Espera unos segundos e inténtalo.',
  API_UNAVAILABLE: 'El servicio de análisis no está disponible ahora. Intenta de nuevo.',
  CACHE_ERROR: 'Error interno. Por favor recarga la página.',
  AUTH_REQUIRED: 'Debes iniciar sesión para realizar esta acción.',
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet e inténtalo.',
  UNKNOWN_ERROR: 'Ocurrió un error inesperado. Por favor inténtalo de nuevo.',
};

/** Request para el endpoint de análisis */
export interface AnalyzeRequest {
  rawUrl: string;
}

/** Response del endpoint de análisis */
export interface AnalyzeResponse {
  success: boolean;
  data?: ScanResult;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    processingTimeMs: number;
    apisConsulted: string[];
    demoMode: boolean;
  };
}
