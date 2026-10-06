import { Component, useEffect, useState, type ReactNode } from "react";
import { ApartmentOutlined, BankFilled, FileSearchOutlined } from "@ant-design/icons";
import { PrismaBriefcaseIcon } from "../../ui/PrismaBriefcaseIcon";
import { PrismaEducationIcon } from "../../ui/PrismaEducationIcon";
import { Alert, Button, Drawer, Grid } from "antd";
import { profileHighlights, type ProfileHighlight } from "../../domain/profileHighlights";
import type { PrismaProfileView } from "../../domain/canonicalProfile";

type Props = { profile?: PrismaProfileView | undefined; showSources?: boolean; onOriginal: () => void; today?: Date };
class HighlightBoundary extends Component<{ title: string; onOriginal: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { console.error("PRISMA_HIGHLIGHT_RENDER_FAILED"); }
  override render() { return this.state.failed ? <article className="prisma-profile-highlight"><div><Alert type="warning" title={`Não foi possível apresentar ${this.props.title.toLocaleLowerCase("pt-BR")} agora.`} description="As demais informações continuam disponíveis." /><Button style={{ marginTop: 12 }} onClick={this.props.onOriginal}>Consultar Perfil completo</Button></div></article> : this.props.children; }
}
const icons = { areas: <ApartmentOutlined />, position: <PrismaBriefcaseIcon />, education: <PrismaEducationIcon />, organizations: <BankFilled /> };
export function ProfileHighlightCards({ profile, showSources = false, onOriginal, today }: Props) {
  const [source, setSource] = useState<ProfileHighlight | null>(null);
  const screens = Grid.useBreakpoint();
  useEffect(() => { setSource(null); }, [profile]);
  useEffect(() => { if (!showSources) setSource(null); }, [showSources]);
  let cards: ProfileHighlight[];
  try { cards = profileHighlights(profile, today); }
  catch { return <Alert showIcon type="warning" title="Não foi possível preparar os destaques deste Perfil." description="A síntese e as demais informações continuam disponíveis." action={<Button onClick={onOriginal}>Consultar Perfil completo</Button>} />; }
  const values = (items: ProfileHighlight["values"], secondary = false) => <ul className={secondary ? "prisma-profile-highlight-secondary-values" : "prisma-profile-highlight-values"}>{items.map((item, i) => <li key={i}><strong>{item.text}</strong>{item.detail ? <p>{item.detail}</p> : null}</li>)}</ul>;
  return <>
    <div className="prisma-profile-highlights" aria-label="Destaques do Perfil publicado">{cards.map(card => <HighlightBoundary key={`${profile?.version?.profileId ?? ""}:${card.id}`} title={card.title} onOriginal={onOriginal}>
      <article className={`prisma-profile-highlight is-${card.id}${card.headline ? " has-headline" : ""}`} aria-label={card.title}>
        <span className="prisma-profile-highlight-icon" aria-hidden="true">{icons[card.id]}</span>
        <div className="prisma-profile-highlight-content"><h3>{card.title}</h3>
          {card.headline ? <p className="prisma-profile-highlight-headline">{card.headline}</p> : null}
          {card.values.length ? values(card.values) : <p className="prisma-profile-highlight-empty">{card.context ? "Atuação relatada" : "Informação ainda não determinada"}</p>}
          {card.context ? <p className="prisma-profile-highlight-context">{card.context}</p> : null}
          {card.additional?.values.length ? <div className="prisma-profile-highlight-secondary"><h4>{card.additional.title}</h4>{values(card.additional.values, true)}</div> : null}
          <p className="prisma-profile-highlight-note">{card.note}</p>
          {showSources ? <Button className="prisma-profile-highlight-source" type="link" icon={<FileSearchOutlined />} onClick={() => setSource(card)}>Ver origem dos destaques</Button> : null}
        </div>
      </article>
    </HighlightBoundary>)}</div>
    <Drawer title="Origem do destaque" open={Boolean(source && showSources)} onClose={() => setSource(null)} size={screens.md === false ? "100%" : 420} destroyOnHidden>
      {source ? <div className="prisma-synthesis-source-panel"><h3>{source.title}</h3><p className="prisma-synthesis-provenance">Informações do Perfil publicado vigente v{profile?.version?.number ?? "não identificada"}</p><p>{source.note}</p>{source.sources.map((item, i) => <section key={i}><h4>{item.label}</h4><blockquote>{item.text}</blockquote></section>)}<p className="prisma-synthesis-source-note">Durações são aproximações ao mês. Meses sobrepostos são contados uma vez; intervalos sem atuação registrada ficam fora. Relação com áreas declaradas exige menção explícita e não equivale a uma classificação taxonômica ou verificação externa.</p><Button onClick={() => { setSource(null); onOriginal(); }}>Consultar Perfil completo</Button></div> : null}
    </Drawer>
  </>;
}
