import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  TargetInvestigateCaseArtifactSet,
  TargetInvestigateCaseManifest,
  TargetInvestigateCaseTicketProposal,
} from "../types/target-investigate-case.js";
import {
  TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
  TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
  TARGET_INVESTIGATE_CASE_PUBLICATION_DECISION_ARTIFACT,
  TARGET_INVESTIGATE_CASE_REMEDIATION_PROPOSAL_ARTIFACT,
  TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT,
  TARGET_INVESTIGATE_CASE_V2_COMMAND,
  TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH,
} from "../types/target-investigate-case.js";
import type { ProjectRef } from "../types/project.js";

export interface TargetInvestigateCaseProjectFixture {
  rootPath: string;
  project: ProjectRef;
  artifactPaths: TargetInvestigateCaseArtifactSet;
  roundDirectory: string;
  roundId: string;
}

export const createTargetInvestigateCaseProjectFixture = async (
  options: {
    projectName?: string;
    roundId?: string;
  } = {},
): Promise<TargetInvestigateCaseProjectFixture> => {
  const rootPath = await fs.mkdtemp(
    path.join(os.tmpdir(), "target-investigate-case-v2-fixture-"),
  );
  const projectName = options.projectName ?? "alpha-project";
  const projectPath = path.join(rootPath, projectName);
  await fs.mkdir(projectPath, { recursive: true });

  const roundId = options.roundId ?? "2026-04-09T12-00-00Z";
  const roundDirectory = `output/case-investigation/${roundId}`;

  return {
    rootPath,
    project: {
      name: projectName,
      path: projectPath,
    },
    artifactPaths: buildArtifactPaths(roundDirectory),
    roundDirectory,
    roundId,
  };
};

export const cleanupTargetInvestigateCaseProjectFixture = async (
  fixture: Pick<TargetInvestigateCaseProjectFixture, "rootPath">,
): Promise<void> => {
  await fs.rm(fixture.rootPath, { recursive: true, force: true });
};

export const buildArtifactPaths = (
  roundDirectory: string,
): TargetInvestigateCaseArtifactSet => ({
  caseResolutionPath: `${roundDirectory}/case-resolution.json`,
  evidenceIndexPath: `${roundDirectory}/${TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT}`,
  evidenceBundlePath: `${roundDirectory}/${TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT}`,
  diagnosisJsonPath: `${roundDirectory}/diagnosis.json`,
  diagnosisMdPath: `${roundDirectory}/diagnosis.md`,
  remediationProposalPath: `${roundDirectory}/${TARGET_INVESTIGATE_CASE_REMEDIATION_PROPOSAL_ARTIFACT}`,
  ticketProposalPath: `${roundDirectory}/${TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT}`,
  publicationDecisionPath: `${roundDirectory}/${TARGET_INVESTIGATE_CASE_PUBLICATION_DECISION_ARTIFACT}`,
});

