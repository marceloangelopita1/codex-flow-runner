import assert from "node:assert/strict";
import test from "node:test";
import { parseEnv } from "./env.js";

test("parseEnv falha quando PROJECTS_ROOT_PATH nao e informado", () => {
  assert.throws(
    () =>
      parseEnv({
        TELEGRAM_BOT_TOKEN: "token",
      }),
    /PROJECTS_ROOT_PATH/u,
  );
});

test("parseEnv aceita PROJECTS_ROOT_PATH e aplica defaults", () => {
  const env = parseEnv({
    TELEGRAM_BOT_TOKEN: "token",
    PROJECTS_ROOT_PATH: "/home/mapita/projetos",
  });

  assert.equal(env.TELEGRAM_BOT_TOKEN, "token");
  assert.equal(env.PROJECTS_ROOT_PATH, "/home/mapita/projetos");
  assert.equal(env.POLL_INTERVAL_MS, 5000);
});
