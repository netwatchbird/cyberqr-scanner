import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/history - Obtener historial del usuario autenticado
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Debes iniciar sesión.' } },
        { status: 401 }
      );
    }

    // Buscar usuario
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Usuario no encontrado.' } },
        { status: 401 }
      );
    }

    // Obtener últimos 50 escaneos
    const scans = await db.scan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        url: true,
        status: true,
        riskScore: true,
        details: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: scans.map(scan => ({
        ...scan,
        details: JSON.parse(scan.details),
      })),
    });
  } catch (error) {
    console.error('[API /history GET] Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UNKNOWN_ERROR', message: 'Error interno.' } },
      { status: 500 }
    );
  }
}

// POST /api/history - Guardar un escaneo en el historial
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Debes iniciar sesión.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { url, status, riskScore, details } = body;

    // Validaciones básicas
    if (!url || !status || riskScore === undefined) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_URL_FORMAT', message: 'Datos incompletos.' } },
        { status: 400 }
      );
    }

    // Buscar o crear usuario
    const user = await db.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        name: session.user.name || null,
      },
    });

    // Guardar escaneo
    const scan = await db.scan.create({
      data: {
        url: String(url).substring(0, 2048),
        status: String(status),
        riskScore: Math.min(100, Math.max(0, Number(riskScore))),
        userId: user.id,
        details: JSON.stringify(details || []),
      },
    });

    return NextResponse.json({ success: true, data: { id: scan.id } });
  } catch (error) {
    console.error('[API /history POST] Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UNKNOWN_ERROR', message: 'Error interno.' } },
      { status: 500 }
    );
  }
}
