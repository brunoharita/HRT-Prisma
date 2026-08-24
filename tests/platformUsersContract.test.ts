import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPasswordRequirementState,
  isPasswordPolicySatisfied,
  normalizePhoneInput,
  normalizeUsername,
  validateUsername,
} from "../web/src/shared/platformUsers.js";

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
