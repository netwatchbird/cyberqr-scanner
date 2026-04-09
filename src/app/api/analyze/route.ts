import { NextRequest, NextResponse } from 'next/server';
import { analyzeQRCode } from '@/lib/api-clients/consensus';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rawUrl } = body;

    // Validar que se recibió una URL
    if (!rawUrl || typeof rawUrl !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_URL_FORMAT',
            message: 'Se requiere una URL para analizar.',
          },
        },
        { status: 400 }
      );
    }

    // Limitar longitud del request body
    if (rawUrl.length > 2048) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'URL_TOO_LONG',
            message: 'La URL excede la longitud máxima permitida.',
          },
        },
        { status: 400 }
      );
    }

    // Ejecutar análisis
    const result = await analyzeQRCode(rawUrl);

    // Retornar con status code apropiado
    const statusCode = result.success ? 200 : 422;
    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    console.error('[API /analyze] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Error interno del servidor.',
        },
      },
      { status: 500 }
    );
  }
}
