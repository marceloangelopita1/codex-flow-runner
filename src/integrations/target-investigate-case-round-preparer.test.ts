import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Logger } from "../core/logger.js";
import {
  TargetInvestigateCaseRoundPreparationRequest,
  TargetInvestigateCaseTicketPublicationRequest,
} from "../core/target-investigate-case.js";
import { ProjectRef } from "../types/project.js";
import { targetInvestigateCaseManifestSchema } from "../types/target-investigate-case.js";
import {
  TargetInvestigateCaseRoundMaterializationCodexClient,
  TargetInvestigateCaseRoundMaterializationCodexRequest,
} from "./codex-client.js";
import { GitCheckupPublicationRequest, GitSyncEvidence, GitVersioning } from "./git-client.js";
import { CodexCliTargetInvestigateCaseRoundPreparer } from "./target-investigate-case-round-preparer.js";

class SilentLogger extends Logger {
  override info(): void {}
  override warn(): void {}
  override error(): void {}
}

class StubCodexClient implements TargetInvestigateCaseRoundMaterializationCodexClient {
  public readonly calls: TargetInvestigateCaseRoundMaterializationCodexRequest[] = [];

  constructor(
    private readonly onRun: (request: TargetInvestigateCaseRoundMaterializationCodexRequest) => Promise<void>,
    private readonly authError?: Error,
  ) {}

  async ensureAuthenticated(): Promise<void> {
    if (this.authError) {
      throw this.authError;
    }
  }

  async snapshotInvocationPreferences(): Promise<null> {
    return null;
  }

  forkWithFixedInvocationPreferences(): TargetInvestigateCaseRoundMaterializationCodexClient {
    return this;
  }

  async runTargetInvestigateCaseRoundMaterialization(
    request: TargetInvestigateCaseRoundMaterializationCodexRequest,
  ) {
    this.calls.push(request);
    await this.onRun(request);
    return {
      output: "materialized",
      promptTemplatePath: "/repo/prompts/16-target-investigate-case-round-materialization.md",
      promptText: "prompt",
    };
  }
}

class StubGitVersioning implements GitVersioning {
  async commitTicketClosure(): Promise<void> {
    throw new Error("not implemented");
  }

