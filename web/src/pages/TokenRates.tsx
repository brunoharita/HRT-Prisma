import { Collapse, Empty, Table, Tag } from "antd";
import { formatTokens, tokenFunctionLabels, type TokenRate } from "../domain/prismaTokens";
import { classifyTokenRates } from "../domain/tokenRateHistory";

const date = (value: string) => new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
export function TokenRates({ rates }: { rates: TokenRate[] }) {
  const classified = classifyTokenRates(rates);
  const table = (items: TokenRate[]) => <Table<TokenRate> rowKey="id" size="small" pagination={false} scroll={{ x: 480 }} dataSource={items} columns={[
    { title: "Operação", render: (_, rate) => tokenFunctionLabels[rate.functionName] },
    { title: "Tokens Prisma", render: (_, rate) => formatTokens(rate.tokensPerUnit) },
    { title: "Início da vigência", render: (_, rate) => date(rate.effectiveAt) },
  ]} />;
  return <Collapse defaultActiveKey={["current"]} items={[
    { key: "current", label: "Tarifas atuais", children: table(classified.current) },
    { key: "history", label: "Histórico de tarifas", children: classified.history.length ? classified.history.map(group => <section key={group.effectiveAt} className="tokens-section"><h3>{date(group.effectiveAt)} {group.scheduled ? <Tag color="blue">Programada</Tag> : null}</h3>{table(group.rates)}</section>) : <Empty description="Nenhuma outra versão de tarifa." image={Empty.PRESENTED_IMAGE_SIMPLE} /> },
  ]} />;
}
