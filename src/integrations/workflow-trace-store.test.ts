import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FileSystemWorkflowTraceStore } from "./workflow-trace-store.js";

const createTempProjectRoot = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "workflow-trace-store-"));

const cleanupTempProjectRoot = async (rootPath: string): Promise<void> => {
  await fs.rm(rootPath, { recursive: true, force: true });
};

const resolveTraceFile = (projectPath: string, relativePath: string): string =>
  path.join(projectPath, ...relativePath.split("/"));

test("recordStageTrace persiste request response e decision com taxonomia e diagnosticos", async () => {
  const projectPath = await createTempProjectRoot();

  try {
    const store = new FileSystemWorkflowTraceStore(projectPath);
    const record = await store.recordStageTrace({
      kind: "ticket",
      stage: "close-and-version",
      sourceCommand: "run-all",
      targetName: "2026-02-23-hardening.md",
      targetPath: "tickets/open/2026-02-23-hardening.md",
      promptTemplatePath: "/repo/prompts/04-encerrar-ticket-commit-push.md",
      promptText: "Revise o diff e decida GO/NO_GO.",
      outputText: "GO com commit e push concluidos.",
      diagnostics: {
        stdoutPreview: "GO com commit e push concluidos.",
        stderrPreview: "OpenAI Codex v0.111.0",
      },
      decision: {
        status: "failure",
        summary: "Runner detectou gap de validacao apos o fechamento do ticket.",
        errorMessage: "push obrigatorio nao concluido",
        metadata: {
          rootCause: "validation",
          followUpNeeded: true,
        },
      },
      recordedAt: new Date("2026-03-16T14:30:00.000Z"),
    });

    assert.match(
      record.requestPath,
      /^\.codex-flow-runner\/flow-traces\/requests\/.+-request\.md$/u,
    );
    assert.match(
      record.responsePath,
      /^\.codex-flow-runner\/flow-traces\/responses\/.+-response\.md$/u,
    );
    assert.match(
      record.decisionPath,
      /^\.codex-flow-runner\/flow-traces\/decisions\/.+-decision\.json$/u,
    );

    const requestContent = await fs.readFile(resolveTraceFile(projectPath, record.requestPath), "utf8");
    assert.match(requestContent, /Workflow stage request/u);
    assert.match(requestContent, /Source command: run-all/u);
    assert.match(requestContent, /Prompt template path: \/repo\/prompts\/04-encerrar-ticket-commit-push\.md/u);
    assert.match(requestContent, /Revise o diff e decida GO\/NO_GO\./u);

    const responseContent = await fs.readFile(resolveTraceFile(projectPath, record.responsePath), "utf8");
    assert.match(responseContent, /Workflow stage response/u);
    assert.match(responseContent, /Stdout preview: GO com commit e push concluidos\./u);
    assert.match(responseContent, /Stderr preview: OpenAI Codex v0\.111\.0/u);
    assert.match(responseContent, /GO com commit e push concluidos\./u);

    const decisionRaw = await fs.readFile(resolveTraceFile(projectPath, record.decisionPath), "utf8");
    const decision = JSON.parse(decisionRaw) as {
      kind: string;
      stage: string;
      sourceCommand: string;
      decision: {
        status: string;
        summary: string;
        errorMessage?: string;
        metadata?: Record<string, unknown>;
      };
    };

    assert.equal(decision.kind, "ticket");
    assert.equal(decision.stage, "close-and-version");
    assert.equal(decision.sourceCommand, "run-all");
    assert.equal(decision.decision.status, "failure");
    assert.equal(decision.decision.errorMessage, "push obrigatorio nao concluido");
    assert.equal(decision.decision.metadata?.rootCause, "validation");
  } finally {
    await cleanupTempProjectRoot(projectPath);
  }
});

test("recordStageTrace evita sobrescrita silenciosa quando o traceId colide", async () => {
  const projectPath = await createTempProjectRoot();

  try {
    const store = new FileSystemWorkflowTraceStore(projectPath);
    const request = {
      kind: "spec" as const,
      stage: "spec-audit" as const,
      sourceCommand: "run-specs" as const,
      targetName: "2026-02-23-hardening-spec.md",
      targetPath: "docs/specs/2026-02-23-hardening-spec.md",
      promptTemplatePath: "/repo/prompts/08-auditar-spec-apos-run-all.md",
      promptText: "Audite a spec apos o run-all.",
      outputText: "Nenhum gap residual encontrado.",
      decision: {
        status: "success" as const,
        summary: "Spec audit concluida sem follow-ups.",
      },
      recordedAt: new Date("2026-03-16T14:31:00.000Z"),
    };

    const first = await store.recordStageTrace(request);
    const second = await store.recordStageTrace(request);

    assert.notEqual(first.traceId, second.traceId);
    assert.match(second.traceId, /-2$/u);
  } finally {
    await cleanupTempProjectRoot(projectPath);
  }
});

test("recordStageTrace aceita spec-ticket-validation com metadata observavel do gate", async () => {
  const projectPath = await createTempProjectRoot();

  try {
    const store = new FileSystemWorkflowTraceStore(projectPath);
    const record = await store.recordStageTrace({
      kind: "spec",
      stage: "spec-ticket-validation",
      sourceCommand: "run-specs",
      targetName: "2026-03-19-spec-ticket-validation.md",
      targetPath: "docs/specs/2026-03-19-spec-ticket-validation.md",
      promptTemplatePath: "/repo/prompts/09-validar-tickets-derivados-da-spec.md",
      promptText: "Valide os tickets derivados da spec.",
      outputText: "NO_GO com gap de cobertura.",
      decision: {
        status: "success",
        summary: "Etapa spec-ticket-validation concluida com veredito NO_GO.",
        metadata: {
          verdict: "NO_GO",
          confidence: "medium",
          cyclesExecuted: 0,
          gaps: [
            {
              gapType: "coverage-gap",
              summary: "RF-01 sem ticket dedicado.",
            },
          ],
        },
      },
      recordedAt: new Date("2026-03-19T16:45:00.000Z"),
    });

    const decisionRaw = await fs.readFile(resolveTraceFile(projectPath, record.decisionPath), "utf8");
    const decision = JSON.parse(decisionRaw) as {
      stage: string;
      decision: {
        metadata?: {
          verdict?: string;
          gaps?: Array<{ gapType?: string }>;
        };
      };
    };

    assert.equal(decision.stage, "spec-ticket-validation");
    assert.equal(decision.decision.metadata?.verdict, "NO_GO");
    assert.equal(decision.decision.metadata?.gaps?.[0]?.gapType, "coverage-gap");
  } finally {
    await cleanupTempProjectRoot(projectPath);
  }
});