  async commitAndPushPaths(): Promise<GitSyncEvidence | null> {
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

test("CodexCliTargetInvestigateCaseRoundPreparer materializa artefatos canonicos e escolhe dossier.json explicitamente", async () => {
  const fixture = await createRoundPreparerFixture();
  const codexClient = new StubCodexClient(async (request) => {
    await materializeRoundArtifacts(request.targetProject.path, request.roundDirectory, "json");
  });
  const preparer = new CodexCliTargetInvestigateCaseRoundPreparer({
    logger: new SilentLogger(),
    runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
    createCodexClient: () => codexClient,
    createGitVersioning: () => new StubGitVersioning(),
  });

  const result = await preparer.prepareRound(fixture.request);
  assert.equal(result.status, "prepared");
  if (result.status !== "prepared") {
    return;
  }

  assert.equal(result.dossierPath, "investigations/2026-04-03T19-00-00Z/dossier.json");
  assert.ok(result.ticketPublisher);
  assert.deepEqual(codexClient.calls[0]?.targetProjectAcceptedSelectors, [
    "propertyId",
    "requestId",
    "workflow",
    "window",
    "runArtifact",
  ]);
  assert.deepEqual(codexClient.calls[0]?.acceptedPurgeIdentifiers, [
    "propertyId",
    "pdfFileName",
    "matriculaNumber",
    "transcriptHint",
  ]);
});

test("CodexCliTargetInvestigateCaseRoundPreparer aceita o shape rico atual dos artefatos do piloto", async () => {
  const fixture = await createRoundPreparerFixture();
  fixture.request.normalizedInput = {
    ...fixture.request.normalizedInput,
    caseRef: "case_inv_pilot_20260403_183200",
    requestId: "case_inv_pilot_20260403_183200",
    canonicalCommand:
      "/target_investigate_case alpha-project case_inv_pilot_20260403_183200 --workflow extract_address --request-id case_inv_pilot_20260403_183200",
  };

  const preparer = new CodexCliTargetInvestigateCaseRoundPreparer({
    logger: new SilentLogger(),
    runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
    createCodexClient: () =>
      new StubCodexClient(async (request) => {
        await materializeRichRoundArtifacts(request.targetProject.path, request.roundDirectory, "md");
      }),
    createGitVersioning: () => new StubGitVersioning(),
  });

  const result = await preparer.prepareRound(fixture.request);
  assert.equal(result.status, "prepared");
  if (result.status !== "prepared") {
    return;
  }

  assert.equal(result.dossierPath, "investigations/2026-04-03T19-00-00Z/dossier.md");
  assert.ok(result.ticketPublisher);
});

test("CodexCliTargetInvestigateCaseRoundPreparer bloqueia quando o Codex CLI nao esta autenticado", async () => {
  const fixture = await createRoundPreparerFixture();
  const preparer = new CodexCliTargetInvestigateCaseRoundPreparer({
    logger: new SilentLogger(),
    runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
    createCodexClient: () =>
      new StubCodexClient(async () => undefined, new Error("sessao ausente do Codex CLI")),
    createGitVersioning: () => new StubGitVersioning(),
  });

  const result = await preparer.prepareRound(fixture.request);
  assert.deepEqual(result, {
    status: "blocked",
    message: "sessao ausente do Codex CLI",
  });
});

test("CodexCliTargetInvestigateCaseRoundPreparer falha quando o materializador nao entrega os artefatos obrigatorios", async () => {
  const fixture = await createRoundPreparerFixture();
  const preparer = new CodexCliTargetInvestigateCaseRoundPreparer({
    logger: new SilentLogger(),
    runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
    createCodexClient: () =>
      new StubCodexClient(async (request) => {
        await materializeRoundArtifacts(
          request.targetProject.path,
          request.roundDirectory,
          "json",
        );
        await fs.rm(
          path.join(request.targetProject.path, ...request.artifactPaths.evidenceBundlePath.split("/")),
        );
      }),
    createGitVersioning: () => new StubGitVersioning(),
  });

  const result = await preparer.prepareRound(fixture.request);
  assert.equal(result.status, "failed");
  if (result.status !== "failed") {
    return;
  }
  assert.match(result.message, /evidence-bundle\.json/u);
});

const createRoundPreparerFixture = async (): Promise<{
  project: ProjectRef;
  request: TargetInvestigateCaseRoundPreparationRequest;
}> => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "target-investigate-case-round-"));
  const projectPath = path.join(rootPath, "alpha-project");
  await fs.mkdir(path.join(projectPath, ".git"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "open"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "closed"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "templates"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "docs", "workflows"), { recursive: true });

  await fs.writeFile(
    path.join(projectPath, "tickets", "templates", "internal-ticket-template.md"),
    "## Investigacao Causal\n### Resolved case\n### Resolved attempt\n### Investigation inputs\n### Replay used\n### Verdicts\n### Confidence and evidence sufficiency\n### Causal surface\n### Generalization basis\n### Overfit vetoes considered\n### Publication decision\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(projectPath, "docs", "workflows", "target-case-investigation-causal-ticket-template.md"),
    "## Investigacao Causal\n### Resolved case\n### Resolved attempt\n### Investigation inputs\n### Replay used\n### Verdicts\n### Confidence and evidence sufficiency\n### Causal surface\n### Generalization basis\n### Overfit vetoes considered\n### Publication decision\n",
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
      investigable: ["extract_address", "extract_condominium_info"],
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
        preferredArtifact: "dossier.json",
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
    project: {
      name: "alpha-project",
      path: projectPath,
    },
    request: {
      targetProject: {
        name: "alpha-project",
        path: projectPath,
      },
      normalizedInput: {
        projectName: "alpha-project",
        caseRef: "case-001",
        workflow: "extract_address",
        requestId: "req-001",
        window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
        symptom: "timeout on save",
        canonicalCommand:
          "/target_investigate_case alpha-project case-001 --workflow extract_address --request-id req-001",
      },
      manifest,
      manifestPath: "docs/workflows/target-case-investigation-manifest.json",
      roundId: "2026-04-03T19-00-00Z",
      roundDirectory: "investigations/2026-04-03T19-00-00Z",
      artifactPaths: {
        caseResolutionPath: "investigations/2026-04-03T19-00-00Z/case-resolution.json",
        evidenceBundlePath: "investigations/2026-04-03T19-00-00Z/evidence-bundle.json",
        assessmentPath: "investigations/2026-04-03T19-00-00Z/assessment.json",
        dossierPath: "investigations/2026-04-03T19-00-00Z/dossier.md",
        publicationDecisionPath:
          "investigations/2026-04-03T19-00-00Z/publication-decision.json",
      },
      isCancellationRequested: () => false,
    },
  };
};

