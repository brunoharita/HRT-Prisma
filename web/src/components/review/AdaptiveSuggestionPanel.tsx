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

export function AdaptiveSuggestionPanel({ report, busy, onApply, onDismiss, onNavigate }: AdaptiveSuggestionPanelProps) {
  const allSuggestions = useMemo(() => report.suggestions.flatMap((suggestion) => suggestion.fields), [report]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set(allSuggestions.map((item) => item.fieldPath)));

  useEffect(() => {
    setSelectedPaths(new Set(allSuggestions.map((item) => item.fieldPath)));
  }, [allSuggestions]);

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
  return (
    <section aria-label="Sugestões de aprendizado do currículo" className="prisma-adaptive-suggestions">
      <div className="prisma-adaptive-suggestions__header">
        <div>
          <Typography.Title level={5}><BulbOutlined /> Aprendizado imediato do currículo</Typography.Title>
          <Typography.Text>
            A correção foi confirmada na fonte original. O Prisma releu os demais blocos e encontrou {report.suggestions.length} {report.suggestions.length === 1 ? "experiência relacionada" : "experiências relacionadas"}.
          </Typography.Text>
        </div>
        <Tag color="blue">Revisão humana obrigatória</Tag>
      </div>

      {report.suggestions.map((suggestion) => {
        const fieldPaths = suggestion.fields.map((field) => field.fieldPath);
        const selectedCount = fieldPaths.filter((fieldPath) => selectedPaths.has(fieldPath)).length;
        return (
          <div className="prisma-adaptive-experience" key={suggestion.experienceIndex}>
            <div className="prisma-adaptive-experience__title">
              <Checkbox
                checked={selectedCount === fieldPaths.length}
                indeterminate={selectedCount > 0 && selectedCount < fieldPaths.length}
                onChange={(event) => toggleExperience(fieldPaths, event.target.checked)}
              >
                Experiência {suggestion.experienceIndex + 1}: {suggestion.label}
              </Checkbox>
              <Typography.Text type="secondary">{suggestion.explanation}</Typography.Text>
            </div>
            <div className="prisma-adaptive-field-list">
              {suggestion.fields.map((field) => (
                <div className="prisma-adaptive-field" key={field.fieldPath}>
                  <Checkbox checked={selectedPaths.has(field.fieldPath)} onChange={(event) => toggleField(field.fieldPath, event.target.checked)}>
                    <strong>{FIELD_LABELS[field.field]}</strong>
                  </Checkbox>
                  <div className="prisma-adaptive-field__comparison">
                    <span><small>Atual</small>{field.currentValue ?? "Não identificado"}</span>
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
              <Alert key={`${item.experienceIndex}-${item.reasonCode}`} message={`Experiência ${item.experienceIndex + 1}: ${item.label}`} description={item.explanation} showIcon type="warning" />
            )),
          }]}
        />
      ) : null}

      <Space className="prisma-adaptive-suggestions__actions" wrap>
        <Button disabled={busy} onClick={onDismiss}>Ignorar por enquanto</Button>
        <Button disabled={busy || selectedSuggestions.length === 0} loading={busy} onClick={() => onApply(selectedSuggestions)} type="primary">
          Aplicar e salvar {selectedSuggestions.length} {selectedSuggestions.length === 1 ? "correção" : "correções"}
        </Button>
      </Space>
    </section>
  );
}