export const createTargetInvestigateCaseManifest = (
  options: {
    includePublicationStage?: boolean;
    includeTicketProjectionStage?: boolean;
    ticketPublicationPolicy?: boolean;
    allowAutomaticPublication?: boolean;
  } = {},
): TargetInvestigateCaseManifest => ({
  contractVersion: "1.0",
  schemaVersion: "1.0",
  capability: "case-investigation",
  flow: "target-investigate-case-v2",
  command: TARGET_INVESTIGATE_CASE_V2_COMMAND,
  entrypoint: {
    command: "npm run target-investigate-case-v2",
  },
  supportingArtifacts: {
    docs: ["docs/workflows/target-case-investigation-v2-runbook.md"],
    prompts: [
      "docs/workflows/target-investigate-case-v2-resolve-case.md",
      "docs/workflows/target-investigate-case-v2-assemble-evidence.md",
      "docs/workflows/target-investigate-case-v2-diagnosis.md",
    ],
    scripts: [],
  },
  roundDirectories: {
    authoritative: "output/case-investigation/<round-id>",
    mirror: "investigations/<round-id>",
  },
  minimumPath: ["preflight", "resolve-case", "assemble-evidence", "diagnosis"],
  stages: {
    resolveCase: {
      stage: "resolve-case",
      owner: "target-project",
      runnerExecutor: "codex-flow-runner",
      promptPath: "docs/workflows/target-investigate-case-v2-resolve-case.md",
      entrypoint: {
        command: "npm run target-investigate-case-v2:resolve-case",
      },
      artifacts: ["case-resolution.json"],
      policy: {},
    },
    assembleEvidence: {
      stage: "assemble-evidence",
      owner: "target-project",
      runnerExecutor: "codex-flow-runner",
      promptPath: "docs/workflows/target-investigate-case-v2-assemble-evidence.md",
      entrypoint: {
        command: "npm run target-investigate-case-v2:assemble-evidence",
      },
      artifacts: [
        TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
        TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
      ],
      policy: {},
    },
    diagnosis: {
      stage: "diagnosis",
      owner: "target-project",
      runnerExecutor: "codex-flow-runner",
      promptPath: "docs/workflows/target-investigate-case-v2-diagnosis.md",
      entrypoint: {
        command: "npm run target-investigate-case-v2:diagnosis",
      },
      artifacts: ["diagnosis.md", "diagnosis.json"],
      policy: {},
    },
    ...(options.includeTicketProjectionStage === false
      ? {}
      : {
          ticketProjection: {
            stage: "ticket-projection",
            owner: "target-project",
            runnerExecutor: "codex-flow-runner",
            promptPath: "docs/workflows/target-investigate-case-v2-ticket-projection.md",
            entrypoint: {
              command: "npm run target-investigate-case-v2:ticket-projection",
            },
            artifacts: [TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT],
            policy: {},
          },
        }),
    ...(options.includePublicationStage === false
      ? {}
      : {
          publication: {
            stage: "publication",
            owner: "codex-flow-runner",
            runnerExecutor: "codex-flow-runner",
            artifacts: [TARGET_INVESTIGATE_CASE_PUBLICATION_DECISION_ARTIFACT],
            policy: {},
          },
        }),
  },
  publicationPolicy: {
    semanticAuthority: "target-project",
    finalPublicationAuthority: "runner",
    allowAutomaticPublication: options.allowAutomaticPublication ?? true,
    blockedReason: null,
  },
  ticketPublicationPolicy:
    options.ticketPublicationPolicy === false
      ? null
      : {
          internalTicketTemplatePath: "tickets/templates/internal-ticket-template.md",
          causalBlockSourcePath: "docs/workflows/target-investigate-case-v2-ticket-template.md",
          mandatoryCausalBlockSources: ["Resolved case", "Publication decision"],
          versionedArtifactsDefault: ["ticket"],
          nonVersionedArtifactsDefault: ["diagnosis", "case-bundle"],
          semanticAuthority: "target-project",
          finalPublicationAuthority: "runner",
        },
});

export const writeTargetInvestigateCaseManifest = async (
  projectPath: string,
  manifest: TargetInvestigateCaseManifest = createTargetInvestigateCaseManifest(),
): Promise<void> => {
  const absolutePath = path.join(projectPath, ...TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH.split("/"));
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
};

export const writeTargetInvestigateCasePromptFiles = async (
  projectPath: string,
): Promise<void> => {
  await writeText(
    projectPath,
    "docs/workflows/target-investigate-case-v2-resolve-case.md",
    "# resolve-case\n",
  );
  await writeText(
    projectPath,
    "docs/workflows/target-investigate-case-v2-assemble-evidence.md",
    "# assemble-evidence\n",
  );
  await writeText(
    projectPath,
    "docs/workflows/target-investigate-case-v2-diagnosis.md",
    "# diagnosis\n",
  );
  await writeText(
    projectPath,
    "docs/workflows/target-investigate-case-v2-ticket-projection.md",
    "# ticket-projection\n",
  );
  await writeText(
    projectPath,
    "docs/workflows/target-case-investigation-v2-runbook.md",
    "# runbook\n",
  );
  await writeText(
    projectPath,
    "tickets/templates/internal-ticket-template.md",
    [
      "# Template",
      "",
      "## Investigacao Causal",
      "### Resolved case",
      "### Publication decision",
      "",
    ].join("\n"),
  );
  await writeText(
    projectPath,
    "docs/workflows/target-investigate-case-v2-ticket-template.md",
    [
      "# Ticket template",
      "",
      "## Investigacao Causal",
      "### Resolved case",
      "### Publication decision",
      "",
    ].join("\n"),
  );
};

