import { useEffect, useMemo, useState } from "react";
import { BulbOutlined, FileSearchOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Collapse, Space, Tag, Typography } from "antd";
import type {
  AdaptiveFieldSuggestion,
  AdaptiveSuggestionReport,
} from "../../domain/adaptiveResumeExtraction";

interface AdaptiveSuggestionPanelProps {
  report: AdaptiveSuggestionReport;
  busy: boolean;
  onApply: (suggestions: AdaptiveFieldSuggestion[]) => void;
  onDismiss: () => void;
  onNavigate: (suggestion: AdaptiveFieldSuggestion) => void;
}

const FIELD_LABELS: Record<AdaptiveFieldSuggestion["field"], string> = {
  role: "Cargo",
  organization: "Empresa",
  period: "Período",
  description: "Descrição e atividades",
};
const CRITERION_LABELS = {
  "same-section": "mesma seção",
  "header-geometry": "cabeçalho equivalente",
  "period-alignment": "período alinhado",
  "body-pattern": "corpo semelhante",
  spacing: "espaçamento consistente",
  "column-continuity": "mesma coluna",
} as const;

export function AdaptiveSuggestionPanel({ report, busy, onApply, onDismiss, onNavigate }: AdaptiveSuggestionPanelProps) {
  const allSuggestions = useMemo(() => report.suggestions.flatMap((suggestion) => suggestion.fields), [report]);
  const strongPaths = useMemo(() => report.suggestions.filter((item) => item.classification === "strong").flatMap((item) => item.fields.map((field) => field.fieldPath)), [report]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set(strongPaths));

  useEffect(() => {
    setSelectedPaths(new Set(strongPaths));
  }, [strongPaths]);

  function toggleField(fieldPath: string, checked: boolean) {
    setSelectedPaths((current) => {
      const next = new Set(current);
      if (checked) next.add(fieldPath); else next.delete(fieldPath);
      return next;
    });
  }

  function toggleExperience(fieldPaths: string[], checked: boolean) {
    setSelectedPaths((current) => {
      const next = new Set(current);
      fieldPaths.forEach((fieldPath) => checked ? next.add(fieldPath) : next.delete(fieldPath));
      return next;
    });
  }

  const selectedSuggestions = allSuggestions.filter((item) => selectedPaths.has(item.fieldPath));
  const hasSuggestions = report.suggestions.length > 0;
  return (
    <section aria-label="Sugestões de aprendizado do currículo" className="prisma-adaptive-suggestions">
      <div className="prisma-adaptive-suggestions__header">
        <div>
          <Typography.Title level={5}><BulbOutlined /> Aprendizado imediato do currículo</Typography.Title>
          <Typography.Text>{hasSuggestions
            ? `Encontramos outras ${report.suggestions.length} ${report.suggestions.length === 1 ? "experiência com estrutura semelhante" : "experiências com estrutura semelhante"}. Nada será incorporado sem sua confirmação.`
            : "Nenhuma alteração adicional segura foi encontrada. Sua correção já está preservada e você pode continuar a revisão."}
          </Typography.Text>
        </div>
        <Tag color={hasSuggestions ? "blue" : "green"}>{hasSuggestions ? "Revisão humana obrigatória" : "Nenhuma ação necessária"}</Tag>
      </div>

      {report.suggestions.map((suggestion) => {
        const fieldPaths = suggestion.fields.map((field) => field.fieldPath);
        const selectedCount = fieldPaths.filter((fieldPath) => selectedPaths.has(fieldPath)).length;
        return (
          <div className={`prisma-adaptive-experience prisma-adaptive-experience--${suggestion.classification}`} key={suggestion.candidateId}>
            <div className="prisma-adaptive-experience__title">
              <Checkbox
                checked={selectedCount === fieldPaths.length}
                indeterminate={selectedCount > 0 && selectedCount < fieldPaths.length}
                onChange={(event) => toggleExperience(fieldPaths, event.target.checked)}
              >
                Experiência {suggestion.experienceIndex + 1}: {suggestion.label}
              </Checkbox>
              <Space wrap>
                <Tag color={suggestion.kind === "new" ? "green" : "blue"}>{suggestion.kind === "new" ? "Sugerida pelo Prisma" : "Correção sugerida"}</Tag>
                <Tag color={suggestion.classification === "strong" ? "cyan" : "gold"}>{suggestion.classification === "strong" ? "Estrutura consistente" : "Revisão individual"}</Tag>
              </Space>
              <Typography.Text type="secondary">{suggestion.explanation}</Typography.Text>
              <Typography.Text className="prisma-adaptive-experience__criteria" type="secondary">
                Critérios observados: {suggestion.criteria.map((criterion) => CRITERION_LABELS[criterion]).join(" · ")}.
              </Typography.Text>
            </div>
            <div className="prisma-adaptive-field-list">
              {suggestion.fields.map((field) => (
                <div className="prisma-adaptive-field" key={field.fieldPath}>
                  <Checkbox checked={selectedPaths.has(field.fieldPath)} disabled={suggestion.kind === "new"} onChange={(event) => toggleField(field.fieldPath, event.target.checked)}>
                    <strong>{FIELD_LABELS[field.field]}</strong>
                  </Checkbox>
                  <div className="prisma-adaptive-field__comparison">
                    <span><small>{suggestion.kind === "new" ? "No perfil" : "Atual"}</small>{field.currentValue ?? "Ainda não existe"}</span>
                    <span><small>Proposto</small>{field.proposedValue}</span>
                  </div>
                  <Button icon={<FileSearchOutlined />} onClick={() => onNavigate(field)} size="small" type="link">
                    Ver origem na página {field.pageNumber}
                  </Button>
                  <Typography.Text type="secondary">{field.explanation}</Typography.Text>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {report.unresolved.length ? (
        <Collapse
          ghost
          items={[{
            key: "unresolved",
            label: `${report.unresolved.length} ${report.unresolved.length === 1 ? "registro sem proposta segura" : "registros sem proposta segura"}`,
            children: report.unresolved.map((item) => (
              <Alert key={`${item.experienceIndex}-${item.reasonCode}`} title={`Experiência ${item.experienceIndex + 1}: ${item.label}`} description={item.explanation} showIcon type="warning" />
            )),
          }]}
        />
      ) : null}

      <Space className="prisma-adaptive-suggestions__actions" wrap>
        <Button disabled={busy} onClick={onDismiss}>{hasSuggestions ? "Descartar sugestões" : "Fechar aviso"}</Button>
        {hasSuggestions ? <Button disabled={busy || selectedSuggestions.length === 0} loading={busy} onClick={() => onApply(selectedSuggestions)} type="primary">
          Revisar e aplicar {report.suggestions.filter((candidate) => candidate.fields.some((field) => selectedPaths.has(field.fieldPath))).length}
        </Button> : null}
      </Space>
    </section>
  );
}
