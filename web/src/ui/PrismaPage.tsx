import type { ReactNode } from "react";
import { Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { usePrismaBack } from "./PrismaNavigation";

interface PrismaPageProps {
  children: ReactNode;
  className?: string;
}

interface PrismaPageHeaderProps {
  title: string;
  icon?: ReactNode;
  description?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  extras?: ReactNode;
}

export function PrismaPage({ children, className }: PrismaPageProps) {
  const back = usePrismaBack();
  return <div className={["prisma-page", className].filter(Boolean).join(" ")}>
    {back ? <nav className="prisma-page-return" aria-label="Retorno à tela anterior"><Button type="text" icon={<ArrowLeftOutlined />} aria-label="Voltar à tela anterior" title={back.canGoBack ? "Voltar à tela anterior" : "Nenhuma tela anterior nesta sessão"} disabled={!back.canGoBack} loading={back.goingBack} onClick={() => void back.goBack()}>Voltar</Button></nav> : null}
    {children}
  </div>;
}

export function PrismaPageHeader({
  title,
  icon,
  description,
  breadcrumbs,
  actions,
  extras,
}: PrismaPageHeaderProps) {
  return (
    <header className="prisma-page-header">
      {breadcrumbs ? <div className="prisma-page-breadcrumbs">{breadcrumbs}</div> : null}
      <div className="prisma-page-header-row">
        <div className="prisma-page-heading">
          {icon ? <span className="prisma-page-icon" aria-hidden="true">{icon}</span> : null}
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="prisma-page-actions">{actions}</div> : null}
      </div>
      {extras ? <div className="prisma-page-extras">{extras}</div> : null}
    </header>
  );
}
