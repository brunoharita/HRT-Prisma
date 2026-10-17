import {useState} from "react";
import {Alert,InputNumber,Select} from "antd";
import {PrismaCard} from "../ui/PrismaCard";
import {estimateTokenActivity} from "../domain/tokenActivityPlanning";
import {formatTokens,tokenFunctionLabels,type TokenFunction,type TokenOverview} from "../domain/prismaTokens";
import "../ui/uxEvolution.css";

export function TokenActivitySimulator({overview}:{overview:TokenOverview}) {
  const [activity,setActivity]=useState<TokenFunction>("parser_ia"),[quantity,setQuantity]=useState<number|null>(5);
  const estimate=estimateTokenActivity(overview.rates,activity,quantity,overview.available);
  return <PrismaCard className="prisma-token-simulator" title="Planejar uma atividade">
    <div className="prisma-simulation-fields"><label>Atividade<Select aria-label="Atividade para simular" value={activity} onChange={setActivity} options={Object.entries(tokenFunctionLabels).map(([value,label])=>({value,label}))}/></label><label>{activity==="position_assessment_items"?"Questões":"Quantidade"}<InputNumber aria-label="Quantidade de atividades" min={1} max={100000} precision={0} value={quantity} onChange={setQuantity}/></label></div>
    {estimate.state==="estimated"?<><div className="prisma-simulation-results" aria-live="polite"><div><span>Consumo estimado</span><strong>{formatTokens(estimate.amount)}</strong><span>Tokens Prisma</span></div><div><span>Saldo após a atividade</span><strong>{formatTokens(estimate.remaining)}</strong><span>Tokens Prisma</span></div></div>{estimate.missing>0?<Alert showIcon type="warning" title={`Faltam ${formatTokens(estimate.missing)} Tokens Prisma para esta quantidade.`}/>:null}<p className="prisma-simulation-note">Tarifa vigente: {formatTokens(estimate.unit)} tokens por {activity==="position_assessment_items"?"questão":"operação"}. A quantidade de questões pode variar por avaliação.</p></>:<p role="status">{estimate.state==="invalid_quantity"?"Informe uma quantidade inteira entre 1 e 100.000.":"Não há tarifa vigente disponível para estimar esta atividade."}</p>}
    {!overview.account.active?<p>As operações de IA desta empresa estão suspensas. A simulação continua disponível para consulta.</p>:null}
    <p className="prisma-simulation-note">Simulação sem consumo ou reserva. O valor é conferido antes da execução; tarifas, saldo e vencimentos podem mudar.</p>
  </PrismaCard>;
}