export const createTargetInvestigateCaseTicketProposal = (
  options: {
    suggestedSlug?: string;
    suggestedTitle?: string;
    ticketMarkdown?: string;
  } = {},
): TargetInvestigateCaseTicketProposal => ({
  schema_version: "ticket_proposal_v1",
  generated_at: "2026-04-09T12:00:00Z",
  source_diagnosis_artifact: "diagnosis.json",
  source_case_bundle_artifact: TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
  recommended_action: "publish_ticket",
  suggested_slug: options.suggestedSlug ?? "workflow-gap",
  suggested_title: options.suggestedTitle ?? "Workflow gap on diagnosis-first investigation",
  priority: "P1",
  severity: "S2",
  summary: "The target project found a reusable workflow gap.",
  ticket_markdown:
    options.ticketMarkdown ??
    [
      "# [TICKET] Workflow gap on diagnosis-first investigation",
      "",
      "## Metadata",
      "- Status: open",
      "",
      "## Context",
      "- Source: production-observation",
      "",
      "## Problem statement",
      "The target project confirmed a reusable workflow gap.",
      "",
      "## Observed behavior",
      "- The diagnosis is not_ok for this case.",
      "",
      "## Expected behavior",
      "- The workflow should produce the expected target output.",
      "",
      "## Reproduction steps",
      "1. Re-run the target workflow for the same selectors.",
      "2. Confirm the same diagnosis-first artifacts are emitted.",
      "3. Observe the same incorrect behavior.",
      "",
      "## Evidence",
      "- diagnosis.json and case-bundle.json were produced by the target.",
      "",
      "## Impact assessment",
      "- The issue is reusable and operationally relevant.",
      "",
      "## Investigacao Causal",
      "### Resolved case",
      "- case-001",
      "### Publication decision",
      "- publish_ticket",
      "",
      "## Closure criteria",
      "- Correct the workflow gap.",
      "",
      "## Decision log",
      "- 2026-04-09 - Ticket generated by target-owned proposal.",
      "",
      "## Closure",
      "- Closed at (UTC):",
      "",
    ].join("\n"),
  publication_hints: {
    ticket_scope: "generalizable",
    slug_strategy: "suggested-slug-only",
    quality_gate: "legacy",
  },
});

