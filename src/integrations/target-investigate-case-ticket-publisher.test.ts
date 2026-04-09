import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { TargetInvestigateCaseTicketPublicationRequest } from "../core/target-investigate-case.js";
import { targetInvestigateCaseManifestSchema } from "../types/target-investigate-case.js";
import { FileSystemTargetInvestigateCaseTicketPublisher } from "./target-investigate-case-ticket-publisher.js";
import { GitCheckupPublicationRequest, GitSyncEvidence, GitVersioning } from "./git-client.js";

class StubGitVersioning implements GitVersioning {
  public readonly commitAndPushCalls: Array<{
    paths: string[];
    subject: string;
    bodyParagraphs: string[];
  }> = [];

  async commitTicketClosure(): Promise<void> {
    throw new Error("not implemented");
  }

  async commitAndPushPaths(
    paths: string[],
    subject: string,
    bodyParagraphs: string[] = [],
  ): Promise<GitSyncEvidence | null> {
    this.commitAndPushCalls.push({
      paths,
      subject,
      bodyParagraphs,
    });
    return {
      commitHash: "abc123",
      upstream: "origin/main",
      commitPushId: "abc123@origin/main",
    };
  }

  async commitCheckupArtifacts(_request: GitCheckupPublicationRequest): Promise<never> {
    throw new Error("not implemented");
  }

  async assertSyncedWithRemote(): Promise<never> {
    throw new Error("not implemented");
  }
}

