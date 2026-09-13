import type { ReactNode } from "react";

export function PrismaPublicShell({ children, label, compact = false, className = "" }: { children: ReactNode; label: string; compact?: boolean; className?: string }) {
  return <div className={`prisma-public-shell ${className}${compact ? " is-compact" : ""}`}>
    <a className="prisma-skip-link" href="#prisma-public-content">Ir para o conteúdo</a>
    <header className="prisma-public-brand"><div className="prisma-public-logo"><img src="/assets/login/prisma-logo-light.png" alt="Prisma" /></div><h1>{label}</h1></header>
    <main id="prisma-public-content" tabIndex={-1} className="prisma-public-content">{children}</main>
    <footer className="prisma-public-help">Precisa de ajuda? Entre em contato com a empresa que compartilhou este acesso.</footer>
  </div>;
}
