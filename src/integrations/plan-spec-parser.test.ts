import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlanSpecParserState,
  parsePlanSpecOutput,
  parsePlanSpecOutputChunk,
  sanitizePlanSpecRawOutput,
} from "./plan-spec-parser.js";

test("parseia bloco estruturado de pergunta com opcoes clicaveis", () => {
  const output = [
    "[[PLAN_SPEC_QUESTION]]",
    "Pergunta: Qual frente devemos priorizar nesta sprint?",
    "Opcoes:",
    "- [api-publica] API publica externa",
    "- [infra] Infraestrutura interna",
    "[[/PLAN_SPEC_QUESTION]]",
  ].join("\n");

  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "question");
  if (!events[0] || events[0].type !== "question") {
    assert.fail("Evento de pergunta nao encontrado");
  }

  assert.equal(events[0].question.prompt, "Qual frente devemos priorizar nesta sprint?");
  assert.deepEqual(events[0].question.options, [
    {
      value: "api-publica",
      label: "API publica externa",
    },
    {
      value: "infra",
      label: "Infraestrutura interna",
    },
  ]);
});

test("parseia bloco final com titulo, resumo e acoes", () => {
  const output = [
    "[[PLAN_SPEC_FINAL]]",
    "Titulo: Bridge interativa do Codex no planejamento",
    "Resumo: Implementar sessao /plan stateful com parser e callbacks Telegram.",
    "Acoes:",
    "- Criar spec",
    "- Refinar",
    "- Cancelar",
    "[[/PLAN_SPEC_FINAL]]",
  ].join("\n");

  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "final");
  if (!events[0] || events[0].type !== "final") {
    assert.fail("Evento final nao encontrado");
  }

  assert.equal(events[0].final.title, "Bridge interativa do Codex no planejamento");
  assert.match(events[0].final.summary, /sessao \/plan stateful/u);
  assert.deepEqual(
    events[0].final.actions.map((action) => action.id),
    ["create-spec", "refine", "cancel"],
  );
});

test("mantem bloco parcial em buffer e parseia quando fechamento chega", () => {
  const initialState = createPlanSpecParserState();
  const partialChunk = [
    "ruido inicial",
    "[[PLAN_SPEC_QUESTION]]",
    "Pergunta: Qual opcao atende melhor?",
  ].join("\n");

  const firstPass = parsePlanSpecOutputChunk(initialState, partialChunk);
  assert.equal(firstPass.events.length, 1);
  assert.equal(firstPass.events[0]?.type, "raw-sanitized");
  assert.match(firstPass.events[0]?.text ?? "", /ruido inicial/u);
  assert.match(firstPass.state.pendingChunk, /\[\[PLAN_SPEC_QUESTION\]\]/u);

  const secondChunk = [
    "Opcoes:",
    "- [a] Opcao A",
    "- [b] Opcao B",
    "[[/PLAN_SPEC_QUESTION]]",
  ].join("\n");
  const secondPass = parsePlanSpecOutputChunk(firstPass.state, secondChunk);

  assert.equal(secondPass.events.length, 1);
  assert.equal(secondPass.events[0]?.type, "question");
  if (!secondPass.events[0] || secondPass.events[0].type !== "question") {
    assert.fail("Evento de pergunta nao encontrado apos fechamento");
  }
  assert.equal(secondPass.events[0].question.options.length, 2);
  assert.equal(secondPass.state.pendingChunk, "");
});

test("quando bloco estruturado e invalido, retorna fallback raw saneado (CA-20)", () => {
  const output = [
    "[[PLAN_SPEC_QUESTION]]",
    "Pergunta: Sem opcoes parseaveis",
    "Texto livre sem bullets",
    "[[/PLAN_SPEC_QUESTION]]",
  ].join("\n");

  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "raw-sanitized");
  assert.match(events[0]?.text ?? "", /PLAN_SPEC_QUESTION/u);
});

test("saneia saida raw removendo ANSI, controles e excesso de espacos", () => {
  const value = "\u001b[31mFalha\u001b[0m\u0007\r\n\r\nDetalhe tecnico\r\n";
  const sanitized = sanitizePlanSpecRawOutput(value);

  assert.equal(sanitized, "Falha\n\nDetalhe tecnico");
});

test("saneia saida raw longa aplicando truncamento deterministico", () => {
  const longValue = `prefixo-${"x".repeat(5000)}`;
  const sanitized = sanitizePlanSpecRawOutput(longValue);

  assert.equal(sanitized.endsWith("..."), true);
  assert.equal(sanitized.length <= 3503, true);
});
