import {
  CheckCircleFilled,
  ClockCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
  MinusCircleFilled,
  StopFilled,
} from "@ant-design/icons";
import { Tag } from "antd";
import type { ReactNode } from "react";

export type PrismaStatusTone = "success" | "info" | "warning" | "danger" | "neutral" | "purple";

interface PrismaStatusTagProps {
  label: string;
  tone?: PrismaStatusTone;
  compact?: boolean;
}

const toneIcons = {
  success: <CheckCircleFilled />,
  info: <InfoCircleFilled />,
  warning: <ExclamationCircleFilled />,
  danger: <StopFilled />,
  neutral: <MinusCircleFilled />,
  purple: <ClockCircleFilled />,
} satisfies Record<PrismaStatusTone, ReactNode>;

export function PrismaStatusTag({ label, tone = "neutral", compact = false }: PrismaStatusTagProps) {
  return (
    <Tag
      className={`prisma-status-tag prisma-status-tag--${tone}${compact ? " is-compact" : ""}`}
      icon={toneIcons[tone]}
    >
      {label}
    </Tag>
  );
}
