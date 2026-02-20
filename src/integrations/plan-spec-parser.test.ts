import assert from "node:assert/strict";
import test from "node:test";
import {
  type PlanSpecParserEvent,
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

test("parseia pergunta em formato compacto sem quebras de linha", () => {
  const output =
    "[[PLAN_SPEC_QUESTION]]Pergunta:Qualescopodevemospriorizar?Opcoes:-[api]APIpublica-[bot]BotTelegram[[/PLAN_SPEC_QUESTION]]";

  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "question");
  if (!events[0] || events[0].type !== "question") {
    assert.fail("Evento de pergunta nao encontrado");
  }

  assert.equal(events[0].question.prompt, "Qualescopodevemospriorizar?");
  assert.deepEqual(events[0].question.options, [
    {
      value: "api",
      label: "APIpublica",
    },
    {
      value: "bot",
      label: "BotTelegram",
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

test("parseia bloco final em formato compacto sem quebras de linha", () => {
  const output =
    "[[PLAN_SPEC_FINAL]]Titulo:BridgeinterativaResumo:FluxosequencialdeplanejamentoAcoes:-Criarspec-Refinar-Cancelar[[/PLAN_SPEC_FINAL]]";

  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "final");
  if (!events[0] || events[0].type !== "final") {
    assert.fail("Evento final nao encontrado");
  }

  assert.equal(events[0].final.title, "Bridgeinterativa");
  assert.equal(events[0].final.summary, "Fluxosequencialdeplanejamento");
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

test("preserva marcador de abertura parcial entre chunks e parseia quando completo", () => {
  const initialState = createPlanSpecParserState();
  const firstPass = parsePlanSpecOutputChunk(initialState, "ruido inicial\n[[PLAN_SPEC_");

  assert.equal(firstPass.events.length, 1);
  assert.equal(firstPass.events[0]?.type, "raw-sanitized");
  assert.match(firstPass.events[0]?.text ?? "", /ruido inicial/u);
  assert.equal(firstPass.state.pendingChunk, "[[PLAN_SPEC_");

  const secondPass = parsePlanSpecOutputChunk(
    firstPass.state,
    [
      "QUESTION]]",
      "Pergunta: Qual opcao atende melhor?",
      "Opcoes:",
      "- [a] Opcao A",
      "- [b] Opcao B",
      "[[/PLAN_SPEC_QUESTION]]",
    ].join("\n"),
  );

  assert.equal(secondPass.events.length, 1);
  assert.equal(secondPass.events[0]?.type, "question");
  if (!secondPass.events[0] || secondPass.events[0].type !== "question") {
    assert.fail("Evento de pergunta nao encontrado apos completar marcador quebrado");
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

test("ignora ruido baixo-sinal de TTY em eventos raw", () => {
  let state = createPlanSpecParserState();
  const chunks = ["\u001b[?2004h", "\u001b[>7u", ";?\\", "T", "i", "p", ":", "N", "e", "w", "2", "x"];
  const emittedEvents: PlanSpecParserEvent[] = [];

  for (const chunk of chunks) {
    const parsed = parsePlanSpecOutputChunk(state, chunk);
    state = parsed.state;
    emittedEvents.push(...parsed.events);
  }

  assert.equal(emittedEvents.length, 0);
});

test("ignora ruido conhecido de bootstrap da TUI do Codex", () => {
  const output = [
    ">_ OpenAI Codex (v0.104.0)",
    "model: gpt-5.3-codex xhigh /model to change",
    "directory: ~/projetos/codex-flow-runner",
    "Tip: Visit the Codex community forum: https://community.openai.com/c/codex/37",
    "for shortcuts",
    "100% context left",
  ].join("\n");

  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 0);
});

test("ignora eco de input do operador acompanhado de contador de contexto", () => {
  const output =
    "Gostariaqueainteratividadeequandoseescolheumaspecfossecomumclick.Podecriaressajornadacomospec?100% context left";

  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 0);
});

test("ignora hints de navegacao da TUI do Codex durante /plan_spec", () => {
  const output = [
    "›/plan100% context left",
    "10s • esc to interupt)",
    "(shift+tab to cycle)89",
  ].join("\n");

  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 0);
});

test("ignora fragmentos curtos de token sem delimitadores", () => {
  const output = ["pph", "xpng", "apach"].join("\n");
  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 0);
});

test("ignora fragmentos curtos com espacos vindos de renderizacao parcial da TUI", () => {
  const output = ["es r", "ra s", "◦n te", "n ra", "ng c s", "ro s", "◦ sse3", "c ct", "if s"].join(
    "\n",
  );
  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 0);
});

test("mantem erro curto de uma palavra como raw significativo", () => {
  const events = parsePlanSpecOutput("Erro");
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "raw-sanitized");
  assert.equal(events[0]?.text, "Erro");
});

test("mantem resposta curta de duas palavras sem token unitario", () => {
  const events = parsePlanSpecOutput("No Go");
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "raw-sanitized");
  assert.equal(events[0]?.text, "No Go");
});

test("ignora eco do primer de protocolo /plan_spec mesmo quando compactado pela TUI", () => {
  const output = [
    "[[PLAN_SPEC_QUESTION]]Pergunta:<perguntaobjetiva>Opcoes:-[slug-opcao-1]Rotuloopcao1-[slug-opcao-2]Rotuloopcao2[[/PLAN_SPEC_QUESTION]]",
    "[[PLAN_SPEC_FINAL]]Titulo:<titulofinaldaspec>Resumo:<resumofinalobjetivo>Acoes:-Criarspec-Refinar-Cancelar[[/PLAN_SPEC_FINAL]]",
    "›Contexto:voceestaemumaponteTelegramparaplanejamentodespec.Respondasempreemblocosparseaveisparaautomacao.",
    "QuandoConcluiroplanejamento,respondaexatamentenesteformato:",
  ].join("\n");

  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 0);
});

test("ignora eco do primer final com sequencias de cursor sem ESC", () => {
  const output = [
    "[[PLAN_SPEC_FINAL]]",
    "Titulo: [24;11H<titulo [24;19Hfinal [24;25Hda [24;28Hspec>",
    "Resumo: [25;11H<resumo [25;19Hfinal [25;25Hobjetivo>",
    "Acoes:",
    "- Criar spec",
    "- Refinar",
    "- Cancelar",
    "[[/PLAN_SPEC_FINAL]]",
  ].join("\n");

  const events = parsePlanSpecOutput(output);
  assert.equal(events.length, 0);
});

test("saneia saida raw removendo ANSI, controles e excesso de espacos", () => {
  const value = "\u001b[31mFalha\u001b[0m\u0007\r\n\r\nDetalhe tecnico\r\n";
  const sanitized = sanitizePlanSpecRawOutput(value);

  assert.equal(sanitized, "Falha\n\nDetalhe tecnico");
});

test("saneia saida raw removendo sequencias de cursor sem ESC", () => {
  const value = "Titulo: [24;11H<titulo [24;19Hfinal>\nResumo: [25;11H<resumo [25;19Hfinal>";
  const sanitized = sanitizePlanSpecRawOutput(value);

  assert.equal(sanitized, "Titulo: <titulo final>\nResumo: <resumo final>");
});

test("saneia saida raw sem remover opcoes no formato [slug]", () => {
  const value = [
    "[[PLAN_SPEC_QUESTION]]",
    "Pergunta: Qual opcao?",
    "Opcoes:",
    "- [sim] Continuar",
    "- [nao] Cancelar",
    "[[/PLAN_SPEC_QUESTION]]",
  ].join("\n");

  const sanitized = sanitizePlanSpecRawOutput(value);
  assert.match(sanitized, /-\s*\[sim\]\s*Continuar/u);
  assert.match(sanitized, /-\s*\[nao\]\s*Cancelar/u);
});

test("saneia saida raw longa aplicando truncamento deterministico", () => {
  const longValue = `prefixo-${"x".repeat(5000)}`;
  const sanitized = sanitizePlanSpecRawOutput(longValue);

  assert.equal(sanitized.endsWith("..."), true);
  assert.equal(sanitized.length <= 3503, true);
});
