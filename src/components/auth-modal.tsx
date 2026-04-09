'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { X, Loader2, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        // Registro
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'Error al registrar');
          setIsLoading(false);
          return;
        }

        // Auto-login después del registro
        await signIn('credentials', { email, password, redirect: false });
      } else {
        // Login
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError('Email o contraseña incorrectos');
          setIsLoading(false);
          return;
        }
      }

      onClose();
      resetForm();
    } catch {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
          {/* Campo nombre (solo registro) */}
          {mode === 'register' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Nombre (opcional)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="pl-9"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* Campo email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="pl-9"
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Campo contraseña */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pl-9"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading || !email || !password}
            className="mt-1 gap-2 bg-slate-800 hover:bg-slate-900"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </Button>
        </form>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <button onClick={() => { setMode('register'); setError(''); }} className="text-cyan-600 hover:underline">
              No tienes cuenta? Regístrate
            </button>
          ) : (
            <button onClick={() => { setMode('login'); setError(''); }} className="text-cyan-600 hover:underline">
              Ya tienes cuenta? Inicia sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
