import type { ReactNode } from "react";

export function PrismaDisclosure({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className="prisma-disclosure" open={open || undefined}><summary>{title}</summary><div>{children}</div></details>;
}
