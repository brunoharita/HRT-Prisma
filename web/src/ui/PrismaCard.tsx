import type { ReactNode } from "react";
import { Card } from "antd";

interface PrismaCardProps {
  children: ReactNode;
  title?: ReactNode;
  extra?: ReactNode;
  className?: string;
}

export function PrismaCard({ children, title, extra, className }: PrismaCardProps) {
  return (
    <Card className={["prisma-card", className].filter(Boolean).join(" ")} title={title} extra={extra}>
      {children}
    </Card>
  );
}
