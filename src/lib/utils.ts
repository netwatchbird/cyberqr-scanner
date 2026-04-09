/**
 * Utilidad cn para merge de clases CSS.
 * Requerida por los componentes shadcn/ui (Button, Input).
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
