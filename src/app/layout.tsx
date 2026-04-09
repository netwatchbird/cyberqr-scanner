import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "CyberQR Scanner | Detección de Quishing",
  description:
    "Herramienta de ciberseguridad para detectar códigos QR maliciosos (quishing). Analiza URLs con múltiples motores de seguridad.",
  keywords: [
    "ciberseguridad",
    "QR",
    "quishing",
    "phishing",
    "scanner",
    "seguridad",
  ],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