test("FileSystemTargetInvestigateCaseTicketPublisher cria ticket versionando apenas o ticket", async () => {
  const fixture = await createPublisherFixture();
  const publisher = new FileSystemTargetInvestigateCaseTicketPublisher(
    fixture.projectPath,
    fixture.gitVersioning,
    {
      now: () => new Date("2026-04-03T22:10:00.000Z"),
    },
  );

  const result = await publisher.publish(fixture.request);
  assert.match(result.ticketPath, /^tickets\/open\/2026-04-03-case-001-/u);

  const absoluteTicketPath = path.join(fixture.projectPath, ...result.ticketPath.split("/"));
  const content = await fs.readFile(absoluteTicketPath, "utf8");
  assert.match(content, /# \[TICKET\] Corrigir guardrail local do billing-core em case-investigation/u);
  assert.match(content, /## Investigacao Causal/u);
  assert.match(content, /### Publication decision/u);
  assert.match(content, /ticket_path: tickets\/open\/2026-04-03-case-001-/u);

  assert.deepEqual(fixture.gitVersioning.commitAndPushCalls, [
    {
      paths: [result.ticketPath],
      subject: `chore(tickets): open ${path.posix.basename(result.ticketPath, ".md")}`,
      bodyParagraphs: [
        "Flow: /target_investigate_case",
        "Case-ref: case-001",
      ],
    },
  ]);
});

test("FileSystemTargetInvestigateCaseTicketPublisher reaproveita ticket existente sem duplicar publication", async () => {
  const fixture = await createPublisherFixture();
  const publisher = new FileSystemTargetInvestigateCaseTicketPublisher(
    fixture.projectPath,
    fixture.gitVersioning,
    {
      now: () => new Date("2026-04-03T22:10:00.000Z"),
    },
  );

  const first = await publisher.publish(fixture.request);
  const second = await publisher.publish(fixture.request);

  assert.equal(second.ticketPath, first.ticketPath);
  assert.equal(fixture.gitVersioning.commitAndPushCalls.length, 1);
});

test("FileSystemTargetInvestigateCaseTicketPublisher respeita slug-only para ticket generalizavel target-owned", async () => {
  const fixture = await createPublisherFixture();
  fixture.request.ticketProposal = buildTargetOwnedTicketProposalFixture({
    suggested_slug: "fix-billing-core-local-guardrail",
    suggested_title: "Fix billing-core local guardrail",
    publication_hints: {
      ticket_scope: "generalizable",
      slug_strategy: "suggested-slug-only",
      quality_gate: "target-ticket-quality-v1",
    },
    ticket_markdown: buildTargetOwnedTicketMarkdown("Fix billing-core local guardrail", {
      hypothesis: "o cache local reaproveita uma resposta antiga do billing-core",
      qaEscapeWhyNotCaught:
        "o checklist atual nao forca uma revisita ao envelope historico antes da publication.",
      promptOpportunity:
        "explicitar o requisito de citar invalidacao de cache na projecao do ticket.",
      ticketReadinessStatus: "ready",
      ticketReadinessSummary: "o handoff target-owned esta pronto para publication runner-side.",
      remainingGapSummary: "confirmar o purge dos envelopes antigos antes do rollout amplo.",
    }),
  });

  const publisher = new FileSystemTargetInvestigateCaseTicketPublisher(
    fixture.projectPath,
    fixture.gitVersioning,
    {
      now: () => new Date("2026-04-03T22:10:00.000Z"),
    },
  );

  const result = await publisher.publish(fixture.request);
  assert.equal(result.ticketPath, "tickets/open/2026-04-03-fix-billing-core-local-guardrail.md");

  const absoluteTicketPath = path.join(fixture.projectPath, ...result.ticketPath.split("/"));
  const content = await fs.readFile(absoluteTicketPath, "utf8");
  assert.match(content, /# \[TICKET\] Fix billing-core local guardrail/u);
});

test("FileSystemTargetInvestigateCaseTicketPublisher respeita case-ref-prefix para ticket case-specific target-owned", async () => {
  const fixture = await createPublisherFixture();
  fixture.request.ticketProposal = buildTargetOwnedTicketProposalFixture({
    suggested_slug: "fix-billing-core-local-guardrail",
    suggested_title: "Fix billing-core local guardrail",
    publication_hints: {
      ticket_scope: "case-specific",
      slug_strategy: "case-ref-prefix",
      quality_gate: "legacy",
    },
  });

  const publisher = new FileSystemTargetInvestigateCaseTicketPublisher(
    fixture.projectPath,
    fixture.gitVersioning,
    {
      now: () => new Date("2026-04-03T22:10:00.000Z"),
    },
  );

  const result = await publisher.publish(fixture.request);
  assert.equal(
    result.ticketPath,
    "tickets/open/2026-04-03-case-001-fix-billing-core-local-guardrail.md",
  );

  const absoluteTicketPath = path.join(fixture.projectPath, ...result.ticketPath.split("/"));
  const content = await fs.readFile(absoluteTicketPath, "utf8");
  assert.match(content, /# \[TICKET\] Fix billing-core guardrail/u);
});

test("FileSystemTargetInvestigateCaseTicketPublisher rejeita markdown target-owned invalido sob quality gate v1", async () => {
  const fixture = await createPublisherFixture();
  fixture.request.ticketProposal = buildTargetOwnedTicketProposalFixture({
    publication_hints: {
      ticket_scope: "generalizable",
      slug_strategy: "suggested-slug-only",
      quality_gate: "target-ticket-quality-v1",
    },
    ticket_markdown: [
      "# [TICKET] Fix billing-core local guardrail",
      "",
      "## Metadata",
      "",
      "## Context",
      "",
      "## Problem statement",
      "",
      "## Observed behavior",
      "",
      "- O que foi observado:",
      "- O que foi observado:",
      "",
      "## Expected behavior",
      "",
      "## Reproduction steps",
      "",
      "1. repetir",
      "2. repetir",
      "3. repetir",
      "",
      "## Evidence",
      "",
      "## Impact assessment",
      "",
      "## Investigacao Causal",
      "",
      "### Resolved case",
      "### Resolved attempt",
      "### Investigation inputs",
      "### Replay used",
      "### Verdicts",
      "### Confidence and evidence sufficiency",
      "### Hypotheses considered",
      "- o cache local reaproveita uma resposta antiga do billing-core",
      "### QA escape",
      "- o checklist atual nao forca uma revisita ao envelope historico antes da publication.",
      "### Prompt / guardrail opportunities",
      "- explicitar o requisito de citar invalidacao de cache na projecao do ticket.",
      "### Ticket readiness",
      "- ready",
      "- o handoff target-owned esta pronto para publication runner-side.",
      "- confirmar o purge dos envelopes antigos antes do rollout amplo.",
      "### Causal surface",
      "### Generalization basis",
      "### Overfit vetoes considered",
      "### Publication decision",
      "",
      "## Closure criteria",
      "",
      "## Decision log",
      "",
      "## Closure",
    ].join("\n"),
  });

  const publisher = new FileSystemTargetInvestigateCaseTicketPublisher(
    fixture.projectPath,
    fixture.gitVersioning,
    {
      now: () => new Date("2026-04-03T22:10:00.000Z"),
    },
  );

  await assert.rejects(
    () => publisher.publish(fixture.request),
    /linhas de lista duplicadas em sequencia/u,
  );
});

test("FileSystemTargetInvestigateCaseTicketPublisher rejeita markdown target-owned sem trilha explicita de RF-08 sob quality gate v1", async () => {
  const fixture = await createPublisherFixture();
  fixture.request.ticketProposal = buildTargetOwnedTicketProposalFixture({
    publication_hints: {
      ticket_scope: "generalizable",
      slug_strategy: "suggested-slug-only",
      quality_gate: "target-ticket-quality-v1",
    },
    ticket_markdown: buildTargetOwnedTicketMarkdown("Fix billing-core local guardrail", {
      hypothesis: "o cache local reaproveita uma resposta antiga do billing-core",
      qaEscapeWhyNotCaught:
        "o checklist atual nao forca uma revisita ao envelope historico antes da publication.",
      promptOpportunity:
        "explicitar o requisito de citar invalidacao de cache na projecao do ticket.",
      ticketReadinessStatus: "ready",
      ticketReadinessSummary: "o handoff target-owned esta pronto para publication runner-side.",
      remainingGapSummary: "confirmar o purge dos envelopes antigos antes do rollout amplo.",
      includeQaEscapeSection: false,
    }),
  });

  const publisher = new FileSystemTargetInvestigateCaseTicketPublisher(
    fixture.projectPath,
    fixture.gitVersioning,
    {
      now: () => new Date("2026-04-03T22:10:00.000Z"),
    },
  );

  await assert.rejects(
    () => publisher.publish(fixture.request),
    /heading obrigatorio ### QA escape|motivo de `qa_escape`/u,
  );
});

const createPublisherFixture = async (): Promise<{
  projectPath: string;
  gitVersioning: StubGitVersioning;
  request: TargetInvestigateCaseTicketPublicationRequest;
}> => {
  const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "target-investigate-case-ticket-"));
  await fs.mkdir(path.join(projectPath, "tickets", "open"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "closed"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "templates"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "docs", "workflows"), { recursive: true });

  await fs.writeFile(
    path.join(projectPath, "tickets", "templates", "internal-ticket-template.md"),
    [
      "# [TICKET] <titulo>",
      "",
      "## Metadata",
      "",
      "## Investigacao Causal",
      "",
      "### Resolved case",
      "### Resolved attempt",
      "### Investigation inputs",
      "### Replay used",
      "### Verdicts",
      "### Confidence and evidence sufficiency",
      "### Causal surface",
      "### Generalization basis",
      "### Overfit vetoes considered",
      "### Publication decision",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(projectPath, "docs", "workflows", "target-case-investigation-causal-ticket-template.md"),
    [
      "## Investigacao Causal",
      "### Resolved case",
      "### Resolved attempt",
      "### Investigation inputs",
      "### Replay used",
      "### Verdicts",
      "### Confidence and evidence sufficiency",
      "### Causal surface",
      "### Generalization basis",
      "### Overfit vetoes considered",
      "### Publication decision",
    ].join("\n"),
    "utf8",
  );

  const manifest = targetInvestigateCaseManifestSchema.parse({
    contractVersion: "1.0",
    schemaVersion: "1.0",
    capability: "case-investigation",
    selectors: {
      accepted: ["case-ref", "workflow", "request-id", "window"],
      required: ["case-ref"],
      targetProjectAccepted: ["propertyId", "requestId", "workflow", "window", "runArtifact"],
    },
    workflows: {
      investigable: ["billing-core"],
    },
    caseResolutionPolicy: {
      requireExplicitAttemptResolution: true,
      allowAttemptlessCases: true,
      caseRefAuthorities: ["propertyId", "requestId", "runArtifact"],
      attemptRefAuthorities: ["requestId", "runArtifact", "workflow+window"],
    },
    evidenceCollection: {
      surfaces: [
        {
          id: "local-run-bundle",
          kind: "local-artifacts",
          description: "Bundle local correlacionado por requestId.",
        },
      ],
      strategies: [
        {
          id: "allowed-query-1",
          kind: "query",
          reference: "GET /_meta/extractors",
        },
      ],
    },
    outputs: {
      caseResolution: {
        artifactPath: "case-resolution.json",
        schemaVersion: "1.0",
      },
      evidenceBundle: {
        artifactPath: "evidence-bundle.json",
        schemaVersion: "1.0",
      },
      assessment: {
        artifactPath: "assessment.json",
        schemaVersion: "1.0",
      },
      publicationDecision: {
        artifactPath: "publication-decision.json",
        schemaVersion: "1.0",
      },
      dossier: {
        artifactPathPattern: "dossier.md|dossier.json",
        schemaVersion: "1.0",
        preferredArtifact: "dossier.md",
      },
    },
    replayPolicy: {
      supported: true,
      safeModeRequired: true,
      requireUpdateDbFalse: true,
      requireDedicatedRequestId: true,
      allowWorkflowDebugWhenSafe: true,
      cachePurgePolicy: "POST /_meta/cache/purge-extractors",
      acceptedPurgeIdentifiers: [
        "propertyId",
        "pdfFileName",
        "matriculaNumber",
        "transcriptHint",
      ],
    },
    dossierPolicy: {
      localPathTemplate: "output/case-investigation/<request-id>/",
      sensitivity: "confidential",
      retention: "manual cleanup after investigator review",
    },
    supportingArtifacts: {
      docs: ["docs/workflows/target-case-investigation-runbook.md"],
      prompts: ["docs/workflows/target-case-investigation-causal-ticket-template.md"],
      scripts: [],
    },
    precedence: {
      fixedLayers: ["canonical-contract", "structured-contracts", "runtime-guardrails"],
      projectCustomizableLayers: [
        "active-decisions",
        "tests-and-goldens",
        "historical-evidence-and-replay",
      ],
    },
    publicationPolicy: {
      allowAutomaticPublication: true,
      requireStrongEvidenceByDefault: true,
      allowSufficientWithNormativeConflict: true,
      requireGeneralizationBasis: true,
      requireZeroBlockingVetoes: true,
      blockedReason: null,
    },
    ticketPublicationPolicy: {
      internalTicketTemplatePath: "tickets/templates/internal-ticket-template.md",
      causalBlockSourcePath: "docs/workflows/target-case-investigation-causal-ticket-template.md",
      mandatoryCausalBlockSources: ["production-observation"],
      versionedArtifactsDefault: ["ticket"],
      nonVersionedArtifactsDefault: [
        "evidence-bundle.json",
        "workflow_debug",
        "db_payload",
        "transcript",
      ],
      semanticAuthority: "target-project",
      finalPublicationAuthority: "runner",
    },
  });

  return {
    projectPath,
    gitVersioning: new StubGitVersioning(),
    request: {
      targetProject: {
        name: "alpha-project",
        path: projectPath,
      },
      normalizedInput: {
        projectName: "alpha-project",
        caseRef: "case-001",
        workflow: "billing-core",
        requestId: "req-001",
        window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
        symptom: "timeout on save",
        canonicalCommand:
          "/target_investigate_case alpha-project case-001 --workflow billing-core --request-id req-001",
      },
      manifest,
      caseResolution: {
        case_ref: "case-001",
        selectors: {
          workflow: "billing-core",
          request_id: "req-001",
          window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
          symptom: "timeout on save",
        },
        resolved_case: {
          ref: "case-001",
          summary: "Caso correlacionado com a entidade canonica.",
        },
        attempt_resolution: {
          status: "resolved",
          attempt_ref: "attempt-001",
          reason: "Request historico identificado com seguranca.",
        },
        relevant_workflows: ["billing-core"],
        attempt_candidates: null,
        replay_readiness: null,
        replay_decision: {
          status: "used",
          reason: "Replay seguro complementou a causalidade do caso.",
        },
        resolution_reason: "O projeto alvo fechou o caso sem inferencia livre de tentativa.",
      },
      evidenceBundle: {
        collection_plan: {
          manifest_path: "docs/workflows/target-case-investigation-manifest.json",
          strategy_ids: ["allowed-query-1"],
        },
        historical_sources: [
          {
            source_id: "local-run-bundle",
            surface: "local-artifacts",
            consulted: true,
          },
        ],
        sensitive_artifact_refs: [
          {
            ref: "dossier-ref",
            path: "investigations/round-1/dossier.md",
            sha256: "a".repeat(64),
            record_count: 1,
          },
        ],
        replay: {
          used: true,
          mode: "safe-replay",
          request_id: "replay-001",
          update_db: false,
          include_workflow_debug: false,
          cache_policy: "cache scoped",
          purge_policy: "dry-run before apply",
          namespace: "output/case-investigation/replay-001/",
        },
        collection_sufficiency: "strong",
        normative_conflicts: [],
        factual_sufficiency_reason: "A rodada reuniu evidencia forte o bastante para publication.",
      },
      diagnosis: {
        schema_version: "diagnosis_v1",
        bundle_artifact: "investigations/round-1/evidence-bundle.json",
        verdict: "not_ok",
        summary: "O caso nao esta OK e a remediacao local ja foi isolada.",
        why: "A evidencia confirma falha reproduzivel do guardrail local.",
        expected_behavior: "Preservar o guardrail local do billing-core.",
        observed_behavior: "O guardrail local falhou no caso investigado.",
        confidence: "high",
        behavior_to_change: "Corrigir o guardrail local reutilizavel do billing-core.",
        probable_fix_surface: ["src/workflows/billing-core.ts"],
        evidence_used: [
          {
            artifact: "evidence-bundle.json",
            path: "investigations/round-1/evidence-bundle.json",
          },
        ],
        next_action: "Revisar o ticket publicado.",
        lineage: [
          {
            artifact: "case-bundle.json",
            path: "output/case-investigation/round-1/case-bundle.json",
          },
        ],
      },
      assessment: {
        houve_gap_real: "yes",
        era_evitavel_internamente: "yes",
        merece_ticket_generalizavel: "yes",
        confidence: "high",
        evidence_sufficiency: "strong",
        primary_taxonomy: null,
        operational_class: null,
        next_action: null,
        blockers: [],
        causal_hypothesis: null,
        semantic_confirmation: null,
        bounded_outcome: null,
        capability_limits: [],
        causal_debug: null,
        root_cause_review: null,
        primary_remediation: {
          status: "recommended",
          execution_readiness: "ready",
          publication_dependency: "shared",
          source: "causal_debug",
          confidence: "high",
          summary: "Corrigir o guardrail local reutilizavel do billing-core.",
          rationale: "A investigacao ja isolou a menor superficie local de correcao.",
          stage: "consolidacao final",
          suggested_fix_surface: ["src/workflows/billing-core.ts"],
          follow_ups: [
            {
              summary: "Revisar o ticket publicado.",
              scope: "shared",
            },
          ],
          blockers: [],
        },
        ticket_projection: null,
        causal_surface: {
          owner: "target-project",
          kind: "bug",
          summary: "Guardrail local falhou de forma reproduzivel.",
          actionable: true,
          systems: ["billing-core"],
        },
        generalization_basis: [
          {
            code: "contract-violation",
            summary: "Violacao observavel do contrato vigente.",
          },
        ],
        overfit_vetoes: [],
        ticket_decision_reason: "Ha base de generalizacao e superficie causal local clara.",
        publication_recommendation: {
          recommended_action: "publish_ticket",
          reason: "Caso forte o bastante para ticket automatico conservador.",
          proposed_ticket_scope: "Corrigir o guardrail local no workflow billing-core.",
          suggested_title: "Corrigir guardrail local do billing-core em case-investigation",
        },
      },
      summary: {
        case_ref: "case-001",
        resolved_attempt_ref: "attempt-001",
        attempt_resolution_status: "resolved",
        attempt_candidates_status: null,
        replay_readiness_state: null,
        replay_used: true,
        diagnosis: {
          verdict: "not_ok",
          summary: "O caso nao esta OK e a remediacao local ja foi isolada.",
          why: "A evidencia confirma falha reproduzivel do guardrail local.",
          expected_behavior: "Preservar o guardrail local do billing-core.",
          observed_behavior: "O guardrail local falhou no caso investigado.",
          confidence: "high",
          behavior_to_change: "Corrigir o guardrail local reutilizavel do billing-core.",
          probable_fix_surface: ["src/workflows/billing-core.ts"],
          next_action: "Revisar o ticket publicado.",
          bundle_artifact: "investigations/round-1/evidence-bundle.json",
          diagnosis_md_path: "investigations/round-1/diagnosis.md",
          diagnosis_json_path: "investigations/round-1/diagnosis.json",
        },
        houve_gap_real: "yes",
        era_evitavel_internamente: "yes",
        merece_ticket_generalizavel: "yes",
        confidence: "high",
        evidence_sufficiency: "strong",
        primary_taxonomy: null,
        operational_class: null,
        root_cause_status: null,
        ticket_readiness_status: null,
        assessment_next_action: null,
        investigation_outcome: "actionable-remediation-identified",
        investigation_reason: "A investigacao ja isolou uma remediacao local reutilizavel.",
        primary_remediation: {
          status: "recommended",
          execution_readiness: "ready",
          publication_dependency: "shared",
          source: "causal_debug",
          confidence: "high",
          summary: "Corrigir o guardrail local reutilizavel do billing-core.",
          rationale: "A investigacao ja isolou a menor superficie local de correcao.",
          stage: "consolidacao final",
          suggested_fix_surface: ["src/workflows/billing-core.ts"],
          follow_ups: [
            {
              summary: "Revisar o ticket publicado.",
              scope: "shared",
            },
          ],
          blockers: [],
        },
        remediation_proposal_path: "investigations/round-1/remediation-proposal.json",
        blocker_codes: [],
        remaining_gap_codes: [],
        causal_surface: {
          owner: "target-project",
          kind: "bug",
          summary: "Guardrail local falhou de forma reproduzivel.",
          actionable: true,
          systems: ["billing-core"],
        },
        publication_status: "eligible",
        overall_outcome: "ticket-published",
        outcome_reason: "Ticket elegivel publicado.",
        dossier_path: "investigations/round-1/dossier.md",
        ticket_path: null,
        next_action: "Revisar o ticket publicado.",
      },
    },
  };
};

const buildTargetOwnedTicketProposalFixture = (
  overrides: Record<string, unknown> = {},
): any => ({
  schema_version: "ticket_proposal_v1",
  generated_at: "2026-04-03T22:09:30.000Z",
  source_diagnosis_artifact: "diagnosis.json",
  source_case_bundle_artifact: "case-bundle.json",
  recommended_action: "publish_ticket",
  suggested_slug: "fix-billing-core-guardrail",
  suggested_title: "Fix billing-core guardrail",
  priority: "P1",
  severity: "S2",
  summary: "Fix the reusable billing-core guardrail gap.",
  competing_hypotheses: [
    {
      hypothesis: "o cache local reaproveita uma resposta antiga do billing-core",
      disposition: "kept-as-primary",
      rationale: "o comportamento observado reaparece sem rerodar o fluxo corrigido",
    },
  ],
  qa_escape: {
    summary: "o QA local nao revisitou envelopes historicos antes da publication",
    why_not_caught:
      "o checklist atual nao forca uma revisita ao envelope historico antes da publication.",
  },
  prompt_guardrail_opportunities: [
    {
      area: "ticket projection",
      summary: "explicitar o requisito de citar invalidacao de cache na projecao do ticket.",
    },
  ],
  ticket_readiness: {
    status: "ready",
    reason_code: "READY",
    summary: "o handoff target-owned esta pronto para publication runner-side.",
  },
  remaining_gaps: [
    {
      code: "cache-purge-follow-up",
      summary: "confirmar o purge dos envelopes antigos antes do rollout amplo.",
    },
  ],
  ticket_markdown: buildTargetOwnedTicketMarkdown("Fix billing-core guardrail", {
    hypothesis: "o cache local reaproveita uma resposta antiga do billing-core",
    qaEscapeWhyNotCaught:
      "o checklist atual nao forca uma revisita ao envelope historico antes da publication.",
    promptOpportunity:
      "explicitar o requisito de citar invalidacao de cache na projecao do ticket.",
    ticketReadinessStatus: "ready",
    ticketReadinessSummary: "o handoff target-owned esta pronto para publication runner-side.",
    remainingGapSummary: "confirmar o purge dos envelopes antigos antes do rollout amplo.",
  }),
  ...overrides,
});

const buildTargetOwnedTicketMarkdown = (
  title: string,
  options: {
    hypothesis?: string;
    qaEscapeWhyNotCaught?: string;
    promptOpportunity?: string;
    ticketReadinessStatus?: string;
    ticketReadinessSummary?: string;
    remainingGapSummary?: string;
    includeQaEscapeSection?: boolean;
  } = {},
): string => {
  const includeQaEscapeSection = options.includeQaEscapeSection ?? true;

  return [
    `# [TICKET] ${title}`,
    "",
    "## Metadata",
    "",
    "- Status: open",
    "- Priority: P1",
    "- Severity: S2",
    "",
    "## Context",
    "",
    "- Workflow/extractor area: billing-core",
    "- Scenario: target-owned markdown fixture",
    "",
    "## Problem statement",
    "",
    "billing-core still exposes a reusable local guardrail gap.",
    "",
    "## Observed behavior",
    "",
    "- O que foi observado:",
    "  - guardrail local falhou sob evidencia correlacionada.",
    "",
    "## Expected behavior",
    "",
    "o ticket target-owned deve permanecer estruturado e reutilizavel.",
    "",
    "## Reproduction steps",
    "",
    "1. Reexecutar o caso com a mesma selecao.",
    "2. Confirmar a mesma superficie causal no dossier.",
    "3. Validar a correcao sem depender apenas deste caso.",
    "",
    "## Evidence",
    "",
    "- Warnings/codes relevantes:",
    "  - bug_confirmed",
    "",
    "## Impact assessment",
    "",
    "- Impacto funcional: backlog recebe ticket reutilizavel.",
    "",
    "## Investigacao Causal",
    "",
    "### Resolved case",
    "",
    "- authority: propertyId",
    "",
    "### Resolved attempt",
    "",
    "- status: resolved",
    "",
    "### Investigation inputs",
    "",
    "- manifest: docs/workflows/target-case-investigation-manifest.json",
    "",
    "### Replay used",
    "",
    "- replay status: not-required",
    "",
    "### Verdicts",
    "",
    "- houve_gap_real: yes",
    "",
    "### Confidence and evidence sufficiency",
    "",
    "- confidence: high",
    "",
    "### Hypotheses considered",
    "",
    `- ${options.hypothesis ?? "o cache local reaproveita uma resposta antiga do billing-core"}`,
    "",
    ...(includeQaEscapeSection
      ? [
          "### QA escape",
          "",
          `- ${options.qaEscapeWhyNotCaught ?? "o checklist atual nao forca uma revisita ao envelope historico antes da publication."}`,
          "",
        ]
      : []),
    "### Prompt / guardrail opportunities",
    "",
    `- ${options.promptOpportunity ?? "explicitar o requisito de citar invalidacao de cache na projecao do ticket."}`,
    "",
    "### Ticket readiness",
    "",
    `- ${options.ticketReadinessStatus ?? "ready"}`,
    `- ${options.ticketReadinessSummary ?? "o handoff target-owned esta pronto para publication runner-side."}`,
    `- ${options.remainingGapSummary ?? "confirmar o purge dos envelopes antigos antes do rollout amplo."}`,
    "",
    "### Causal surface",
    "",
    "- owner: target-project",
    "",
    "### Generalization basis",
    "",
    "- correlated_local_bundle: fixture",
    "",
    "### Overfit vetoes considered",
    "",
    "- none",
    "",
    "### Publication decision",
    "",
    "- recommended_action: publish_ticket",
    "",
    "## Closure criteria",
    "",
    "- Provar a correcao com evidencia observavel.",
    "",
    "## Decision log",
    "",
    "- 2026-04-03 - fixture - preserve target-owned markdown.",
    "",
    "## Closure",
    "",
    "- Closed at (UTC):",
  ].join("\n");
};
