import { useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import type { PlatformOperator } from "../domain/platformUsersData";
import { supabase } from "../infrastructure/supabase/client";
import { platformUsersService } from "../infrastructure/supabase/platformUsersService";
import {
  buildPasswordRequirementState,
  isPasswordPolicySatisfied,
} from "../shared/platformUsers";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface PasswordChangePageProps {
  currentOperator: PlatformOperator;
  onNavigate: (path: string) => void;
  onPasswordCompleted: () => Promise<void>;
}

interface PasswordChangeValues {
  password: string;
  passwordConfirmation: string;
}

export function PasswordChangePage({ currentOperator, onNavigate, onPasswordCompleted }: PasswordChangePageProps) {
  const [form] = Form.useForm<PasswordChangeValues>();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const password = Form.useWatch("password", form) ?? "";
  const passwordConfirmation = Form.useWatch("passwordConfirmation", form) ?? "";
  const rules = buildPasswordRequirementState(password, passwordConfirmation, currentOperator.username);

  const handleSubmit = async (values: PasswordChangeValues) => {
    setSubmitting(true);
    setError(null);
    setInfo(null);

    if (!isPasswordPolicySatisfied(rules)) {
      setSubmitting(false);
      setError("A nova senha ainda não atende aos requisitos mínimos.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: values.password });
    if (updateError) {
      setSubmitting(false);
      setError("Não foi possível atualizar a senha nesta sessão.");
      return;
    }

    try {
      await platformUsersService.completeFirstAccess();
      setInfo("Senha atualizada com sucesso.");
      await onPasswordCompleted();
      onNavigate("/");
    } catch (completionError) {
      setError(completionError instanceof Error ? completionError.message : "Não foi possível concluir o primeiro acesso.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PrismaPage>
      <PrismaPageHeader
        title="Trocar senha"
        description="Conclua o primeiro acesso para liberar a operação do Prisma."
      />
      {error ? <Alert className="prisma-shell-alert" message={error} showIcon type="error" /> : null}
      {info ? <Alert className="prisma-shell-alert" message={info} showIcon type="success" /> : null}
      <PrismaCard className="prisma-password-change-card">
        <Form<PasswordChangeValues> form={form} layout="vertical" onFinish={(values) => void handleSubmit(values)} requiredMark={false}>
          <Form.Item label="Nova senha *" name="password" rules={[{ required: true, message: "Informe a nova senha." }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="Confirmar nova senha *" name="passwordConfirmation" rules={[{ required: true, message: "Confirme a senha." }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <div className="prisma-user-password-checklist is-standalone">
            <h3>Requisitos mínimos</h3>
            <ul>
              <PasswordRuleItem satisfied={rules.minLength} text="Mínimo de 12 caracteres" />
              <PasswordRuleItem satisfied={rules.uppercase} text="Letra maiúscula" />
              <PasswordRuleItem satisfied={rules.lowercase} text="Letra minúscula" />
              <PasswordRuleItem satisfied={rules.number} text="Número" />
              <PasswordRuleItem satisfied={rules.symbol} text="Caractere especial" />
              <PasswordRuleItem satisfied={rules.confirmationMatches} text="As senhas coincidem" />
            </ul>
          </div>
          <div className="prisma-password-change-actions">
            <Button onClick={() => onNavigate("/sign-in")}>Cancelar</Button>
            <Button htmlType="submit" loading={submitting} type="primary">Atualizar senha</Button>
          </div>
        </Form>
      </PrismaCard>
    </PrismaPage>
  );
}

function PasswordRuleItem({ satisfied, text }: { satisfied: boolean; text: string }) {
  return <li className={satisfied ? "is-satisfied" : ""}>{text}</li>;
}
