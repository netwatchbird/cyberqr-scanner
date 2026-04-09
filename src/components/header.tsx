'use client';

import { useSession, signOut } from 'next-auth/react';
import { Shield, LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onOpenAuth: () => void;
  currentView: 'scanner' | 'history';
  onViewChange: (view: 'scanner' | 'history') => void;
}

export function Header({ onOpenAuth, currentView, onViewChange }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        {/* Logo y título */}
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-cyan-600" />
          <h1 className="text-lg font-bold text-slate-900">CyberQR</h1>
        </div>

        {/* Navegación tabs */}
        <nav className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
          <button
            onClick={() => onViewChange('scanner')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              currentView === 'scanner'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Escanear
          </button>
          <button
            onClick={() => onViewChange('history')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              currentView === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Historial
          </button>
        </nav>

        {/* Auth */}
        {session?.user ? (
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:inline">
              {session.user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="h-8 text-slate-500 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAuth}
            className="gap-1.5 text-slate-500"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Ingresar</span>
          </Button>
        )}
      </div>
    </header>
  );
}
