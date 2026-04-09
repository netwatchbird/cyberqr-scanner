import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validaciones
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña son requeridos.' },
        { status: 400 }
      );
    }

    if (!email.includes('@') || email.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Formato de email inválido.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una cuenta con ese email.' },
        { status: 409 }
      );
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 12);

    // Crear usuario
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('[API /auth/register] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno al crear cuenta.' },
      { status: 500 }
    );
  }
}
