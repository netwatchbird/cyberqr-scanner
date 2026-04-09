/**
 * Validador y sanitizador de URLs
 * Capa de seguridad crítica contra XSS/Injection
 *
 * Implementa validación en doble capa:
 * 1. Frontend: validación rápida para UX
 * 2. Backend: re-validación estricta (never trust client)
 */

import { ValidationResult, ErrorCode } from '@/types/scan';

const CONFIG = {
  MAX_URL_LENGTH: 2048,
  MIN_URL_LENGTH: 10,
  ALLOWED_SCHEMES: ['http:', 'https:'],
  URL_PATTERN: /^https?:\/\/.+/i,
  DANGEROUS_PATTERNS: [
    /javascript:/gi,
    /data:/gi,
    /vbscript:/gi,
    /<[\s]*script/gi,
    /on\w+\s*=/gi,
  ],
};

/**
 * Valida y sanitiza una URL extraída de un código QR.
 * Se ejecuta tanto en frontend como en backend.
 */
export function validateAndSanitizeURL(rawUrl: string): ValidationResult {
  try {
    // Paso 1: Verificar que no esté vacía
    if (!rawUrl || typeof rawUrl !== 'string') {
      return {
        isValid: false,
        errorCode: 'INVALID_URL_FORMAT' as ErrorCode,
        errorMessage: 'URL vacía o inválida',
      };
    }

    const trimmed = rawUrl.trim();

    // Paso 2: Longitud
    if (trimmed.length < CONFIG.MIN_URL_LENGTH) {
      return {
        isValid: false,
        errorCode: 'INVALID_URL_FORMAT' as ErrorCode,
        errorMessage: 'URL demasiado corta',
      };
    }
    if (trimmed.length > CONFIG.MAX_URL_LENGTH) {
      return {
        isValid: false,
        errorCode: 'URL_TOO_LONG' as ErrorCode,
        errorMessage: 'URL excede longitud máxima',
      };
    }

    // Paso 3: Patrones peligrosos (XSS vectors)
    for (const pattern of CONFIG.DANGEROUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          isValid: false,
          errorCode: 'INVALID_URL_FORMAT' as ErrorCode,
          errorMessage: 'URL contiene patrón peligroso',
        };
      }
    }

    // Paso 4: Formato URL (RFC 3986)
    if (!CONFIG.URL_PATTERN.test(trimmed)) {
      return {
        isValid: false,
        errorCode: 'INVALID_URL_FORMAT' as ErrorCode,
        errorMessage: 'URL no coincide con formato permitido (debe iniciar con http:// o https://)',
      };
    }

    // Paso 5: Parseo y verificación de esquema
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return {
        isValid: false,
        errorCode: 'INVALID_URL_FORMAT' as ErrorCode,
        errorMessage: 'Formato de URL inválido',
      };
    }

    if (!CONFIG.ALLOWED_SCHEMES.includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        errorCode: 'SCHEME_NOT_ALLOWED' as ErrorCode,
        errorMessage: `Esquema '${parsedUrl.protocol}' no permitido. Solo http y https.`,
      };
    }

    // Paso 6: Sanitización básica (eliminar caracteres de control)
    const sanitizedUrl = trimmed
      .replace(/[\x00-\x1F\x7F]/g, '') // Caracteres de control
      .replace(/\s+/g, '%20');          // Espacios codificados

    if (!sanitizedUrl || sanitizedUrl.trim().length === 0) {
      return {
        isValid: false,
        errorCode: 'INVALID_URL_FORMAT' as ErrorCode,
        errorMessage: 'URL vacía después de sanitización',
      };
    }

    return {
      isValid: true,
      sanitizedUrl,
    };
  } catch (error) {
    return {
      isValid: false,
      errorCode: 'UNKNOWN_ERROR' as ErrorCode,
      errorMessage: `Error inesperado: ${(error as Error).message}`,
    };
  }
}

/**
 * Extrae el dominio de una URL para display truncado.
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}
