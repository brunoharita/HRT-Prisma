import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from "@supabase/supabase-js";
import type {
  PlatformUserBootstrapData,
  PlatformUserListItem,
  PlatformUserQuery,
  PlatformUserUpsertInput,
} from "../../domain/platformUsersData";
import { supabase } from "./client";

interface SignInResult {
  access_token: string;
  refresh_token: string;
}

export const platformUsersService = {
  async signInWithUsername(username: string, password: string): Promise<void> {
    const result = await invokeFunction<SignInResult>("operator-sign-in", { username, password });
    const { error } = await supabase.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
    if (error) throw new Error("Não foi possível materializar a sessão do operador.");
  },

  async requestPasswordReset(identifier: string): Promise<void> {
    await invokeFunction("operator-password-reset", { identifier });
  },

  async loadBootstrapData(query: PlatformUserQuery): Promise<PlatformUserBootstrapData> {
    return invokeFunction("platform-users", { action: "list", query });
  },

  async loadUser(userId: string): Promise<PlatformUserListItem> {
    return invokeFunction("platform-users", { action: "get", userId });
  },

  async createUser(input: PlatformUserUpsertInput): Promise<void> {
    await invokeFunction("platform-users", { action: "create", input });
  },

  async updateUser(userId: string, input: PlatformUserUpsertInput): Promise<void> {
    await invokeFunction("platform-users", { action: "update", userId, input });
  },

  async requestAdminPasswordReset(userId: string): Promise<void> {
    await invokeFunction("platform-users", { action: "admin_reset_password", userId });
  },

  async completeFirstAccess(): Promise<void> {
    await invokeFunction("platform-users", { action: "complete_first_access" });
  },
};

async function invokeFunction<T = void>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw await normalizeFunctionError(error);
  return data as T;
}

async function normalizeFunctionError(
  error: FunctionsHttpError | FunctionsRelayError | FunctionsFetchError,
): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json() as { error?: string };
      if (typeof payload.error === "string" && payload.error.trim()) {
        return new Error(payload.error);
      }
    } catch {
      // Keep the generic message below when the function body is not JSON.
    }
    return new Error("A função remota recusou a operação solicitada.");
  }
  if (error instanceof FunctionsRelayError) {
    return new Error("A chamada da função não pôde ser encaminhada pelo Supabase.");
  }
  if (error instanceof FunctionsFetchError) {
    return new Error("Não foi possível alcançar a função remota no Supabase.");
  }
  return new Error("Falha inesperada na integração de usuários.");
}
