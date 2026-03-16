import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FileSystemSpecPlanningTraceStore } from "./spec-planning-trace-store.js";

const createSpecOutline = () => ({
  objective: "Transformar o planejamento guiado em uma spec pronta para execucao.",
  actors: ["Operador do Telegram", "Codex Runner"],
  journey: ["Operador descreve a necessidade.", "Codex devolve um bloco final estruturado."],
  requirements: ["RF-01 - A spec deve preservar RFs e CAs aprovados."],
  acceptanceCriteria: ["CA-01 - O bloco final estruturado fica persistido na trilha."],
  nonScope: ["Nao implementar a feature final nesta etapa."],
  technicalConstraints: ["Manter o protocolo parseavel."],
  mandatoryValidations: ["Conferir se a spec criada segue o template oficial."],
  pendingManualValidations: ["Revisar a clareza da jornada com um humano."],
  knownRisks: ["Contexto comprimido reduz a qualidade dos tickets posteriores."],
});

const createTempProjectRoot = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "spec-planning-trace-store-"));

const cleanupTempProjectRoot = async (rootPath: string): Promise<void> => {
  await fs.rm(rootPath, { recursive: true, force: true });
};

const resolveTraceFile = (projectPath: string, relativePath: string): string =>
  path.join(projectPath, ...relativePath.split("/"));

test("startSession cria trilha request/decision e writeStageResponse persiste output por etapa", async () => {
  const projectPath = await createTempProjectRoot();

  try {
    const store = new FileSystemSpecPlanningTraceStore(projectPath);
    const session = await store.startSession({
      sessionId: 7,
      chatId: "42",
      specPath: "docs/specs/2026-02-19-bridge-interativa-do-codex.md",
      specFileName: "2026-02-19-bridge-interativa-do-codex.md",
      specTitle: "Bridge interativa do Codex",
      specSummary: "Sessao /plan com parser e callbacks no Telegram.",
      specOutline: createSpecOutline(),
      commitMessage: "feat(spec): add 2026-02-19-bridge-interativa-do-codex.md",
      createdAt: new Date("2026-02-19T22:04:00.000Z"),
    });

    assert.match(session.requestPath, /^spec_planning\/requests\/.+-request\.md$/u);
    assert.match(session.materializeResponsePath, /^spec_planning\/responses\/.+-materialize\.md$/u);
    assert.match(
      session.versionAndPushResponsePath,
      /^spec_planning\/responses\/.+-version-and-push\.md$/u,
    );
    assert.match(session.decisionPath, /^spec_planning\/decisions\/.+-decision\.json$/u);

    const requestContent = await fs.readFile(resolveTraceFile(projectPath, session.requestPath), "utf8");
    assert.match(requestContent, /Spec planning request/u);
    assert.match(requestContent, /Bridge interativa do Codex/u);
    assert.match(requestContent, /feat\(spec\): add/u);
    assert.match(requestContent, /Objective: Transformar o planejamento guiado/u);
    assert.match(requestContent, /### Requirements/u);
    assert.match(requestContent, /RF-01 - A spec deve preservar RFs e CAs aprovados\./u);

    const decisionRaw = await fs.readFile(resolveTraceFile(projectPath, session.decisionPath), "utf8");
    const decision = JSON.parse(decisionRaw) as {
      action: string;
      specFileName: string;
      sessionId: number;
      specOutline: {
        objective: string;
      };
    };
    assert.equal(decision.action, "create-spec");
    assert.equal(decision.sessionId, 7);
    assert.equal(decision.specFileName, "2026-02-19-bridge-interativa-do-codex.md");
    assert.equal(
      decision.specOutline.objective,
      "Transformar o planejamento guiado em uma spec pronta para execucao.",
    );

    await store.writeStageResponse(session.materializeResponsePath, {
      stage: "plan-spec-materialize",
      output: "spec criada com sucesso",
      recordedAt: new Date("2026-02-19T22:05:00.000Z"),
    });
    await store.writeStageResponse(session.versionAndPushResponsePath, {
      stage: "plan-spec-version-and-push",
      output: "commit e push concluidos",
      recordedAt: new Date("2026-02-19T22:06:00.000Z"),
    });

    const materializeResponse = await fs.readFile(
      resolveTraceFile(projectPath, session.materializeResponsePath),
      "utf8",
    );
    const versionResponse = await fs.readFile(
      resolveTraceFile(projectPath, session.versionAndPushResponsePath),
      "utf8",
    );

    assert.match(materializeResponse, /Stage: plan-spec-materialize/u);
    assert.match(materializeResponse, /spec criada com sucesso/u);
    assert.match(versionResponse, /Stage: plan-spec-version-and-push/u);
    assert.match(versionResponse, /commit e push concluidos/u);
  } finally {
    await cleanupTempProjectRoot(projectPath);
  }
});

test("startSession evita sobrescrita silenciosa em colisao de traceId", async () => {
  const projectPath = await createTempProjectRoot();

  try {
    const store = new FileSystemSpecPlanningTraceStore(projectPath);
    const request = {
      sessionId: 3,
      chatId: "42",
      specPath: "docs/specs/2026-02-19-spec-planejada.md",
      specFileName: "2026-02-19-spec-planejada.md",
      specTitle: "Spec planejada",
      specSummary: "Resumo final aprovado.",
      specOutline: createSpecOutline(),
      commitMessage: "feat(spec): add 2026-02-19-spec-planejada.md",
      createdAt: new Date("2026-02-19T22:10:00.000Z"),
    };

    const first = await store.startSession(request);
    const second = await store.startSession(request);

    assert.notEqual(first.traceId, second.traceId);
    assert.match(second.traceId, /-2$/u);
  } finally {
    await cleanupTempProjectRoot(projectPath);
  }
});
