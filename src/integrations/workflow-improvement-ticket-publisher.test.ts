import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { GitSyncEvidence, GitVersioning } from "./git-client.js";
import {
  FileSystemWorkflowImprovementTicketPublisher,
  createWorkflowImprovementNotNeededResult,
} from "./workflow-improvement-ticket-publisher.js";
import { WorkflowImprovementTicketCandidate } from "../types/workflow-improvement-ticket.js";

class StubGitVersioning implements GitVersioning {
  public readonly publishedCommits: Array<{
    paths: string[];
    subject: string;
    bodyParagraphs: string[];
  }> = [];

  constructor(
    private readonly evidence: GitSyncEvidence = {
      commitHash: "abc123",
      upstream: "origin/main",
      commitPushId: "abc123@origin/main",
    },
  ) {}

  async commitTicketClosure(_ticketName: string, _execPlanPath: string): Promise<void> {
    throw new Error("Nao esperado neste teste.");
  }

  async commitAndPushPaths(
    paths: string[],
    subject: string,
    bodyParagraphs: string[] = [],
  ): Promise<GitSyncEvidence | null> {
    this.publishedCommits.push({
      paths: [...paths],
      subject,
      bodyParagraphs: [...bodyParagraphs],
    });
    return this.evidence;
  }

  async assertSyncedWithRemote(): Promise<GitSyncEvidence> {
    return this.evidence;
  }
}

const createCandidate = (
  value: Partial<WorkflowImprovementTicketCandidate> = {},
): WorkflowImprovementTicketCandidate => ({
  analysisStage: "spec-workflow-retrospective",
  activeProjectName: "codex-flow-runner",
  activeProjectPath: "/tmp/codex-flow-runner",
  sourceSpecPath: "docs/specs/2026-03-19-spec-ticket-validation.md",
  sourceSpecFileName: "2026-03-19-spec-ticket-validation.md",
  sourceSpecTitle: "Spec ticket validation",
  sourceRequirements: [
    "RF-18",
    "RNF-02",
    "Restricao tecnica: revisar README.md quando o contrato editorial mudar.",
    "CA-13",
  ],
  inheritedAssumptionsDefaults: ["Nao bloquear a rodada principal em GO."],
  inputMode: "follow-up-tickets",
  analysisSummary: "Gap sistemico identificado com alta confianca.",
  causalHypothesis: "A retrospectiva pos-auditoria ainda nao fecha o backlog sistemico no stage correto.",
  benefitSummary: "Mover a publication para o pos-auditoria reduz recorrencia futura.",
  ticketDraft: {
    title: "Publication automatica sem contrato editorial suficiente",
    problemStatement:
      "O workflow ainda pode publicar backlog sistemico sem um ticketDraft completo.",
    expectedBehavior:
      "Publication elegivel deve transportar um ticketDraft parseavel e suficiente.",
    proposedSolution:
      "Exigir e propagar ticketDraft estruturado antes da publication do ticket.",
    reproductionSteps: [
      "Executar retrospectiva sistemica com publicationEligibility=true.",
    ],
    impactFunctional: "O ticket transversal perde executabilidade por outra IA.",
    impactOperational: "A triagem futura depende de releitura do trace bruto.",
    regressionRisk: "Baixo com degradacao nao bloqueante.",
    relevantAssumptionsDefaults: ["Nao bloquear a rodada principal em GO."],
    closureCriteria: [
      "Publication elegivel sem ticketDraft valido vira operational-limitation observavel.",
    ],
    affectedWorkflowSurfaces: ["prompts", "parser", "runner"],
  },
  followUpTicketPaths: ["tickets/open/example.md"],
  workflowArtifactsConsulted: ["AGENTS.md", "prompts/11-retrospectiva-workflow-apos-spec-audit.md"],
  trace: {
    traceId: "trace-123",
    requestPath: ".codex-flow-runner/flow-traces/requests/trace-123-request.md",
    responsePath: ".codex-flow-runner/flow-traces/responses/trace-123-response.md",
    decisionPath: ".codex-flow-runner/flow-traces/decisions/trace-123-decision.json",
  },
  findings: [
    {
      fingerprint: "coverage-gap|tickets/open/example.md|rf-18",
      summary: "Instrucao sistemica insuficiente para follow-up automatico.",
      affectedArtifactPaths: ["tickets/open/example.md"],
      requirementRefs: ["RF-18", "CA-13"],
      evidence: ["Resumo do gate apontou causa-raiz systemic-instruction."],
    },
  ],
  gapFingerprints: ["coverage-gap|tickets/open/example.md|rf-18"],
  ...value,
});

