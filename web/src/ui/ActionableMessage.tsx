import { Button, Space, message } from "antd";

/** An actionable failure stays visible until the operator follows its recovery or dismisses it. */
export function actionableMessageError(problem: string, action: { label: string; onClick: () => void }) {
  const close = message.error({ duration: 0, content: <Space direction="vertical" align="start"><span>{problem}</span><Space wrap><Button size="small" onClick={() => { close(); action.onClick(); }}>{action.label}</Button><Button size="small" type="text" onClick={() => close()}>Fechar aviso</Button></Space></Space> });
}
