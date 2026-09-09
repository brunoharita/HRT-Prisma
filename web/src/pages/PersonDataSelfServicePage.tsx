import { useEffect, useMemo, useState } from "react";
import { DeleteOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Modal, Result, Spin, Typography } from "antd";
import type { PersonSelfServicePreview } from "../domain/personDeletion";
import { personDeletionService } from "../infrastructure/supabase/personDeletionService";

interface Props { token: string; }

export function PersonDataSelfServicePage({ token }: Props) {
  const [preview, setPreview] = useState<PersonSelfServicePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => `person-self-delete:${crypto.randomUUID()}`, []);

  useEffect(() => {
    let current = true;
    void personDeletionService.inspectSelf(token)
      .then((value) => { if (current) setPreview(value); })
      .catch(() => { if (current) setError("Acesso indisponível ou expirado."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [token]);

  function confirmDeletion() {
    if (!preview || deleting) return;
    Modal.confirm({
      title: "Excluir definitivamente seus dados?",
      width: 680,
      icon: <DeleteOutlined />,
      content: <DeletionImpact preview={preview} />,
      okText: "Excluir meus dados definitivamente",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      onOk: async () => {
        setDeleting(true);
        setError(null);
        try {
          await personDeletionService.deleteSelf(token, preview.preflightFingerprint, idempotencyKey);
          setPreview(null);
          setCompleted(true);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "A exclusão não pôde ser concluída agora.");
          throw caught;
        } finally {
          setDeleting(false);
        }
      },
    });
  }

  if (loading) return <PublicDataShell><div className="prisma-person-data-loading"><Spin size="large" /><span>Validando seu acesso...</span></div></PublicDataShell>;
  if (completed) return <PublicDataShell><Result status="success" title="Seus dados foram excluídos" subTitle="A exclusão definitiva foi concluída. Este acesso não pode mais ser utilizado." /></PublicDataShell>;
  if (!preview) return <PublicDataShell><Result status="error" title="Acesso indisponível" subTitle={error ?? "Este acesso expirou, foi revogado ou já foi utilizado."} /></PublicDataShell>;

  return <PublicDataShell>
    <Card className="prisma-person-data-card">
      <Typography.Text className="prisma-person-data-eyebrow">Privacidade e controle</Typography.Text>
      <Typography.Title level={1}>Seus dados no Prisma</Typography.Title>
      <Typography.Paragraph>Olá, {preview.personName}. Este acesso permite revisar o alcance da exclusão e, se desejar, remover definitivamente seu cadastro e seus dados individuais.</Typography.Paragraph>
      {error ? <Alert closable description="Você pode tentar novamente. O Prisma só informa sucesso após verificar banco e arquivos." message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      <DeletionImpact preview={preview} compact />
      <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={confirmDeletion} size="large" type="primary">Excluir meus dados</Button>
      <Typography.Paragraph className="prisma-person-data-expiry" type="secondary">Acesso válido até {new Date(preview.expiresAt).toLocaleString("pt-BR")}.</Typography.Paragraph>
    </Card>
  </PublicDataShell>;
}

function DeletionImpact({ preview, compact = false }: { preview: PersonSelfServicePreview; compact?: boolean }) {
  const impact = preview.impactSummary;
  return <div className={`prisma-person-delete-impact${compact ? " is-compact" : ""}`}>
    <Typography.Paragraph><strong>A exclusão é definitiva e não pode ser desfeita.</strong></Typography.Paragraph>
    <div className="prisma-person-delete-impact__grid">
      <section><strong>Será excluído</strong><ul>
        <li>Cadastro, contato e dados privados</li>
        <li>{impact.documents} {impact.documents === 1 ? "documento" : "documentos"} e {impact.storageObjects} {impact.storageObjects === 1 ? "arquivo" : "arquivos"}</li>
        <li>{impact.profiles} {impact.profiles === 1 ? "Perfil profissional" : "Perfis profissionais"} e {impact.reviews} {impact.reviews === 1 ? "revisão" : "revisões"}</li>
        <li>{impact.matching} {impact.matching === 1 ? "resultado de matching" : "resultados de matching"}</li>
        <li>{impact.verifications} {impact.verifications === 1 ? "necessidade de verificação" : "necessidades de verificação"} e {impact.assessmentAttempts} {impact.assessmentAttempts === 1 ? "tentativa" : "tentativas"}</li>
        <li>{impact.knowledgeProvenances} {impact.knowledgeProvenances === 1 ? "proveniência individual" : "proveniências individuais"} de Knowledge</li>
      </ul></section>
      <section><strong>Continuará disponível</strong><ul>
        <li>Vagas e posições da empresa, sem vínculo com você</li>
        <li>Knowledge compartilhado, taxonomias e aliases publicados</li>
        <li>Banco de itens, rubricas e definições de avaliação</li>
        <li>Auditoria mínima da operação, sem contato, currículo ou respostas</li>
      </ul></section>
    </div>
    <Alert description="Não serão gerados currículo, relatório, recomendação ou exportação a partir dos dados excluídos." message="Esta ação remove somente o agregado individual." showIcon type="warning" />
  </div>;
}

function PublicDataShell({ children }: { children: React.ReactNode }) {
  return <div className="prisma-person-data-shell"><header><span><SafetyCertificateOutlined /> prisma</span><small>Meus dados</small></header><main>{children}</main></div>;
}