const createTempWorkspace = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "workflow-improvement-publisher-"));

const cleanupTempWorkspace = async (workspacePath: string): Promise<void> => {
  await fs.rm(workspacePath, { recursive: true, force: true });
};

const ensureRepoStructure = async (repoPath: string): Promise<void> => {
  await fs.mkdir(path.join(repoPath, "tickets", "open"), { recursive: true });
  await fs.writeFile(path.join(repoPath, ".git"), "gitdir: ./.git\n", "utf8");
};

test("publica ticket transversal no repositorio atual com commit/push observavel", async () => {
  const workspacePath = await createTempWorkspace();
  try {
    const repoPath = path.join(workspacePath, "codex-flow-runner");
    await ensureRepoStructure(repoPath);
    const git = new StubGitVersioning({
      commitHash: "def456",
      upstream: "origin/main",
      commitPushId: "def456@origin/main",
    });
    const publisher = new FileSystemWorkflowImprovementTicketPublisher({
      now: () => new Date("2026-03-19T18:00:00.000Z"),
      createGitVersioning: () => git,
    });

    const result = await publisher.publish(
      createCandidate({
        activeProjectPath: repoPath,
      }),
    );

    assert.equal(result.status, "created-and-pushed");
    assert.equal(result.targetRepoKind, "current-project");
    assert.equal(result.targetRepoDisplayPath, ".");
    assert.equal(result.commitPushId, "def456@origin/main");
    assert.ok(result.ticketPath);
    assert.equal(git.publishedCommits.length, 1);
    assert.deepEqual(git.publishedCommits[0]?.paths, [result.ticketPath ?? ""]);

    const ticketContent = await fs.readFile(
      path.join(repoPath, ...(result.ticketPath ?? "").split("/")),
      "utf8",
    );
    assert.match(
      ticketContent,
      /Analysis stage \(when applicable\): spec-workflow-retrospective/u,
    );
    assert.match(
      ticketContent,
      /Active project \(when applicable\): codex-flow-runner \(\.\)/u,
    );
    assert.match(
      ticketContent,
      /Target repository \(when applicable\): codex-flow-runner \(\.\)/u,
    );
    assert.match(
      ticketContent,
      /Request ID: trace-123/u,
    );
    assert.match(
      ticketContent,
      /Source spec \(when applicable\): codex-flow-runner\/docs\/specs\/2026-03-19-spec-ticket-validation\.md/u,
    );
    assert.match(
      ticketContent,
      /Source spec canonical path \(when applicable\): docs\/specs\/2026-03-19-spec-ticket-validation\.md/u,
    );
    assert.match(
      ticketContent,
      /^# \[TICKET\] Publication automatica sem contrato editorial suficiente$/mu,
    );
    assert.doesNotMatch(ticketContent, /Melhoria transversal de workflow derivada de/u);
    assert.match(
      ticketContent,
      /Source requirements \(when applicable\): RF-18, RNF-02, Restricao tecnica: revisar README\.md quando o contrato editorial mudar\., CA-13/u,
    );
    assert.doesNotMatch(ticketContent, /Source requirements \(RFs\/CAs, when applicable\)/u);
    assert.match(
      ticketContent,
      /Affected workflow surfaces: prompts, parser, runner/u,
    );
    assert.match(
      ticketContent,
      /## Problem statement\nO workflow ainda pode publicar backlog sistemico sem um ticketDraft completo\./u,
    );
    assert.match(
      ticketContent,
      /## Expected behavior\nPublication elegivel deve transportar um ticketDraft parseavel e suficiente\./u,
    );
    assert.match(
      ticketContent,
      /## Proposed solution \(optional\)\nExigir e propagar ticketDraft estruturado antes da publication do ticket\./u,
    );
    assert.doesNotMatch(
      ticketContent,
      /## Proposed solution \(optional\)\nMover a publication para o pos-auditoria reduz recorrencia futura\./u,
    );
    assert.match(
      ticketContent,
      /## Closure criteria\n- Refs de origem relacionadas: RF-18, RNF-02, Restricao tecnica: revisar README\.md quando o contrato editorial mudar\., CA-13\n- Publication elegivel sem ticketDraft valido vira operational-limitation observavel\./u,
    );
    assert.match(ticketContent, /Systemic gap fingerprints/u);
    assert.match(
      ticketContent,
      /Workflow root cause \(required for tickets created from workflow retrospectives or post-implementation audit\/review\): systemic-instruction/u,
    );
    assert.match(ticketContent, /Smallest plausible explanation \(audit\/review only\):/u);
    assert.match(ticketContent, /Remediation scope \(audit\/review only\): generic-repository-instruction/u);
    assert.match(
      ticketContent,
      /Decision file: codex-flow-runner\/\.codex-flow-runner\/flow-traces\/decisions\/trace-123-decision\.json/u,
    );
    assert.match(ticketContent, /workflow-gap-analysis pos-spec-audit/u);
    assert.match(ticketContent, /Hipotese causal consolidada:/u);
  } finally {
    await cleanupTempWorkspace(workspacePath);
  }
});

