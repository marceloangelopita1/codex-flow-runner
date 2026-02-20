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
