export const PLATFORM_ACCESS_PROFILES = [
  "super_admin",
  "owner",
  "admin",
  "recruiter",
  "member",
] as const;

export const PLATFORM_USER_STATUSES = [
  "pending_first_access",
  "active",
  "inactive",
  "blocked",
] as const;

export const CREDENTIAL_DELIVERY_MODES = ["manual_password", "activation_link"] as const;

export type PlatformAccessProfile = (typeof PLATFORM_ACCESS_PROFILES)[number];
export type PlatformUserStatus = (typeof PLATFORM_USER_STATUSES)[number];
export type CredentialDeliveryMode = (typeof CREDENTIAL_DELIVERY_MODES)[number];

export interface CountryPhoneOption {
  iso2: string;
  label: string;
  callingCode: string;
  minNationalLength: number;
  maxNationalLength: number;
}

export interface PhoneNormalizationResult {
  countryIso2: string;
  countryLabel: string;
  callingCode: string;
  nationalNumber: string;
  e164: string;
}

export interface PasswordRequirementState {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  symbol: boolean;
  differsFromUsername: boolean;
  confirmationMatches: boolean;
}

const USERNAME_SAFE_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/;
const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "help",
  "owner",
  "prisma",
  "root",
  "security",
  "support",
  "system",
  "superadmin",
]);

export const COUNTRY_PHONE_OPTIONS: readonly CountryPhoneOption[] = [
  { iso2: "BR", label: "Brasil", callingCode: "+55", minNationalLength: 10, maxNationalLength: 11 },
  { iso2: "AR", label: "Argentina", callingCode: "+54", minNationalLength: 10, maxNationalLength: 11 },
  { iso2: "CL", label: "Chile", callingCode: "+56", minNationalLength: 9, maxNationalLength: 9 },
  { iso2: "CO", label: "Colômbia", callingCode: "+57", minNationalLength: 10, maxNationalLength: 10 },
  { iso2: "DE", label: "Alemanha", callingCode: "+49", minNationalLength: 10, maxNationalLength: 13 },
  { iso2: "ES", label: "Espanha", callingCode: "+34", minNationalLength: 9, maxNationalLength: 9 },
  { iso2: "FR", label: "França", callingCode: "+33", minNationalLength: 9, maxNationalLength: 9 },
  { iso2: "GB", label: "Reino Unido", callingCode: "+44", minNationalLength: 10, maxNationalLength: 10 },
  { iso2: "IT", label: "Itália", callingCode: "+39", minNationalLength: 9, maxNationalLength: 10 },
  { iso2: "JP", label: "Japão", callingCode: "+81", minNationalLength: 10, maxNationalLength: 11 },
  { iso2: "MX", label: "México", callingCode: "+52", minNationalLength: 10, maxNationalLength: 10 },
  { iso2: "PT", label: "Portugal", callingCode: "+351", minNationalLength: 9, maxNationalLength: 9 },
  { iso2: "PY", label: "Paraguai", callingCode: "+595", minNationalLength: 9, maxNationalLength: 9 },
  { iso2: "UY", label: "Uruguai", callingCode: "+598", minNationalLength: 8, maxNationalLength: 9 },
  { iso2: "US", label: "Estados Unidos", callingCode: "+1", minNationalLength: 10, maxNationalLength: 10 },
];

export function isPlatformAccessProfile(value: string): value is PlatformAccessProfile {
  return PLATFORM_ACCESS_PROFILES.some((item) => item === value);
}

export function isPlatformUserStatus(value: string): value is PlatformUserStatus {
  return PLATFORM_USER_STATUSES.some((item) => item === value);
}

export function describePlatformAccessProfile(profile: PlatformAccessProfile): string {
  if (profile === "super_admin") return "Super Admin";
  if (profile === "owner") return "Owner";
  if (profile === "admin") return "Admin";
  if (profile === "recruiter") return "Recruiter";
  return "Member";
}

export function describePlatformUserStatus(status: PlatformUserStatus): string {
  if (status === "pending_first_access") return "Primeiro acesso pendente";
  if (status === "active") return "Ativo";
  if (status === "inactive") return "Inativo";
  return "Bloqueado";
}

export function comparePlatformAccessProfiles(
  left: PlatformAccessProfile,
  right: PlatformAccessProfile,
): number {
  return accessProfileRank(left) - accessProfileRank(right);
}

export function accessProfileRank(profile: PlatformAccessProfile): number {
  if (profile === "super_admin") return 5;
  if (profile === "owner") return 4;
  if (profile === "admin") return 3;
  if (profile === "recruiter") return 2;
  return 1;
}

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function validateUsername(input: string): string | null {
  const username = normalizeUsername(input);
  if (username.length < 3 || username.length > 32) {
    return "O username deve ter entre 3 e 32 caracteres.";
  }
  if (username.includes(" ")) {
    return "O username não pode conter espaços.";
  }
  if (!USERNAME_SAFE_PATTERN.test(username)) {
    return "Use apenas letras, números, ponto, hífen e underscore.";
  }
  if (RESERVED_USERNAMES.has(username)) {
    return "Esse username é reservado pelo sistema.";
  }
  return null;
}

export function buildPasswordRequirementState(
  password: string,
  confirmation: string,
  username: string,
): PasswordRequirementState {
  const normalizedUsername = normalizeUsername(username);
  return {
    minLength: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    differsFromUsername: normalizeUsername(password) !== normalizedUsername,
    confirmationMatches: password.length > 0 && password === confirmation,
  };
}

export function isPasswordPolicySatisfied(state: PasswordRequirementState): boolean {
  return (
    state.minLength
    && state.uppercase
    && state.lowercase
    && state.number
    && state.symbol
    && state.confirmationMatches
  );
}

export function getCountryPhoneOption(iso2: string): CountryPhoneOption | null {
  const normalized = iso2.trim().toUpperCase();
  return COUNTRY_PHONE_OPTIONS.find((item) => item.iso2 === normalized) ?? null;
}

export function normalizePhoneInput(
  countryIso2: string,
  nationalNumberInput: string,
): { value: PhoneNormalizationResult | null; error: string | null } {
  const country = getCountryPhoneOption(countryIso2);
  if (!country) return { value: null, error: "País não suportado pelo formulário atual." };

  const digits = nationalNumberInput.replace(/\D/g, "");
  if (!digits) return { value: null, error: "Informe o celular." };
  if (digits.length < country.minNationalLength || digits.length > country.maxNationalLength) {
    return {
      value: null,
      error: `O celular deve ter entre ${country.minNationalLength} e ${country.maxNationalLength} dígitos para ${country.label}.`,
    };
  }

  return {
    value: {
      countryIso2: country.iso2,
      countryLabel: country.label,
      callingCode: country.callingCode,
      nationalNumber: digits,
      e164: `${country.callingCode}${digits}`,
    },
    error: null,
  };
}