test("publica ticket transversal no repositorio irmao quando o projeto ativo e externo", async () => {
  const workspacePath = await createTempWorkspace();
  try {
    const externalRepoPath = path.join(workspacePath, "alpha-project");
    const workflowRepoPath = path.join(workspacePath, "codex-flow-runner");
    await fs.mkdir(externalRepoPath, { recursive: true });
    await ensureRepoStructure(workflowRepoPath);
    const git = new StubGitVersioning();
    const publisher = new FileSystemWorkflowImprovementTicketPublisher({
      now: () => new Date("2026-03-19T18:00:00.000Z"),
      createGitVersioning: () => git,
    });

    const result = await publisher.publish(
      createCandidate({
        activeProjectName: "alpha-project",
        activeProjectPath: externalRepoPath,
      }),
    );

    assert.equal(result.status, "created-and-pushed");
    assert.equal(result.targetRepoKind, "workflow-sibling");
    assert.equal(result.targetRepoDisplayPath, "../codex-flow-runner");
    assert.ok(result.ticketPath);
    const ticketAbsolutePath = path.join(workflowRepoPath, ...(result.ticketPath ?? "").split("/"));
    const ticketExists = await fs
      .access(ticketAbsolutePath)
      .then(() => true)
      .catch(() => false);
    assert.equal(ticketExists, true);
    const ticketContent = await fs.readFile(ticketAbsolutePath, "utf8");
    assert.match(
      ticketContent,
      /Source spec \(when applicable\): alpha-project\/docs\/specs\/2026-03-19-spec-ticket-validation\.md/u,
    );
    assert.match(
      ticketContent,
      /Source spec canonical path \(when applicable\): docs\/specs\/2026-03-19-spec-ticket-validation\.md/u,
    );
    assert.match(
      ticketContent,
      /^# \[TICKET\] Publication automatica sem contrato editorial suficiente$/mu,
    );
    assert.match(
      ticketContent,
      /Source requirements \(when applicable\): RF-18, RNF-02, Restricao tecnica: revisar README\.md quando o contrato editorial mudar\., CA-13/u,
    );
    assert.match(
      ticketContent,
      /Decision file: alpha-project\/\.codex-flow-runner\/flow-traces\/decisions\/trace-123-decision\.json/u,
    );
    assert.match(
      ticketContent,
      /Related docs\/execplans:\n(?:  - .+\n)*  - codex-flow-runner\/prompts\/11-retrospectiva-workflow-apos-spec-audit\.md/u,
    );
  } finally {
    await cleanupTempWorkspace(workspacePath);
  }
});