export const writeTargetInvestigateCaseArtifacts = async (
  projectPath: string,
  artifactPaths: TargetInvestigateCaseArtifactSet,
  options: {
    verdict?: "ok" | "not_ok" | "inconclusive";
    diagnosisMdVerdict?: "ok" | "not_ok" | "inconclusive";
    diagnosisJsonVerdict?: string;
    diagnosisJsonConfidence?: string;
    diagnosisSummary?: string;
    diagnosisWhy?: string;
    diagnosisNextAction?: string;
    divergentResponseEnvelopes?: boolean;
    explicitBlocker?: boolean;
    omitDiagnosisJson?: boolean;
    omitDiagnosisMd?: boolean;
    improvementProposal?: boolean;
    ticketProposal?: boolean;
  } = {},
): Promise<void> => {
  const lineage = ["target-investigate-case-v2"];

  const caseResolution = {
    case_ref: "case-001",
    selectors: {
      workflow: "billing-core",
      request_id: "req-001",
      window: "2026-04-09T00:00:00Z/2026-04-09T01:00:00Z",
      symptom: "Timeout on save",
    },
    resolved_case: {
      ref: "case-001",
      summary: "Caso resolvido pela capability diagnosis-first.",
    },
    attempt_resolution: {
      status: options.explicitBlocker ? "absent-explicitly" : "resolved",
      attempt_ref: options.explicitBlocker ? null : "req-001",
      reason: options.explicitBlocker
        ? "O target registrou blocker explicito antes de selecionar uma tentativa."
        : "Tentativa correlacionada pelo target.",
    },
    relevant_workflows: ["billing-core"],
    replay_decision: {
      status: "not-required",
      reason: "A evidencia historica ja e suficiente.",
    },
    attempt_candidates: null,
    replay_readiness: options.explicitBlocker
      ? {
          state: "incomplete",
          required: true,
          summary: "Evidencia obrigatoria indisponivel para concluir o diagnostico com seguranca.",
          reason_code: "TARGET_BLOCKER",
          blocker_codes: ["TARGET_BLOCKER"],
          next_step: {
            code: "collect-required-evidence",
            summary: "Coletar a evidencia ausente e rerodar a investigation.",
          },
        }
      : null,
    resolution_reason: options.explicitBlocker
      ? "O target parou com blocker explicito e proxima acao segura."
      : "O target conseguiu resolver o caso sem replay adicional.",
    lineage,
  };
  const evidenceBundle = {
    collection_plan: {
      manifest_path: TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH,
      strategy_ids: ["history", "case-bundle"],
    },
    historical_sources: [
      {
        source_id: "history",
        surface: "bundle",
        consulted: true,
      },
    ],
    sensitive_artifact_refs: [
      {
        ref: "bundle-ref-1",
        path: artifactPaths.evidenceBundlePath,
        sha256: "a".repeat(64),
        record_count: 1,
      },
    ],
    replay: {
      used: false,
      mode: "historical-only",
      request_id: "req-001",
      update_db: false,
      cache_policy: null,
      purge_policy: null,
      namespace: "case-investigation/round-1",
    },
    collection_sufficiency: "sufficient",
    normative_conflicts: [],
    factual_sufficiency_reason: "A bundle autoritativa ja explica o caso.",
    lineage,
  };
  const evidenceIndex = {
    schema_version: "evidence_index_v1",
    bundle_artifact: artifactPaths.evidenceBundlePath,
    entries: [
      {
        id: "bundle-ref-1",
        locator: artifactPaths.evidenceBundlePath,
        acquired_via: "assemble-evidence",
        relevance: "primary",
      },
    ],
    lineage,
  };
  const diagnosis = {
    schema_version: "diagnosis_v1",
    bundle_artifact: artifactPaths.evidenceBundlePath,
    verdict: options.diagnosisMdVerdict ?? options.verdict ?? "not_ok",
    summary: options.diagnosisSummary ?? "O target encontrou um gap real e reutilizavel.",
    why: options.diagnosisWhy ?? "A evidencia confirma que o workflow desviou do esperado.",
    expected_behavior: "O workflow deveria completar com o artefato correto.",
    observed_behavior: "O workflow concluiu com comportamento incorreto.",
    confidence: options.diagnosisJsonConfidence ?? "high",
    behavior_to_change: "Corrigir a superficie que gera a divergencia semantica.",
    probable_fix_surface: ["workflow", "target-entrypoint"],
    evidence_used: ["case-resolution.json", TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT],
    next_action:
      options.diagnosisNextAction ?? "Abrir o ticket somente se a continuacao publication for necessaria.",
    lineage,
  };
  const divergentEvidenceIndex = {
    schema_version: "evidence_index_v2",
    round_id: "2026-04-09T12-00-00Z",
    sources: [
      {
        source_id: "case-bundle",
        locator: artifactPaths.evidenceBundlePath,
        relevance: "primary",
      },
    ],
  };
  const divergentEvidenceBundle = {
    schema_version: "case_bundle_v2",
    round_id: "2026-04-09T12-00-00Z",
    evidence_index_path: artifactPaths.evidenceIndexPath,
    collection_state: {
      status: "sufficient",
      diagnosis_ready: true,
      summary: "O envelope target-owned e suficiente para leitura humana.",
    },
  };
  const divergentDiagnosis = {
    schema_version: "diagnosis_v2",
    verdict: options.diagnosisJsonVerdict ?? options.verdict ?? "not_ok",
    confidence: options.diagnosisJsonConfidence ?? "medium_high",
    summary: options.diagnosisSummary ?? "O target respondeu o caso em envelope proprio.",
    why: options.diagnosisWhy ?? "A evidencia target-owned foi considerada suficiente.",
    expected_behavior: "O workflow deveria completar com o artefato correto.",
    observed_behavior: "O workflow concluiu com comportamento incorreto.",
    behavior_to_change: "Corrigir a superficie que gera a divergencia semantica.",
    probable_fix_surface: "workflow, target-entrypoint",
    next_action:
      options.diagnosisNextAction ?? "Ler diagnosis.md antes de decidir qualquer continuation.",
    evidence: [artifactPaths.evidenceBundlePath, artifactPaths.evidenceIndexPath],
  };

  await writeJson(projectPath, artifactPaths.caseResolutionPath, caseResolution);
  await writeJson(
    projectPath,
    artifactPaths.evidenceIndexPath,
    options.divergentResponseEnvelopes ? divergentEvidenceIndex : evidenceIndex,
  );
  await writeJson(
    projectPath,
    artifactPaths.evidenceBundlePath,
    options.divergentResponseEnvelopes ? divergentEvidenceBundle : evidenceBundle,
  );
  if (!options.omitDiagnosisJson) {
    await writeJson(
      projectPath,
      artifactPaths.diagnosisJsonPath,
      options.divergentResponseEnvelopes ? divergentDiagnosis : diagnosis,
    );
  }
  if (!options.omitDiagnosisMd) {
    await writeText(projectPath, artifactPaths.diagnosisMdPath, createDiagnosisMarkdown(diagnosis));
  }

  if (options.improvementProposal) {
    await writeJson(projectPath, artifactPaths.remediationProposalPath, {
      schema_version: "improvement_proposal_v1",
      summary: "Corrigir o comportamento identificado pelo diagnostico.",
    });
  }

  if (options.ticketProposal) {
    await writeJson(
      projectPath,
      artifactPaths.ticketProposalPath,
      createTargetInvestigateCaseTicketProposal(),
    );
  }
};

