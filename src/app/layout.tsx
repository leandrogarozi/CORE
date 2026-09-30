import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel FARO",
  description: "Foco, Ação, Rotina e Objetivos — painel de produtividade do Leandro",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FARO",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4A47D5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /* suppressHydrationWarning porque o script abaixo escreve data-theme no
       <html> antes do React entrar: sem isso o React reclama de um atributo
       que não existia no HTML do servidor. */
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Script cru, e não <Script strategy="beforeInteractive">, porque a
            própria documentação do Next diz que beforeInteractive "não bloqueia
            a hidratação" — e aqui bloquear é exatamente o ponto. Este roda
            durante a leitura do HTML, antes do primeiro pixel, senão a tela
            pisca branca antes de escurecer. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=localStorage.getItem('faro-tema');" +
              "var e=s==='escuro'||(s!=='claro'&&window.matchMedia('(prefers-color-scheme: dark)').matches);" +
              "document.documentElement.dataset.theme=e?'dark':'light';}" +
              "catch(_){document.documentElement.dataset.theme='light';}})()",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/icons/icon-32.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
