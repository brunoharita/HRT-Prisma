import assert from "node:assert/strict";
import test from "node:test";
import { randomInt } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  buildPasswordRequirementState,
  PASSWORD_MIN_LENGTH,
  isPasswordPolicySatisfied,
  normalizePhoneInput,
  normalizeUsername,
  validateUsername,
} from "../web/src/shared/platformUsers.js";

test("password minimum is eight across web, Edge and Auth configuration", async () => {
  const edge = await readFile("supabase/functions/platform-users/index.ts", "utf8");
  const config = await readFile("supabase/config.toml", "utf8");
  assert.equal(PASSWORD_MIN_LENGTH, 8);
  assert.match(edge, /const PASSWORD_MIN_LENGTH = 8;/);
  assert.match(config, /^minimum_password_length = 8$/m);
  assert.match(config, /^password_requirements = "lower_upper_letters_digits_symbols"$/m);
});

test("password boundaries accept eight through eleven and retain all other requirements", () => {
  const lower = () => String.fromCharCode(97 + randomInt(26));
  const upper = () => String.fromCharCode(65 + randomInt(26));
  const digit = () => String(randomInt(10));
  const make = (length: number) => lower() + upper() + digit() + String.fromCharCode(33) + Array.from({ length: length - 4 }, lower).join("");
  for (const length of [0, 7, 8, 9, 10, 11, 12]) {
    const value = length ? make(length) : "";
    const state = buildPasswordRequirementState(value, value, "synthetic.user");
    assert.equal(state.minLength, length >= 8);
    assert.equal(isPasswordPolicySatisfied(state), length >= 8);
  }
  const value = make(8);
  for (const invalid of [value.toLowerCase(), value.toUpperCase(), value.replace(/\d/g, lower), value.replace(/[^A-Za-z0-9]/g, lower)]) {
    assert.equal(isPasswordPolicySatisfied(buildPasswordRequirementState(invalid, invalid, "synthetic.user")), false);
  }
  assert.equal(isPasswordPolicySatisfied(buildPasswordRequirementState(value, value.slice(0, -1), "synthetic.user")), false);
});

test("normalizes username to lower case and trims whitespace", () => {
  assert.equal(normalizeUsername("  Bruno.Harita  "), "bruno.harita");
});

test("rejects reserved and malformed usernames", () => {
  assert.equal(validateUsername("admin"), "Esse username é reservado pelo sistema.");
  assert.equal(validateUsername("ab"), "O username deve ter entre 3 e 32 caracteres.");
  assert.equal(validateUsername("bruno harita"), "O username não pode conter espaços.");
});

test("accepts safe usernames", () => {
  assert.equal(validateUsername("bruno.harita"), null);
  assert.equal(validateUsername("joao_silva-01"), null);
});

test("enforces the password policy expected by M2-A", () => {
  const valid = buildPasswordRequirementState("SenhaSegura@123", "SenhaSegura@123", "bruno.harita");
  assert.equal(isPasswordPolicySatisfied(valid), true);

  const invalid = buildPasswordRequirementState("senha", "senha", "senha");
  assert.equal(isPasswordPolicySatisfied(invalid), false);
  assert.equal(invalid.uppercase, false);
  assert.equal(invalid.number, false);
  assert.equal(invalid.symbol, false);
  assert.equal(invalid.differsFromUsername, false);
});

test("normalizes phone numbers into E.164-compatible pieces", () => {
  const brazil = normalizePhoneInput("BR", "(14) 99999-9999");
  assert.equal(brazil.error, null);
  assert.equal(brazil.value?.e164, "+5514999999999");

  const invalid = normalizePhoneInput("US", "123");
  assert.equal(typeof invalid.error, "string");
});
