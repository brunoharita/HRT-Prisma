import type { ReactNode } from "react";

interface PrismaPageProps {
  children: ReactNode;
  className?: string;
}

interface PrismaPageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  extras?: ReactNode;
}

export function PrismaPage({ children, className }: PrismaPageProps) {
  return <div className={["prisma-page", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function PrismaPageHeader({
  title,
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
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="prisma-page-actions">{actions}</div> : null}
      </div>
      {extras ? <div className="prisma-page-extras">{extras}</div> : null}
    </header>
  );
}