const materializeRoundArtifacts = async (
  projectPath: string,
  roundDirectory: string,
  dossierFormat: "md" | "json",
): Promise<void> => {
  const roundPath = path.join(projectPath, ...roundDirectory.split("/"));
  await fs.mkdir(roundPath, { recursive: true });
  await fs.writeFile(
    path.join(roundPath, "case-resolution.json"),
    JSON.stringify(
      {
        case_ref: "case-001",
        selectors: {
          workflow: "extract_address",
          request_id: "req-001",
          window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
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
        relevant_workflows: ["extract_address"],
        replay_decision: {
          status: "used",
          reason: "Replay seguro complementou a causalidade do caso.",
        },
        resolution_reason: "O projeto alvo fechou o caso sem inferencia livre de tentativa.",
      },
      null,
      2,
    ).concat("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(roundPath, "evidence-bundle.json"),
    JSON.stringify(
      {
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
            path: `${roundDirectory}/dossier.${dossierFormat}`,
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
      null,
      2,
    ).concat("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(roundPath, "assessment.json"),
    JSON.stringify(
      {
        houve_gap_real: "yes",
        era_evitavel_internamente: "yes",
        merece_ticket_generalizavel: "yes",
        confidence: "high",
        evidence_sufficiency: "strong",
        causal_surface: {
          owner: "target-project",
          kind: "bug",
          summary: "Guardrail local falhou de forma reproduzivel.",
          actionable: true,
          systems: ["extract_address"],
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
          proposed_ticket_scope: "Corrigir o guardrail local no workflow extract_address.",
          suggested_title: "Corrigir guardrail local do extract_address em case-investigation",
        },
      },
      null,
      2,
    ).concat("\n"),
    "utf8",
  );

  const dossierPath = path.join(roundPath, `dossier.${dossierFormat}`);
  const dossierContent =
    dossierFormat === "json"
      ? JSON.stringify(
          {
            case_ref: "case-001",
            local_path: `${roundDirectory}/dossier.json`,
            retention: "manual cleanup after investigator review",
            summary: "Resumo local e sensivel sob retencao controlada.",
          },
          null,
          2,
        ).concat("\n")
      : "# dossier\n\nResumo local e sensivel sob retencao controlada.\n";
  await fs.writeFile(dossierPath, dossierContent, "utf8");
};

const materializeRichRoundArtifacts = async (
  projectPath: string,
  roundDirectory: string,
  dossierFormat: "md" | "json",
): Promise<void> => {
  const roundPath = path.join(projectPath, ...roundDirectory.split("/"));
  await fs.mkdir(roundPath, { recursive: true });
  await fs.writeFile(
    path.join(roundPath, "case-resolution.json"),
    JSON.stringify(
      {
        schema_version: "case_resolution_v1",
        generated_at: "2026-04-04T18:38:30.743Z",
        official_entrypoint: "npm run case-investigation --",
        dossier_request_id: "2026-04-04T18-36-23Z",
        selected_selectors: {
          requestId: "case_inv_pilot_20260403_183200",
          workflow: "extract_address",
        },
        case_ref_authorities: ["propertyId", "requestId", "runArtifact"],
        attempt_ref_authorities: ["requestId", "runArtifact", "workflow+window"],
        resolved_case: {
          status: "resolved",
          authority: "requestId",
          value: "case_inv_pilot_20260403_183200",
          request_id: "case_inv_pilot_20260403_183200",
          run_artifact: null,
          resolution_reason: "requestId resolved to a historical local bundle",
        },
        resolved_attempt: {
          authority: "requestId",
          status: "resolved",
          request_id: "case_inv_pilot_20260403_183200",
          run_artifact: null,
          workflow: "extract_address",
          window: null,
          resolution_reason: "requestId is an explicit attempt authority",
        },
        historical_evidence: {
          request_found: true,
          response_found: true,
          headers_found: true,
          workflow_matches: true,
          workflow_debug_available: false,
          cache_observability_available: true,
          sufficient: true,
          factual_sufficiency_reason:
            "historical bundle has request, response and headers correlated to the same case without silent inference",
        },
        replay_decision: {
          status: "not-required",
          reason_code: "HISTORICAL_BUNDLE_SUFFICIENT",
          resolution_reason:
            "historical request, response and headers already close the case without replay",
          factual_sufficiency_reason:
            "historical bundle has request, response and headers correlated to the same case without silent inference",
          replay_mode: "historical-only",
          request_id: "2026-04-04T18-36-23Z",
          local_namespace: "output/case-investigation/2026-04-04T18-36-23Z",
          update_db: false,
          include_workflow_debug: false,
          workflow: "extract_address",
          purge_policy: {
            accepted_identifiers: [
              "propertyId",
              "pdfFileName",
              "matriculaNumber",
              "transcriptHint",
            ],
            declared_identifiers: ["pdfFileName", "matriculaNumber"],
            dry_run_required_before_apply: true,
            dry_run_performed: false,
            apply_performed: false,
          },
        },
      },
      null,
      2,
    ).concat("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(roundPath, "evidence-bundle.json"),
    JSON.stringify(
      {
        schema_version: "evidence_bundle_v1",
        generated_at: "2026-04-04T18:38:30.743Z",
        collection_plan: {
          manifest_path: "docs/workflows/target-case-investigation-manifest.json",
          strategy_ids: ["case-investigation-round"],
        },
        historical_sources: [
          {
            source_id: "local-run-bundle",
            surface: "local-run-bundle",
            consulted: true,
          },
          {
            source_id: "cache-observability",
            surface: "cache-observability",
            consulted: true,
          },
        ],
        surface_catalog: [],
        sensitive_artifact_refs: [
          {
            ref: "dossier-ref",
            path: `${roundDirectory}/dossier.${dossierFormat}`,
            sha256: "a".repeat(64),
            record_count: 1,
          },
        ],
        historical_sufficiency_class: "sufficient",
        replay: {
          used: false,
          mode: "historical-only",
          request_id: "2026-04-04T18-36-23Z",
          update_db: null,
          include_workflow_debug: null,
          cache_policy: null,
          purge_policy: null,
          namespace: null,
        },
        collection_sufficiency: "sufficient",
        normative_conflicts: [],
        factual_sufficiency_reason:
          "local request, response and headers stayed correlated to the same attempt without silent inference",
        cache_summary: {
          source: null,
        },
      },
      null,
      2,
    ).concat("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(roundPath, "assessment.json"),
    JSON.stringify(
      {
        schema_version: "assessment_v1",
        generated_at: "2026-04-04T18:38:30.743Z",
        houve_gap_real: "no",
        era_evitavel_internamente: "not_applicable",
        merece_ticket_generalizavel: "not_applicable",
        confidence: "medium",
        evidence_sufficiency: "sufficient",
        causal_surface: {
          owner: "target-project",
          kind: "expected-behavior",
          summary:
            "the local evidence does not show a reusable target-project gap beyond expected behavior",
          actionable: false,
          systems: ["case-investigation", "extract_address"],
        },
        generalization_basis: [],
        overfit_vetoes: [
          {
            code: "no_generalization_basis",
            reason:
              "the case did not produce a reusable basis strong enough for ticket projection",
            blocking: true,
          },
        ],
        ticket_decision_reason:
          "the current local evidence should not be projected into a generalizable ticket",
        publication_recommendation: {
          recommended_action: "do_not_publish",
          reason:
            "either the case is not a reusable gap or the current evidence would overfit the conclusion",
          proposed_ticket_scope:
            "hold publication and keep the local dossier as supporting evidence only",
          suggested_title: "Do not publish extract_address ticket yet",
        },
        capability_limits: [
          {
            code: "compare_report_absent",
            summary:
              "no compare report was available for this round, so phase/step corroboration stayed limited to local runtime traces",
          },
        ],
      },
      null,
      2,
    ).concat("\n"),
    "utf8",
  );

  const dossierPath = path.join(roundPath, `dossier.${dossierFormat}`);
  const dossierContent =
    dossierFormat === "json"
      ? JSON.stringify(
          {
            case_ref: "case_inv_pilot_20260403_183200",
            local_path: `${roundDirectory}/dossier.json`,
            retention: "manual cleanup after investigator review",
            summary: "Resumo local e sensivel sob retencao controlada.",
          },
          null,
          2,
        ).concat("\n")
      : "# dossier\n\nResumo local e sensivel sob retencao controlada.\n";
  await fs.writeFile(dossierPath, dossierContent, "utf8");
};
