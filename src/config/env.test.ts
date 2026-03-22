import assert from "node:assert/strict";
import test from "node:test";
import { parseEnv } from "./env.js";

test("parseEnv falha quando PROJECTS_ROOT_PATH nao e informado", () => {
  assert.throws(
    () =>
      parseEnv({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_ALLOWED_CHAT_ID: "42",
      }),
    /PROJECTS_ROOT_PATH/u,
  );
});

test("parseEnv falha quando TELEGRAM_ALLOWED_CHAT_ID nao e informado", () => {
  assert.throws(
    () =>
      parseEnv({
        TELEGRAM_BOT_TOKEN: "token",
        PROJECTS_ROOT_PATH: "/home/mapita/projetos",
      }),
    /TELEGRAM_ALLOWED_CHAT_ID/u,
  );
});

test("parseEnv falha quando TELEGRAM_ALLOWED_CHAT_ID e vazio", () => {
  assert.throws(
    () =>
      parseEnv({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_ALLOWED_CHAT_ID: "",
        PROJECTS_ROOT_PATH: "/home/mapita/projetos",
      }),
    /TELEGRAM_ALLOWED_CHAT_ID/u,
  );
});

test("parseEnv aceita TELEGRAM_ALLOWED_CHAT_ID e aplica defaults", () => {
  const env = parseEnv({
    TELEGRAM_BOT_TOKEN: "token",
    TELEGRAM_ALLOWED_CHAT_ID: "42",
    PROJECTS_ROOT_PATH: "/home/mapita/projetos",
  });

  assert.equal(env.TELEGRAM_BOT_TOKEN, "token");
  assert.equal(env.TELEGRAM_ALLOWED_CHAT_ID, "42");
  assert.equal(env.PROJECTS_ROOT_PATH, "/home/mapita/projetos");
  assert.equal(env.POLL_INTERVAL_MS, 5000);
  assert.equal(env.RUN_ALL_MAX_TICKETS_PER_ROUND, 20);
  assert.equal(env.SHUTDOWN_DRAIN_TIMEOUT_MS, 30000);
  assert.equal(env.PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM, false);
  assert.equal(env.RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED, false);
});

test("parseEnv aceita RUN_ALL_MAX_TICKETS_PER_ROUND customizado", () => {
  const env = parseEnv({
    TELEGRAM_BOT_TOKEN: "token",
    TELEGRAM_ALLOWED_CHAT_ID: "42",
    PROJECTS_ROOT_PATH: "/home/mapita/projetos",
    RUN_ALL_MAX_TICKETS_PER_ROUND: "35",
  });

  assert.equal(env.RUN_ALL_MAX_TICKETS_PER_ROUND, 35);
});

test("parseEnv falha quando RUN_ALL_MAX_TICKETS_PER_ROUND nao e inteiro positivo", () => {
  assert.throws(
    () =>
      parseEnv({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_ALLOWED_CHAT_ID: "42",
        PROJECTS_ROOT_PATH: "/home/mapita/projetos",
        RUN_ALL_MAX_TICKETS_PER_ROUND: "0",
      }),
    /RUN_ALL_MAX_TICKETS_PER_ROUND/u,
  );

  assert.throws(
    () =>
      parseEnv({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_ALLOWED_CHAT_ID: "42",
        PROJECTS_ROOT_PATH: "/home/mapita/projetos",
        RUN_ALL_MAX_TICKETS_PER_ROUND: "1.5",
      }),
    /RUN_ALL_MAX_TICKETS_PER_ROUND/u,
  );
});

test("parseEnv aceita SHUTDOWN_DRAIN_TIMEOUT_MS customizado", () => {
  const env = parseEnv({
    TELEGRAM_BOT_TOKEN: "token",
    TELEGRAM_ALLOWED_CHAT_ID: "42",
    PROJECTS_ROOT_PATH: "/home/mapita/projetos",
    SHUTDOWN_DRAIN_TIMEOUT_MS: "45000",
  });

  assert.equal(env.SHUTDOWN_DRAIN_TIMEOUT_MS, 45000);
});

test("parseEnv falha quando SHUTDOWN_DRAIN_TIMEOUT_MS nao e inteiro positivo", () => {
  assert.throws(
    () =>
      parseEnv({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_ALLOWED_CHAT_ID: "42",
        PROJECTS_ROOT_PATH: "/home/mapita/projetos",
        SHUTDOWN_DRAIN_TIMEOUT_MS: "0",
      }),
    /SHUTDOWN_DRAIN_TIMEOUT_MS/u,
  );

  assert.throws(
    () =>
      parseEnv({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_ALLOWED_CHAT_ID: "42",
        PROJECTS_ROOT_PATH: "/home/mapita/projetos",
        SHUTDOWN_DRAIN_TIMEOUT_MS: "1.2",
      }),
    /SHUTDOWN_DRAIN_TIMEOUT_MS/u,
  );
});

test("parseEnv aceita PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM como boolean string", () => {
  const enabled = parseEnv({
    TELEGRAM_BOT_TOKEN: "token",
    TELEGRAM_ALLOWED_CHAT_ID: "42",
    PROJECTS_ROOT_PATH: "/home/mapita/projetos",
    PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM: "true",
  });
  assert.equal(enabled.PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM, true);

  const disabled = parseEnv({
    TELEGRAM_BOT_TOKEN: "token",
    TELEGRAM_ALLOWED_CHAT_ID: "42",
    PROJECTS_ROOT_PATH: "/home/mapita/projetos",
    PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM: "false",
  });
  assert.equal(disabled.PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM, false);
});

test("parseEnv falha quando PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM recebe valor invalido", () => {
  assert.throws(
    () =>
      parseEnv({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_ALLOWED_CHAT_ID: "42",
        PROJECTS_ROOT_PATH: "/home/mapita/projetos",
        PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM: "talvez",
      }),
    /PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM/u,
  );
});

test("parseEnv aceita RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED como boolean string", () => {
  const enabled = parseEnv({
    TELEGRAM_BOT_TOKEN: "token",
    TELEGRAM_ALLOWED_CHAT_ID: "42",
    PROJECTS_ROOT_PATH: "/home/mapita/projetos",
    RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED: "true",
  });
  assert.equal(enabled.RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED, true);

  const disabled = parseEnv({
    TELEGRAM_BOT_TOKEN: "token",
    TELEGRAM_ALLOWED_CHAT_ID: "42",
    PROJECTS_ROOT_PATH: "/home/mapita/projetos",
    RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED: "false",
  });
  assert.equal(disabled.RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED, false);
});

test("parseEnv falha quando RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED recebe valor invalido", () => {
  assert.throws(
    () =>
      parseEnv({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_ALLOWED_CHAT_ID: "42",
        PROJECTS_ROOT_PATH: "/home/mapita/projetos",
        RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED: "talvez",
      }),
    /RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED/u,
  );
});
