import { useState } from "react";
import { Alert, Button, Drawer, Tag } from "antd";
import { ApartmentOutlined, CheckSquareFilled } from "@ant-design/icons";
import type { VacancyDetail, VacancyRequirementDraft } from "../domain/vacancy";
import { vacancyRequirementCategories } from "../domain/vacancy";
import { POSITION_TAXONOMY_CONTRACT } from "../domain/positionTaxonomy";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PositionTaxonomyPanel, TaxonomyOriginDetails } from "./PositionTaxonomyPanel";
import "../pages/positionOverview.css";

interface Props {
  detail: VacancyDetail;
  membership: OrganizationMembership;
  onEdit: () => void;
  onFollowUp: () => void;
}

export function PositionOverview({ detail, membership, onEdit, onFollowUp }: Props) {
  const [referencesOpen, setReferencesOpen] = useState(false);
  // The compact status follows the same title/tenant scope as the complete reference panel.
  const taxonomy = detail.taxonomy?.contractVersion === POSITION_TAXONOMY_CONTRACT
    && detail.taxonomy.originalTitle === detail.title && detail.taxonomy.organizationId === membership.organizationId
    ? detail.taxonomy : null;
  const pending = detail.requirements.filter(item => item.importance === "unclassified");
  const referencePending = taxonomy?.state === "ambiguous" || taxonomy?.state === "unresolved";
  const referenceLabel = taxonomy?.state === "resolved" ? "Referência vinculada"
    : taxonomy?.state === "ambiguous" ? "Associação a revisar"
      : taxonomy?.state === "unresolved" ? "Sem referência vinculada" : "Referência não registrada";
  return <div className="prisma-position-overview">
    <PrismaCard className="prisma-position-reading">
      <h2>Resumo da posição</h2>
      <p className="prisma-position-description">Missão, responsabilidades e requisitos da definição vigente.</p>
      <section className="prisma-position-mission" aria-labelledby="position-mission-title">
        <h3 id="position-mission-title">Sobre a posição</h3>
        <p>{detail.mission.trim() || "Missão não informada."}</p>
      </section>
      {pending.length ? <Alert className="prisma-position-pending" type="warning" showIcon title="Requisitos para classificar"
        description="Há requisitos sem classificação entre Obrigatório e Desejável. Eles permanecem visíveis abaixo."
        action={<Button onClick={onEdit}>Classificar requisitos</Button>} /> : null}
      <div className="prisma-position-highlights">
        <section className="prisma-position-highlight" aria-labelledby="position-work-title">
          <header><span className="prisma-position-highlight-icon" aria-hidden><ApartmentOutlined /></span><h3 id="position-work-title">O que a Pessoa vai fazer</h3></header>
          <h4>Responsabilidades</h4>
          <PositionTextList items={detail.responsibilities} empty="Responsabilidades não informadas." />
          <div className="prisma-position-highlight-secondary"><h4>Resultados esperados</h4><PositionTextList items={detail.expectedOutcomes} empty="Resultados esperados não informados." /></div>
        </section>
        <section className="prisma-position-highlight" aria-labelledby="position-requirements-title">
          <header><span className="prisma-position-highlight-icon" aria-hidden><CheckSquareFilled /></span><h3 id="position-requirements-title">O que a Pessoa precisa trazer</h3></header>
          <h4>Obrigatórios</h4>
          <PositionRequirements items={detail.requirements.filter(item => item.importance === "required")} empty="Nenhum requisito obrigatório informado." />
          <div className="prisma-position-highlight-secondary"><h4>Desejáveis</h4><PositionRequirements items={detail.requirements.filter(item => item.importance === "desired")} empty="Nenhum requisito desejável informado." /></div>
          {pending.length ? <div className="prisma-position-highlight-secondary"><h4>Para classificar</h4><PositionRequirements items={pending} empty="" /></div> : null}
        </section>
      </div>
    </PrismaCard>
    <aside className="prisma-position-context" aria-label="Contexto e ações da Posição">
      <PrismaCard title="Contexto de trabalho"><PositionTextList items={detail.contextItems} empty="Contexto de trabalho não informado." /></PrismaCard>
      <PrismaCard className={referencePending ? "prisma-position-reference is-pending" : "prisma-position-reference"} title="Referência ocupacional">
        <Tag color={taxonomy?.state === "resolved" ? "green" : referencePending ? "gold" : "default"}>{referenceLabel}</Tag>
        <p>{taxonomy?.state === "ambiguous" ? "Mais de uma interpretação pode representar este título. Revise a associação."
          : taxonomy?.state === "unresolved" ? "Nenhuma referência foi vinculada. A Posição pode permanecer sem associação."
            : taxonomy ? "Consulte a associação, sua origem e as fontes utilizadas."
              : "Esta definição não possui referência válida registrada. Consulte os detalhes ou edite a Posição."}</p>
        <Button block onClick={() => setReferencesOpen(true)}>Ver referência e fontes</Button>
        {referencePending ? <Button block className="prisma-position-reference-review" onClick={onEdit}>Revisar associação</Button> : null}
        <p className="prisma-position-note">Referências não se tornam requisitos automaticamente.</p>
      </PrismaCard>
      <PrismaCard title="Acompanhamento"><p>Conduza a avaliação das Pessoas incluídas nesta Posição.</p><Button block onClick={onFollowUp}>Abrir acompanhamento</Button></PrismaCard>
    </aside>
    <Drawer title="Referência e fontes da Posição" open={referencesOpen} onClose={() => setReferencesOpen(false)} size={760} className="prisma-position-reference-drawer">
      {referencesOpen ? <PositionTaxonomyPanel draft={{ ...detail, taxonomy }} membership={membership} onEdit={() => { setReferencesOpen(false); onEdit(); }} /> : null}
    </Drawer>
  </div>;
}

function PositionTextList({ items, empty }: { items: string[]; empty: string }) {
  return items.some(item => item.trim()) ? <ul className="prisma-position-text-list">{items.filter(item => item.trim()).map((item, index) => <li key={index}>{item}</li>)}</ul>
    : <p className="prisma-position-empty">{empty}</p>;
}

function PositionRequirements({ items, empty }: { items: VacancyRequirementDraft[]; empty: string }) {
  return items.length ? <div className="prisma-position-requirement-groups">{vacancyRequirementCategories.map(category => {
    const grouped = items.filter(item => item.category === category.value);
    return grouped.length ? <section key={category.value} aria-label={category.label}><p className="prisma-position-requirement-category">{category.label}</p><ul className="prisma-position-text-list">{grouped.map(item => <li key={item.stableId}>{item.label}{item.taxonomyOrigin ? <TaxonomyOriginDetails item={item.taxonomyOrigin} /> : null}</li>)}</ul></section> : null;
  })}</div> : <p className="prisma-position-empty">{empty}</p>;
}