test("publica ticket transversal pre-run-all com wording stage-aware e paths qualificados por projeto", async () => {
  const workspacePath = await createTempWorkspace();
  try {
    const externalRepoPath = path.join(workspacePath, "alpha-project");
    const workflowRepoPath = path.join(workspacePath, "codex-flow-runner");
    await fs.mkdir(externalRepoPath, { recursive: true });
    await ensureRepoStructure(workflowRepoPath);
    const publisher = new FileSystemWorkflowImprovementTicketPublisher({
      now: () => new Date("2026-03-19T18:00:00.000Z"),
      createGitVersioning: () => new StubGitVersioning(),
    });

    const result = await publisher.publish(
      createCandidate({
        analysisStage: "spec-ticket-derivation-retrospective",
        activeProjectName: "alpha-project",
        activeProjectPath: externalRepoPath,
        inputMode: "spec-ticket-validation-history",
        causalHypothesis:
          "A retrospectiva pre-run-all ainda nao leva o backlog sistemico ao repositorio do workflow de forma explicita.",
        benefitSummary:
          "Publicar o backlog agregado antes do /run-all reduz recorrencia futura.",
        workflowArtifactsConsulted: [
          "../codex-flow-runner/AGENTS.md",
          "../codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md",
        ],
      }),
    );

    assert.equal(result.status, "created-and-pushed");
    const ticketAbsolutePath = path.join(workflowRepoPath, ...(result.ticketPath ?? "").split("/"));
    const ticketContent = await fs.readFile(ticketAbsolutePath, "utf8");
    assert.match(
      ticketContent,
      /Analysis stage \(when applicable\): spec-ticket-derivation-retrospective/u,
    );
    assert.match(
      ticketContent,
      /^# \[TICKET\] Publication automatica sem contrato editorial suficiente$/mu,
    );
    assert.match(
      ticketContent,
      /derivation-gap-analysis pre-run-all/u,
    );
    assert.doesNotMatch(ticketContent, /pos-spec-audit/u);
    assert.match(
      ticketContent,
      /Source spec \(when applicable\): alpha-project\/docs\/specs\/2026-03-19-spec-ticket-validation\.md/u,
    );
    assert.match(
      ticketContent,
      /Request file: alpha-project\/\.codex-flow-runner\/flow-traces\/requests\/trace-123-request\.md/u,
    );
    assert.match(
      ticketContent,
      /codex-flow-runner\/prompts\/12-retrospectiva-derivacao-tickets-pre-run-all\.md/u,
    );
  } finally {
    await cleanupTempWorkspace(workspacePath);
  }
});

test("reutiliza ticket aberto quando a mesma spec ja possui fingerprints sobrepostos", async () => {
  const workspacePath = await createTempWorkspace();
  try {
    const repoPath = path.join(workspacePath, "codex-flow-runner");
    await ensureRepoStructure(repoPath);
    const existingTicketPath = path.join(
      repoPath,
      "tickets",
      "open",
      "2026-03-19-workflow-improvement-existing.md",
    );
    await fs.writeFile(
      existingTicketPath,
      [
        "# [TICKET] Existente",
        "",
        "## Metadata",
        "- Source spec (when applicable): docs/specs/2026-03-19-spec-ticket-validation.md",
        '- Systemic gap fingerprints: ["coverage-gap|tickets/open/example.md|rf-18"]',
        "",
      ].join("\n"),
      "utf8",
    );
    const git = new StubGitVersioning();
    const publisher = new FileSystemWorkflowImprovementTicketPublisher({
      createGitVersioning: () => git,
    });

    const result = await publisher.publish(
      createCandidate({
        activeProjectPath: repoPath,
      }),
    );

    assert.equal(result.status, "reused-open-ticket");
    assert.equal(result.ticketPath, "tickets/open/2026-03-19-workflow-improvement-existing.md");
    assert.equal(git.publishedCommits.length, 0);
  } finally {
    await cleanupTempWorkspace(workspacePath);
  }
});

test("retorna limitacao operacional quando o repositorio irmao nao existe", async () => {
  const workspacePath = await createTempWorkspace();
  try {
    const externalRepoPath = path.join(workspacePath, "alpha-project");
    await fs.mkdir(externalRepoPath, { recursive: true });
    const publisher = new FileSystemWorkflowImprovementTicketPublisher();

    const result = await publisher.publish(
      createCandidate({
        activeProjectName: "alpha-project",
        activeProjectPath: externalRepoPath,
      }),
    );

    assert.equal(result.status, "operational-limitation");
    assert.equal(result.targetRepoKind, "workflow-sibling");
    assert.equal(result.limitationCode, "target-repo-missing");
    assert.match(result.detail, /nao encontrado/u);
  } finally {
    await cleanupTempWorkspace(workspacePath);
  }
});

test("resultado not-needed padrao mantem contrato minimo", () => {
  const result = createWorkflowImprovementNotNeededResult();

  assert.deepEqual(result, {
    status: "not-needed",
    targetRepoKind: "unresolved",
    targetRepoPath: null,
    targetRepoDisplayPath: null,
    ticketFileName: null,
    ticketPath: null,
    detail: "Nenhum gap sistemico elegivel exigiu ticket transversal nesta execucao.",
    limitationCode: null,
    commitHash: null,
    pushUpstream: null,
    commitPushId: null,
    gapFingerprints: [],
  });
});
