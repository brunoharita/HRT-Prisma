import { Button, Empty, Result, Skeleton, Spin, Statistic } from "antd";
import { CheckCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { interfaceText, observedMetric } from "../shared/uxFoundation";

type StateKind = "loading" | "empty" | "filtered" | "error" | "unavailable" | "info" | "success";
const titles: Record<StateKind, string> = {
  loading: "Carregando informações…", empty: "Nenhum registro ainda", filtered: "Nenhum resultado para estes filtros",
  error: "Não foi possível carregar as informações", unavailable: "Este item não está disponível", info: "Como interpretar", success: "Alteração concluída",
};

export function PrismaState({ kind, title, description, action, compact = false }: {
  kind: StateKind; title?: string; description?: ReactNode; action?: { label: string; onClick: () => void }; compact?: boolean;
}) {
  const heading = interfaceText(title ?? titles[kind]);
  return <section className={`prisma-state prisma-state--${kind}${compact ? " is-compact" : ""}`} role={kind === "error" ? "alert" : "status"} aria-live={kind === "error" ? "assertive" : "polite"} aria-busy={kind === "loading"}>
    {kind === "loading" ? <><span className="prisma-state-loading"><Spin size="small" />{heading}</span>{!compact ? <Skeleton active paragraph={{ rows: 4 }} title={false} /> : null}</>
      : kind === "empty" || kind === "filtered" ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><strong>{heading}</strong>{description ? <p>{description}</p> : null}</>} />
      : <Result status={kind === "success" ? "success" : kind === "error" ? "error" : "info"} icon={kind === "success" ? <CheckCircleOutlined /> : kind === "unavailable" ? <InfoCircleOutlined /> : undefined} title={heading} subTitle={description} />}
    {action ? <Button onClick={action.onClick} type={kind === "empty" || kind === "success" ? "primary" : "default"}>{action.label}</Button> : null}
  </section>;
}

export function PrismaMetric({ title, value, suffix = "", loading = false }: { title: string; value: number | null | undefined; suffix?: string; loading?: boolean }) {
  return <div className="prisma-metric" aria-busy={loading}>{loading ? <><span>{title}</span><Skeleton.Input active size="small" /></> : <Statistic title={title} value={observedMetric(value, suffix)} />}</div>;
}