export const writeJson = async (
  projectPath: string,
  relativePath: string,
  payload: unknown,
): Promise<void> => {
  const absolutePath = path.join(projectPath, ...relativePath.split("/"));
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

export const writeText = async (
  projectPath: string,
  relativePath: string,
  text: string,
): Promise<void> => {
  const absolutePath = path.join(projectPath, ...relativePath.split("/"));
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, text, "utf8");
};

const createDiagnosisMarkdown = (diagnosis: {
  verdict: string;
  summary: string;
  why: string;
  expected_behavior: string;
  observed_behavior: string;
  behavior_to_change: string;
  probable_fix_surface: string[];
  next_action: string;
}): string =>
  [
    "# Diagnosis",
    "",
    "## Veredito",
    diagnosis.verdict,
    "",
    "## Workflow avaliado",
    "billing-core",
    "",
    "## Objetivo esperado",
    diagnosis.expected_behavior,
    "",
    "## O que a evidência mostra",
    diagnosis.observed_behavior,
    "",
    "## Por que o caso está ok ou não está",
    diagnosis.why,
    "",
    "## Comportamento que precisa mudar",
    diagnosis.behavior_to_change,
    "",
    "## Superfície provável de correção",
    diagnosis.probable_fix_surface.join(", "),
    "",
    "## Próxima ação",
    diagnosis.next_action,
    "",
  ].join("\n");
